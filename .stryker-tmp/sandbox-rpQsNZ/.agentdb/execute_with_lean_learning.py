#!/usr/bin/env python3
"""
execute_with_lean_learning.py - Build-Measure-Learn Cycle Implementation

Provides learning hooks for command execution with BEAM dimension tracking,
verdict classification, and AgentDB integration for continuous learning.

Usage:
    from execute_with_lean_learning import BuildMeasureLearnCycle
    
    cycle = BuildMeasureLearnCycle()
    cycle.pre_execute("git", ["commit", "-m", "fix"])
    # ... execute command ...
    cycle.post_execute(exit_code=0, duration_ms=1234)
"""

import json
import os
import sqlite3
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any


class BuildMeasureLearnCycle:
    """
    Implements Build-Measure-Learn feedback loop with BEAM dimensions.
    
    BEAM Dimensions:
    - Business: Value delivery, economic impact
    - Enablement: Developer productivity, tooling
    - Architecture: Technical debt, refactoring
    - Mitigation: Risk reduction, debugging
    """
    
    def __init__(self, repo_root: Optional[Path] = None):
        if repo_root is None:
            # Try to find repo root
            current = Path.cwd()
            while current != current.parent:
                if (current / ".agentdb").exists():
                    repo_root = current
                    break
                current = current.parent
            
            if repo_root is None:
                repo_root = Path.home() / "Documents/code/investing/agentic-flow"
        
        self.repo_root = Path(repo_root)
        self.agentdb_path = self.repo_root / ".agentdb" / "agentdb.sqlite"
        self.events_log = self.repo_root / "logs" / "learning" / "events.jsonl"
        
        # Execution context
        self.context: Dict[str, Any] = {}
        self.start_time: Optional[float] = None
        
        # Ensure directories exist
        self.events_log.parent.mkdir(parents=True, exist_ok=True)
        
        # Initialize database
        self._init_database()
    
    def _init_database(self):
        """Initialize learning_events table if it doesn't exist."""
        if not self.agentdb_path.exists():
            return
        
        try:
            conn = sqlite3.connect(self.agentdb_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS learning_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    agent_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    command TEXT,
                    args TEXT,
                    exit_code INTEGER,
                    duration_ms INTEGER,
                    verdict TEXT,
                    confidence REAL,
                    beam_tags TEXT,
                    context TEXT,
                    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create indices for common queries
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_learning_agent 
                ON learning_events(agent_id)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_learning_verdict 
                ON learning_events(verdict)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_learning_timestamp 
                ON learning_events(timestamp)
            """)
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            print(f"Warning: Could not initialize learning_events table: {e}", 
                  file=sys.stderr)
    
    def pre_execute(self, command: str, args: List[str], **kwargs):
        """
        Pre-execution hook. Called before command execution.
        
        Args:
            command: Command name (e.g., "git", "python3")
            args: Command arguments
            **kwargs: Additional context (cwd, env, etc.)
        """
        self.start_time = time.time()
        self.context = {
            "command": command,
            "args": args,
            "cwd": kwargs.get("cwd", os.getcwd()),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            **kwargs
        }
    
    def post_execute(self, exit_code: int, stdout: str = "", stderr: str = ""):
        """
        Post-execution hook. Called after command execution.
        
        Args:
            exit_code: Command exit code
            stdout: Standard output (optional)
            stderr: Standard error (optional)
        """
        if self.start_time is None:
            print("Warning: post_execute called without pre_execute", 
                  file=sys.stderr)
            return
        
        # Calculate duration
        duration_ms = int((time.time() - self.start_time) * 1000)
        
        # Update context
        self.context.update({
            "exit_code": exit_code,
            "duration_ms": duration_ms,
            "stdout_length": len(stdout),
            "stderr_length": len(stderr),
            "completed_at": datetime.utcnow().isoformat() + "Z"
        })
        
        # Classify verdict
        verdict_info = self._classify_verdict(exit_code, stderr)
        
        # Extract BEAM tags
        beam_tags = self._extract_beam_tags(self.context)
        
        # Store in AgentDB
        self._store_learning_event(verdict_info, beam_tags)
        
        # Append to events log
        self._append_to_events_log(verdict_info, beam_tags)
        
        # Reset for next execution
        self.start_time = None
    
    def _classify_verdict(self, exit_code: int, stderr: str) -> Dict[str, Any]:
        """
        Classify execution verdict with confidence.
        
        Returns:
            Dict with verdict, confidence, and reason
        """
        if exit_code == 0:
            return {
                "verdict": "success",
                "confidence": 0.95,
                "reason": "zero_exit_code"
            }
        elif exit_code == 130:  # SIGINT (Ctrl+C)
            return {
                "verdict": "interrupted",
                "confidence": 0.99,
                "reason": "user_interrupt"
            }
        elif exit_code in [1, 2]:  # Common error codes
            confidence = 0.9 if stderr else 0.7
            return {
                "verdict": "failure",
                "confidence": confidence,
                "reason": f"exit_code_{exit_code}"
            }
        else:
            return {
                "verdict": "failure",
                "confidence": 0.85,
                "reason": f"non_zero_exit_{exit_code}"
            }
    
    def _extract_beam_tags(self, context: Dict[str, Any]) -> List[str]:
        """
        Extract BEAM dimension tags from execution context.
        
        BEAM Dimensions:
        - Business: Deployment, release, customer-facing changes
        - Enablement: Testing, documentation, tooling
        - Architecture: Refactoring, design changes, tech debt
        - Mitigation: Debugging, fixing, security patches
        """
        tags = []
        command = context.get("command", "").lower()
        args = " ".join(str(a) for a in context.get("args", [])).lower()
        combined = f"{command} {args}"
        
        # Business dimension
        if any(kw in combined for kw in ["deploy", "release", "publish", "ship"]):
            tags.append("business:delivery")
        if any(kw in combined for kw in ["build", "compile", "bundle"]):
            tags.append("business:build")
        
        # Enablement dimension
        if any(kw in combined for kw in ["test", "spec", "jest", "pytest"]):
            tags.append("enablement:testing")
        if any(kw in combined for kw in ["doc", "readme", "wiki"]):
            tags.append("enablement:documentation")
        if any(kw in combined for kw in ["install", "setup", "init"]):
            tags.append("enablement:tooling")
        
        # Architecture dimension
        if any(kw in combined for kw in ["refactor", "restructure", "redesign"]):
            tags.append("architecture:refactoring")
        if any(kw in combined for kw in ["migrate", "upgrade", "modernize"]):
            tags.append("architecture:migration")
        if any(kw in combined for kw in ["debt", "cleanup", "simplify"]):
            tags.append("architecture:tech_debt")
        
        # Mitigation dimension
        if any(kw in combined for kw in ["fix", "bug", "patch", "hotfix"]):
            tags.append("mitigation:debugging")
        if any(kw in combined for kw in ["security", "vuln", "cve"]):
            tags.append("mitigation:security")
        if any(kw in combined for kw in ["rollback", "revert", "restore"]):
            tags.append("mitigation:rollback")
        
        # Git-specific tagging
        if command == "git":
            if "commit" in args:
                tags.append("enablement:version_control")
            if "push" in args:
                tags.append("business:delivery")
            if "pull" in args or "fetch" in args:
                tags.append("enablement:sync")
            if "rebase" in args or "merge" in args:
                tags.append("architecture:integration")
        
        # Python-specific tagging
        if command in ["python", "python3"]:
            if "test" in args:
                tags.append("enablement:testing")
            elif any(script in args for script in ["setup.py", "build.py"]):
                tags.append("business:build")
        
        # Default if no tags matched
        if not tags:
            tags.append("enablement:general")
        
        return tags
    
    def _store_learning_event(self, verdict_info: Dict[str, Any], 
                              beam_tags: List[str]) -> bool:
        """Store learning event in AgentDB."""
        if not self.agentdb_path.exists():
            return False
        
        try:
            conn = sqlite3.connect(self.agentdb_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO learning_events 
                (agent_id, event_type, command, args, exit_code, duration_ms,
                 verdict, confidence, beam_tags, context)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "build_measure_learn",
                "execution",
                self.context.get("command"),
                json.dumps(self.context.get("args", [])),
                self.context.get("exit_code"),
                self.context.get("duration_ms"),
                verdict_info["verdict"],
                verdict_info["confidence"],
                json.dumps(beam_tags),
                json.dumps(self.context)
            ))
            
            conn.commit()
            conn.close()
            
            return True
            
        except Exception as e:
            print(f"Warning: Could not store learning event: {e}", 
                  file=sys.stderr)
            return False
    
    def _append_to_events_log(self, verdict_info: Dict[str, Any], 
                              beam_tags: List[str]) -> bool:
        """Append enhanced context to events.jsonl."""
        try:
            enhanced_context = {
                **self.context,
                "verdict": verdict_info["verdict"],
                "confidence": verdict_info["confidence"],
                "reason": verdict_info["reason"],
                "beam_tags": beam_tags,
                "processed_at": datetime.utcnow().isoformat() + "Z"
            }
            
            with open(self.events_log, 'a') as f:
                f.write(json.dumps(enhanced_context) + '\n')
            
            return True
            
        except Exception as e:
            print(f"Warning: Could not append to events log: {e}", 
                  file=sys.stderr)
            return False
    
    def get_recent_learnings(self, limit: int = 10, 
                            command: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Retrieve recent learning events from AgentDB.
        
        Args:
            limit: Maximum number of events to retrieve
            command: Filter by command name (optional)
        
        Returns:
            List of learning event dictionaries
        """
        if not self.agentdb_path.exists():
            return []
        
        try:
            conn = sqlite3.connect(self.agentdb_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            if command:
                cursor.execute("""
                    SELECT * FROM learning_events 
                    WHERE command = ?
                    ORDER BY timestamp DESC 
                    LIMIT ?
                """, (command, limit))
            else:
                cursor.execute("""
                    SELECT * FROM learning_events 
                    ORDER BY timestamp DESC 
                    LIMIT ?
                """, (limit,))
            
            rows = cursor.fetchall()
            conn.close()
            
            return [dict(row) for row in rows]
            
        except Exception as e:
            print(f"Warning: Could not retrieve learnings: {e}", 
                  file=sys.stderr)
            return []
    
    def get_success_rate(self, command: str, hours: int = 24) -> float:
        """
        Calculate success rate for a command over recent hours.
        
        Args:
            command: Command name
            hours: Time window in hours
        
        Returns:
            Success rate as float between 0.0 and 1.0
        """
        if not self.agentdb_path.exists():
            return 0.0
        
        try:
            conn = sqlite3.connect(self.agentdb_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN verdict = 'success' THEN 1 ELSE 0 END) as successes
                FROM learning_events 
                WHERE command = ?
                AND datetime(timestamp) >= datetime('now', '-' || ? || ' hours')
            """, (command, hours))
            
            row = cursor.fetchone()
            conn.close()
            
            if row and row[0] > 0:
                return row[1] / row[0]
            return 0.0
            
        except Exception as e:
            print(f"Warning: Could not calculate success rate: {e}", 
                  file=sys.stderr)
            return 0.0


# Singleton instance for convenience
_default_cycle = None

def get_default_cycle() -> BuildMeasureLearnCycle:
    """Get or create default BuildMeasureLearnCycle instance."""
    global _default_cycle
    if _default_cycle is None:
        _default_cycle = BuildMeasureLearnCycle()
    return _default_cycle


if __name__ == "__main__":
    # Test mode
    cycle = BuildMeasureLearnCycle()
    
    # Simulate command execution
    cycle.pre_execute("git", ["commit", "-m", "test"])
    cycle.post_execute(exit_code=0)
    
    # Show recent learnings
    print("Recent learning events:")
    for event in cycle.get_recent_learnings(limit=5):
        print(f"  {event['command']} -> {event['verdict']} "
              f"({event['duration_ms']}ms)")
    
    # Show success rate
    rate = cycle.get_success_rate("git", hours=24)
    print(f"\nGit success rate (24h): {rate:.1%}")
