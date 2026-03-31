#!/usr/bin/env python3
"""
Workflow Orchestrator: Cycle-based automation for git operations
Handles AUTO-GIT actions with timestamp tracking
"""

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional


class WorkflowOrchestrator:
    """Orchestrate workflow cycles with automated git operations."""
    
    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root).resolve()
        self.goalie_dir = self.project_root / ".goalie"
        self.cycle_log = self.goalie_dir / "cycle_log.jsonl"
        
    def run_cycle(self, action: str) -> Dict:
        """
        Execute a workflow cycle with the specified action.
        
        Args:
            action: Action identifier (e.g., AUTO-GIT-202511121835)
        
        Returns:
            Dict with cycle results and metadata
        """
        cycle_id = datetime.now().strftime("%Y%m%d%H%M%S")
        
        # Parse action
        action_type, timestamp = self._parse_action(action)
        
        result = {
            'cycle_id': cycle_id,
            'action': action,
            'action_type': action_type,
            'timestamp': datetime.now().isoformat(),
            'status': 'started'
        }
        
        try:
            if action_type == 'AUTO-GIT':
                result.update(self._handle_auto_git(timestamp))
            elif action_type == 'RETRO-REFINEMENT':
                result.update(self._handle_retro_refinement(timestamp))
            elif action_type == 'BML-CYCLE':
                result.update(self._handle_bml_cycle(timestamp))
            elif action_type == 'METRICS-SNAPSHOT':
                result.update(self._handle_metrics_snapshot(timestamp))
            else:
                result['status'] = 'error'
                result['message'] = f"Unknown action type: {action_type}"
                return result
                
            result['status'] = 'completed'
            
        except Exception as e:
            result['status'] = 'failed'
            result['error'] = str(e)
        
        # Log cycle
        self._log_cycle(result)
        
        return result
    
    def _parse_action(self, action: str) -> tuple:
        """Parse action string into type and timestamp."""
        parts = action.split('-')
        if len(parts) >= 2:
            action_type = '-'.join(parts[:-1])
            timestamp = parts[-1]
            return action_type, timestamp
        return action, None
    
    def _handle_auto_git(self, timestamp: str) -> Dict:
        """
        Handle automated git operations.
        
        Performs:
        1. Check git status
        2. Stage changes
        3. Commit with cycle timestamp
        4. Optional push
        """
        os.chdir(self.project_root)
        
        # Check if we're in a git repo
        if not (self.project_root / ".git").exists():
            return {
                'git_status': 'not_a_repo',
                'message': 'Not a git repository'
            }
        
        # Get git status
        status = subprocess.run(
            ['git', 'status', '--porcelain'],
            capture_output=True,
            text=True
        )
        
        if not status.stdout.strip():
            return {
                'git_status': 'clean',
                'message': 'No changes to commit'
            }
        
        # Stage all changes
        subprocess.run(['git', 'add', '-A'], check=True)
        
        # Commit with cycle timestamp
        commit_msg = f"chore: workflow cycle {timestamp or datetime.now().strftime('%Y%m%d%H%M%S')}"
        commit = subprocess.run(
            ['git', 'commit', '-m', commit_msg],
            capture_output=True,
            text=True
        )
        
        # Get current branch
        branch = subprocess.run(
            ['git', 'branch', '--show-current'],
            capture_output=True,
            text=True
        ).stdout.strip()
        
        return {
            'git_status': 'committed',
            'commit_message': commit_msg,
            'branch': branch,
            'changes': status.stdout.strip().split('\n'),
            'commit_hash': self._get_current_commit_hash()
        }
    
    def _get_current_commit_hash(self) -> str:
        """Get the current commit hash."""
        result = subprocess.run(
            ['git', 'rev-parse', '--short', 'HEAD'],
            capture_output=True,
            text=True
        )
        return result.stdout.strip()
    
    def _handle_retro_refinement(self, timestamp: str) -> Dict:
        """Handle retrospective refinement action items extraction."""
        # Extract action items from documentation
        doc_query_path = self.project_root / "scripts" / "doc_query.py"
        if not doc_query_path.exists():
            return {'action_status': 'error', 'message': 'doc_query.py not found'}
        
        result = subprocess.run(
            ['python3', str(doc_query_path), '--action-items', '--json'],
            capture_output=True,
            text=True,
            cwd=self.project_root
        )
        
        if result.returncode != 0:
            return {'action_status': 'error', 'message': result.stderr}
        
        action_items = json.loads(result.stdout)
        
        # Calculate metrics
        total_items = len(action_items)
        
        return {
            'action_status': 'completed',
            'action_items_extracted': total_items,
            'timestamp': timestamp,
            'items': action_items[:10]  # First 10 for brevity
        }
    
    def _handle_bml_cycle(self, timestamp: str) -> Dict:
        """Handle Build-Measure-Learn cycle tracking."""
        metrics_log = self.goalie_dir / "metrics_log.jsonl"
        
        # Read last metrics entry if exists
        last_metrics = None
        if metrics_log.exists():
            with open(metrics_log, 'r') as f:
                lines = f.readlines()
                if lines:
                    last_metrics = json.loads(lines[-1])
        
        # Create current metrics snapshot
        current_metrics = {
            'timestamp': datetime.now().isoformat(),
            'cycle_timestamp': timestamp,
            'git_commit': self._get_current_commit_hash(),
            'branch': self._get_current_branch(),
            'action_items_count': self._count_action_items()
        }
        
        # Log to metrics
        self.goalie_dir.mkdir(exist_ok=True)
        with open(metrics_log, 'a') as f:
            f.write(json.dumps(current_metrics) + '\n')
        
        return {
            'action_status': 'completed',
            'bml_cycle': 'logged',
            'metrics': current_metrics,
            'previous_metrics': last_metrics
        }
    
    def _handle_metrics_snapshot(self, timestamp: str) -> Dict:
        """Capture current metrics snapshot."""
        metrics = {
            'timestamp': datetime.now().isoformat(),
            'git': {
                'commit': self._get_current_commit_hash(),
                'branch': self._get_current_branch(),
                'status_clean': self._is_git_clean()
            },
            'action_items': {
                'total': self._count_action_items(),
                'target_completion': 80  # Target > 80%
            },
            'cycle_log_entries': self._count_cycle_log_entries()
        }
        
        return {
            'action_status': 'completed',
            'metrics': metrics
        }
    
    def _get_current_branch(self) -> str:
        """Get current git branch."""
        result = subprocess.run(
            ['git', 'branch', '--show-current'],
            capture_output=True,
            text=True,
            cwd=self.project_root
        )
        return result.stdout.strip()
    
    def _is_git_clean(self) -> bool:
        """Check if git working directory is clean."""
        result = subprocess.run(
            ['git', 'status', '--porcelain'],
            capture_output=True,
            text=True,
            cwd=self.project_root
        )
        return not result.stdout.strip()
    
    def _count_action_items(self) -> int:
        """Count uncompleted action items."""
        doc_query_path = self.project_root / "scripts" / "doc_query.py"
        if not doc_query_path.exists():
            return 0
        
        result = subprocess.run(
            ['python3', str(doc_query_path), '--action-items', '--json'],
            capture_output=True,
            text=True,
            cwd=self.project_root
        )
        
        if result.returncode == 0:
            items = json.loads(result.stdout)
            return len(items)
        return 0
    
    def _count_cycle_log_entries(self) -> int:
        """Count entries in cycle log."""
        if not self.cycle_log.exists():
            return 0
        
        with open(self.cycle_log, 'r') as f:
            return len(f.readlines())
    
    def _log_cycle(self, result: Dict):
        """Log cycle execution to tracking file."""
        self.goalie_dir.mkdir(exist_ok=True)
        
        # Validate: no new .md files created during cycle
        self._validate_no_new_md_files()
        
        with open(self.cycle_log, 'a') as f:
            f.write(json.dumps(result) + '\n')
    
    def _validate_no_new_md_files(self):
        """Validate no new .md files were created."""
        result = subprocess.run(
            ['git', 'status', '--porcelain'],
            capture_output=True,
            text=True,
            cwd=self.project_root
        )
        
        for line in result.stdout.strip().split('\n'):
            if not line:
                continue
            # Check for new files (status starts with 'A' or '??')
            if line.startswith('?? ') or line.startswith('A  '):
                file_path = line[3:].strip()
                if file_path.endswith('.md'):
                    raise ValueError(
                        f"Constraint violation: New .md file detected: {file_path}\n"
                        f"Use .goalie/*.jsonl or .goalie/*.yaml instead"
                    )


