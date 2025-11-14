#!/usr/bin/env python3
"""
learning_hooks_system.py - Learning Infrastructure Core

Captures ExecutionContext, classifies verdicts, tracks confidence intervals.
Implements Build-Measure-Learn feedback loop with BEAM dimensions.

Usage:
    echo '{"command": "test", "exit_code": "0"}' | python3 learning_hooks_system.py --stdin
    python3 learning_hooks_system.py --file context.json
"""

import argparse
import json
import os
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

class LearningHooksSystem:
    def __init__(self, repo_root=None):
        if repo_root is None:
            script_dir = Path(__file__).parent
            repo_root = script_dir.parent.parent
        
        self.repo_root = Path(repo_root)
        self.agentdb_path = self.repo_root / ".agentdb" / "agentdb.sqlite"
        self.events_log = self.repo_root / "logs" / "learning" / "events.jsonl"
        
        # Ensure directories exist
        self.events_log.parent.mkdir(parents=True, exist_ok=True)
    
    def classify_verdict(self, context):
        """Classify execution verdict with confidence."""
        exit_code = context.get("exit_code", "unknown")
        
        if exit_code == "0":
            return {
                "verdict": "success",
                "confidence": 0.95,
                "reason": "zero_exit_code"
            }
        elif exit_code == "unknown":
            return {
                "verdict": "unknown",
                "confidence": 0.0,
                "reason": "no_exit_code"
            }
        else:
            return {
                "verdict": "failure",
                "confidence": 0.9,
                "reason": f"non_zero_exit_code_{exit_code}"
            }
    
    def extract_beam_tags(self, context):
        """Extract BEAM dimensions: Business, Enablement, Architecture, Mitigation."""
        tags = []
        
        # Heuristic tagging based on context
        command = context.get("command", "")
        
        if "test" in command.lower():
            tags.append("enablement:testing")
        if "deploy" in command.lower() or "build" in command.lower():
            tags.append("business:delivery")
        if "refactor" in command.lower() or "arch" in command.lower():
            tags.append("architecture:refactoring")
        if "fix" in command.lower() or "debug" in command.lower():
            tags.append("mitigation:debugging")
        
        return tags if tags else ["enablement:general"]
    
    def insert_learning_event(self, context):
        """Insert learning event into AgentDB."""
        if not self.agentdb_path.exists():
            print(f"Warning: AgentDB not found at {self.agentdb_path}", file=sys.stderr)
            return False
        
        try:
            verdict_info = self.classify_verdict(context)
            beam_tags = self.extract_beam_tags(context)
            
            conn = sqlite3.connect(self.agentdb_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO learning_events 
                (agent_id, event_type, context, verdict, confidence, beam_tags)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                "learning_hooks_system",
                "execution",
                json.dumps(context),
                verdict_info["verdict"],
                verdict_info["confidence"],
                json.dumps(beam_tags)
            ))
            
            conn.commit()
            conn.close()
            
            return True
            
        except Exception as e:
            print(f"Error inserting learning event: {e}", file=sys.stderr)
            return False
    
    def append_to_events_log(self, context):
        """Append enhanced context to events.jsonl."""
        try:
            verdict_info = self.classify_verdict(context)
            beam_tags = self.extract_beam_tags(context)
            
            enhanced_context = {
                **context,
                "verdict": verdict_info["verdict"],
                "confidence": verdict_info["confidence"],
                "beam_tags": beam_tags,
                "processed_at": datetime.utcnow().isoformat() + "Z"
            }
            
            with open(self.events_log, 'a') as f:
                f.write(json.dumps(enhanced_context) + '\n')
            
            return True
            
        except Exception as e:
            print(f"Error appending to events log: {e}", file=sys.stderr)
            return False
    
    def process_context(self, context):
        """Main processing: insert to DB and append to log."""
        db_success = self.insert_learning_event(context)
        log_success = self.append_to_events_log(context)
        
        return db_success and log_success

def main():
    parser = argparse.ArgumentParser(description="Learning Hooks System")
    parser.add_argument("--stdin", action="store_true", help="Read context from stdin")
    parser.add_argument("--file", help="Read context from file")
    parser.add_argument("--repo-root", help="Override repo root path")
    
    args = parser.parse_args()
    
    # Read context
    if args.stdin:
        try:
            context = json.loads(sys.stdin.read())
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON from stdin: {e}", file=sys.stderr)
            sys.exit(1)
    elif args.file:
        try:
            with open(args.file) as f:
                context = json.load(f)
        except Exception as e:
            print(f"Error reading file {args.file}: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        print("Error: Must specify --stdin or --file", file=sys.stderr)
        sys.exit(1)
    
    # Process
    system = LearningHooksSystem(repo_root=args.repo_root)
    success = system.process_context(context)
    
    if success:
        print("✓ Learning event processed")
        sys.exit(0)
    else:
        print("✗ Learning event processing failed", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
