#!/usr/bin/env python3
"""
Telegram → Claude Code Orchestrator
====================================

DoR:
- TELEGRAM_BOT_TOKEN set in environment
- Claude Code CLI available (`claude --version`)
- Repository has .git directory
- Test command configured (pytest/jest/cargo test)

DoD:
- Telegram message triggers Claude Code session
- Progress updates every 5 iterations
- Auto-commit on test pass
- Kill + summary on 20+ failed loops

Usage:
    # Start listener daemon
    python telegram-claude-orchestrator.py --daemon
    
    # Send from Telegram
    /fix auth bug in /api/webhooks, run tests after
    
    # Receive updates
    ✅ Iteration 3/20: Tests running...
    ✅ Iteration 7/20: 2 tests passing, 1 failing
    ✅ Tests passed! Committed to branch: fix/webhooks-auth-2026-02-21
"""

import asyncio
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional

import click
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

# Configuration
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")  # Your personal chat ID
MAX_ITERATIONS = 20
PROGRESS_UPDATE_INTERVAL = 5

# Patterns
TEST_PASS_PATTERNS = [
    r"(\d+) passed",
    r"OK \((\d+) tests\)",
    r"test result: ok\. (\d+) passed",
]

TEST_FAIL_PATTERNS = [
    r"(\d+) failed",
    r"FAILED.*(\d+)",
    r"(\d+) errors?",
]

@dataclass
class SessionState:
    """Tracks Claude Code session state"""
    task_description: str
    start_time: datetime
    iteration_count: int = 0
    last_progress: str = ""
    tests_passed: bool = False
    branch_name: Optional[str] = None
    session_pid: Optional[int] = None

# ---------------------------------------------------------------------------
# Claude Code Session Management
# ---------------------------------------------------------------------------

def start_claude_session(task: str) -> subprocess.Popen:
    """
    Start Claude Code session with task description.
    Returns subprocess handle for monitoring.
    """
    # Build command: claude --task "fix auth bug, run tests"
    cmd = ["claude", "--task", task]
    
    # Start process with stdout/stderr capture
    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    
    return process

def monitor_session_output(process: subprocess.Popen) -> tuple[bool, str]:
    """
    Monitor Claude Code output for test results.
    Returns: (tests_passed, last_output)
    """
    output_lines = []
    tests_passed = False
    
    try:
        # Read available output (non-blocking)
        while True:
            line = process.stdout.readline()
            if not line:
                break
            output_lines.append(line.strip())
            
            # Check for test results
            for pattern in TEST_PASS_PATTERNS:
                if re.search(pattern, line):
                    tests_passed = True
                    
    except Exception as e:
        output_lines.append(f"Error reading output: {e}")
    
    return tests_passed, "\n".join(output_lines[-10:])  # Last 10 lines

def commit_changes(task_description: str) -> str:
    """
    Commit changes and push to branch.
    Returns: branch name
    """
    # Generate branch name from task
    branch_suffix = datetime.now().strftime("%Y-%m-%d")
    branch_name = f"fix/{slugify(task_description[:30])}-{branch_suffix}"
    
    # Create and checkout branch
    subprocess.run(["git", "checkout", "-b", branch_name], check=True)
    
    # Stage all changes
    subprocess.run(["git", "add", "-A"], check=True)
    
    # Commit with co-author attribution
    commit_msg = f"fix: {task_description}\n\nCo-Authored-By: Warp <agent@warp.dev>"
    subprocess.run(["git", "commit", "-m", commit_msg], check=True)
    
    # Push to remote
    subprocess.run(["git", "push", "-u", "origin", branch_name], check=True)
    
    return branch_name

def slugify(text: str) -> str:
    """Convert text to slug format"""
    return re.sub(r'[^\w\s-]', '', text.lower()).replace(' ', '-')

# ---------------------------------------------------------------------------
# Telegram Bot Handlers
# ---------------------------------------------------------------------------