def main():
    parser = argparse.ArgumentParser(
        description="Workflow orchestrator for cycle-based automation"
    )
    parser.add_argument('--cycle', action='store_true',
                       help='Execute a workflow cycle')
    parser.add_argument('--action', required=True,
                       help='Action to execute (e.g., AUTO-GIT-202511121835)')
    parser.add_argument('--project-root', default='.',
                       help='Project root directory')
    parser.add_argument('--json', action='store_true',
                       help='Output as JSON')
    
    args = parser.parse_args()
    
    orchestrator = WorkflowOrchestrator(args.project_root)
    
    if args.cycle:
        result = orchestrator.run_cycle(args.action)
        
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print(f"🔄 Cycle: {result['cycle_id']}")
            print(f"🎯 Action: {result['action']}")
            print(f"📊 Status: {result['status']}")
            
            if result['status'] == 'completed' and 'git_status' in result:
                print(f"\n📝 Git Status: {result['git_status']}")
                if result['git_status'] == 'committed':
                    print(f"✅ Commit: {result['commit_hash']}")
                    print(f"🌿 Branch: {result['branch']}")
                    print(f"💬 Message: {result['commit_message']}")
            elif result['status'] == 'failed':
                print(f"❌ Error: {result.get('error', 'Unknown error')}")


if __name__ == '__main__':
    main()