async def handle_fix_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handle /fix command from Telegram.
    
    Example: /fix auth bug in /api/webhooks, run tests after
    """
    task_description = " ".join(context.args)
    
    if not task_description:
        await update.message.reply_text(
            "Usage: /fix <task description>\n"
            "Example: /fix auth bug in /api/webhooks, run tests"
        )
        return
    
    # Send acknowledgment
    await update.message.reply_text(
        f"🚀 Starting Claude Code session\n"
        f"Task: {task_description}\n"
        f"Progress updates every {PROGRESS_UPDATE_INTERVAL} iterations"
    )
    
    # Initialize session state
    session = SessionState(
        task_description=task_description,
        start_time=datetime.now(),
    )
    
    # Start Claude Code session
    process = start_claude_session(task_description)
    session.session_pid = process.pid
    
    # Monitor loop
    while session.iteration_count < MAX_ITERATIONS:
        session.iteration_count += 1
        
        # Wait for process to do work
        await asyncio.sleep(10)  # Check every 10 seconds
        
        # Monitor output
        tests_passed, output = monitor_session_output(process)
        session.last_progress = output
        session.tests_passed = tests_passed
        
        # Send progress update every 5 iterations
        if session.iteration_count % PROGRESS_UPDATE_INTERVAL == 0:
            elapsed = (datetime.now() - session.start_time).total_seconds() / 60
            await update.message.reply_text(
                f"⏳ Iteration {session.iteration_count}/{MAX_ITERATIONS}\n"
                f"Elapsed: {elapsed:.1f} min\n"
                f"Status: {output[:200]}"
            )
        
        # Check if tests passed
        if tests_passed:
            # Commit and notify
            branch = commit_changes(task_description)
            session.branch_name = branch
            
            await update.message.reply_text(
                f"✅ Tests passed!\n"
                f"Branch: {branch}\n"
                f"Iterations: {session.iteration_count}\n"
                f"Time: {elapsed:.1f} min"
            )
            
            # Terminate process
            process.terminate()
            return
        
        # Check if process died
        if process.poll() is not None:
            await update.message.reply_text(
                f"❌ Claude Code session terminated unexpectedly\n"
                f"Exit code: {process.returncode}\n"
                f"Last output:\n{output}"
            )
            return
    
    # Max iterations reached without success
    process.terminate()
    
    # Save session summary
    summary = generate_session_summary(session)
    summary_path = Path(f"logs/session-{datetime.now().isoformat()}.json")
    summary_path.parent.mkdir(exist_ok=True)
    summary_path.write_text(json.dumps(summary, indent=2))
    
    await update.message.reply_text(
        f"⚠️  Max iterations ({MAX_ITERATIONS}) reached without success\n"
        f"Session killed and summary saved to:\n{summary_path}"
    )

def generate_session_summary(session: SessionState) -> dict:
    """Generate summary of failed session"""
    return {
        "task": session.task_description,
        "start_time": session.start_time.isoformat(),
        "iterations": session.iteration_count,
        "tests_passed": session.tests_passed,
        "last_progress": session.last_progress,
        "branch": session.branch_name,
    }

async def handle_status_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Check status of running sessions"""
    # TODO: Track active sessions in Redis/file
    await update.message.reply_text("Status tracking not implemented yet")

# ---------------------------------------------------------------------------
# Main Entry Point
# ---------------------------------------------------------------------------

@click.command()
@click.option("--daemon", is_flag=True, help="Run as background daemon")
def main(daemon: bool):
    """Telegram-triggered Claude Code orchestration"""
    
    if not TELEGRAM_BOT_TOKEN:
        click.echo("Error: TELEGRAM_BOT_TOKEN not set", err=True)
        sys.exit(1)
    
    # Create Telegram bot application
    app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    
    # Register handlers
    app.add_handler(CommandHandler("fix", handle_fix_command))
    app.add_handler(CommandHandler("status", handle_status_command))
    
    if daemon:
        # Run as polling daemon
        click.echo("Starting Telegram bot (polling mode)...")
        app.run_polling(allowed_updates=Update.ALL_TYPES)
    else:
        # One-time webhook mode (requires ngrok or similar)
        click.echo("Webhook mode not implemented yet")
        sys.exit(1)

if __name__ == "__main__":
    main()
