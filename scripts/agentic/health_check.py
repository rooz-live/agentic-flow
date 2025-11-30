#!/usr/bin/env python3
"""
BML Health Check: Risk Controls & Monitoring
Part of BML-12: Establish Risk Controls & Health Checks
"""

import json
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List


class BMLHealthCheck:
    """Monitor BML cycle health and detect risks."""
    
    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root).resolve()
        self.goalie_dir = self.project_root / ".goalie"
        self.cycle_log = self.goalie_dir / "cycle_log.jsonl"
        self.metrics_log = self.goalie_dir / "metrics_log.jsonl"
        self.insights_log = self.goalie_dir / "insights_log.jsonl"
        
        # Risk thresholds
        self.thresholds = {
            'cycle_time_max_seconds': 3600,      # insight→commit < 1 hour
            'throughput_min': 3,                  # ≥3 items/sprint
            'wip_violations_max': 0.05,           # <5% WIP violations
            'context_switches_max': 5,            # ≤5 switches/day
            'action_completion_min': 0.80,        # ≥80% completion
            'stale_days_max': 7                   # Last activity < 7 days
        }
    
    def run_health_check(self) -> Dict:
        """Execute comprehensive health check."""
        health = {
            'timestamp': datetime.now().isoformat(),
            'status': 'healthy',
            'checks': {},
            'risks': [],
            'recommendations': []
        }
        
        # Check 1: Cycle log freshness
        health['checks']['cycle_log_freshness'] = self._check_cycle_log_freshness()
        
        # Check 2: Metrics tracking
        health['checks']['metrics_tracking'] = self._check_metrics_tracking()
        
        # Check 3: Git status
        health['checks']['git_status'] = self._check_git_status()
        
        # Check 4: Kanban WIP limits
        health['checks']['wip_limits'] = self._check_wip_limits()
        
        # Check 5: Cycle time
        health['checks']['cycle_time'] = self._check_cycle_time()
        
        # Aggregate risks
        for check_name, check_result in health['checks'].items():
            if check_result['status'] == 'warning':
                health['risks'].append({
                    'check': check_name,
                    'message': check_result.get('message', 'Unknown issue')
                })
            elif check_result['status'] == 'critical':
                health['status'] = 'at_risk'
                health['risks'].append({
                    'check': check_name,
                    'message': check_result.get('message', 'Unknown issue'),
                    'severity': 'critical'
                })
        
        # Generate recommendations
        if health['risks']:
            health['recommendations'] = self._generate_recommendations(health['risks'])
        
        return health
    
    def _check_cycle_log_freshness(self) -> Dict:
        """Check when last cycle was logged."""
        if not self.cycle_log.exists():
            return {
                'status': 'critical',
                'message': 'Cycle log not found',
                'last_activity': None
            }
        
        with open(self.cycle_log, 'r') as f:
            lines = f.readlines()
            if not lines:
                return {
                    'status': 'critical',
                    'message': 'Cycle log is empty',
                    'last_activity': None
                }
            
            last_entry = json.loads(lines[-1].strip())
            last_timestamp = datetime.fromisoformat(last_entry['timestamp'])
            # Use timezone-aware datetime to match UTC timestamps in cycle_log
            now = datetime.now(timezone.utc) if last_timestamp.tzinfo else datetime.now()
            hours_since = (now - last_timestamp).total_seconds() / 3600
            
            if hours_since > (self.thresholds['stale_days_max'] * 24):
                return {
                    'status': 'critical',
                    'message': f'No activity for {hours_since:.1f} hours',
                    'last_activity': last_timestamp.isoformat()
                }
            elif hours_since > 24:
                return {
                    'status': 'warning',
                    'message': f'Last activity {hours_since:.1f} hours ago',
                    'last_activity': last_timestamp.isoformat()
                }
            
            return {
                'status': 'healthy',
                'message': f'Recent activity ({hours_since:.1f} hours ago)',
                'last_activity': last_timestamp.isoformat()
            }
    
    def _check_metrics_tracking(self) -> Dict:
        """Verify metrics are being tracked."""
        if not self.metrics_log.exists():
            return {
                'status': 'warning',
                'message': 'Metrics log not found',
                'entry_count': 0
            }
        
        with open(self.metrics_log, 'r') as f:
            entries = f.readlines()
            
        if len(entries) < 2:
            return {
                'status': 'warning',
                'message': 'Insufficient metrics data',
                'entry_count': len(entries)
            }
        
        return {
            'status': 'healthy',
            'message': f'Tracking {len(entries)} metric snapshots',
            'entry_count': len(entries)
        }
    
    def _check_git_status(self) -> Dict:
        """Check git working directory status."""
        result = subprocess.run(
            ['git', 'status', '--porcelain'],
            capture_output=True,
            text=True,
            cwd=self.project_root
        )
        
        if result.returncode != 0:
            return {
                'status': 'critical',
                'message': 'Git status check failed'
            }
        
        changed_files = result.stdout.strip().split('\n') if result.stdout.strip() else []
        
        if len(changed_files) > 10:
            return {
                'status': 'warning',
                'message': f'{len(changed_files)} uncommitted files',
                'changed_files_count': len(changed_files)
            }
        elif changed_files:
            return {
                'status': 'healthy',
                'message': f'{len(changed_files)} uncommitted files',
                'changed_files_count': len(changed_files)
            }
        
        return {
            'status': 'healthy',
            'message': 'Working directory clean',
            'changed_files_count': 0
        }
    
    def _check_wip_limits(self) -> Dict:
        """Check Kanban WIP limit compliance."""
        kanban_yaml = self.goalie_dir / "KANBAN_BOARD.yaml"
        
        if not kanban_yaml.exists():
            return {
                'status': 'warning',
                'message': 'Kanban board not found'
            }
        
        import yaml
        with open(kanban_yaml, 'r') as f:
            board = yaml.safe_load(f)
        
        violations = []
        
        # Handle structured format (with metadata)
        if 'columns' in board:
            for col_id, col_data in board['columns'].items():
                wip_limit = col_data.get('wip_limit')
                if wip_limit:
                    current_count = len(col_data.get('items', []))
                    if current_count > wip_limit:
                        violations.append({
                            'column': col_id,
                            'current': current_count,
                            'limit': wip_limit
                        })
        # Handle simple format (list of items per column key)
        else:
            # Default limits for simple structure
            default_limits = {'NOW': 3, 'NEXT': 5, 'LATER': 20}
            
            for col_id, items in board.items():
                if not isinstance(items, list):
                    continue
                    
                wip_limit = default_limits.get(col_id)
                if wip_limit:
                    current_count = len(items)
                    if current_count > wip_limit:
                        violations.append({
                            'column': col_id,
                            'current': current_count,
                            'limit': wip_limit
                        })
        
        if violations:
            return {
                'status': 'critical',
                'message': f'{len(violations)} WIP limit violation(s)',
                'violations': violations
            }
        
        return {
            'status': 'healthy',
            'message': 'All WIP limits respected'
        }
    
    def _check_cycle_time(self) -> Dict:
        """Check average cycle time."""
        if not self.cycle_log.exists():
            return {
                'status': 'warning',
                'message': 'Cannot compute cycle time - no log'
            }
        
        with open(self.cycle_log, 'r') as f:
            entries = [json.loads(line) for line in f.readlines()]
        
        if len(entries) < 2:
            return {
                'status': 'warning',
                'message': 'Insufficient data for cycle time'
            }
        
        # Compute time between kanban moves
        move_events = [e for e in entries if e.get('event') == 'kanban_move']
        
        if not move_events:
            return {
                'status': 'healthy',
                'message': 'No kanban moves yet'
            }
        
        times = []
        for i in range(1, len(move_events)):
            t1 = datetime.fromisoformat(move_events[i-1]['timestamp'])
            t2 = datetime.fromisoformat(move_events[i]['timestamp'])
            times.append((t2 - t1).total_seconds())
        
        if times:
            avg_time = sum(times) / len(times)
            if avg_time > self.thresholds['cycle_time_max_seconds']:
                return {
                    'status': 'warning',
                    'message': f'Average cycle time {avg_time:.0f}s exceeds target',
                    'avg_time_seconds': avg_time
                }
            
            return {
                'status': 'healthy',
                'message': f'Average cycle time {avg_time:.0f}s within target',
                'avg_time_seconds': avg_time
            }
        
        return {
            'status': 'healthy',
            'message': 'Insufficient move data'
        }
    
    def _generate_recommendations(self, risks: List[Dict]) -> List[str]:
        """Generate actionable recommendations from risks."""
        recommendations = []
        
        for risk in risks:
            check = risk['check']
            
            if check == 'cycle_log_freshness':
                recommendations.append(
                    "Execute BML cycle: python3 .claude/agents/workflow_orchestrator.py "
                    "--cycle --action BML-CYCLE-$(date +%Y%m%d%H%M%S)"
                )
            elif check == 'metrics_tracking':
                recommendations.append(
                    "Capture metrics snapshot: python3 .claude/agents/workflow_orchestrator.py "
                    "--cycle --action METRICS-SNAPSHOT-$(date +%Y%m%d%H%M%S)"
                )
            elif check == 'git_status':
                recommendations.append(
                    "Commit changes: python3 .claude/agents/workflow_orchestrator.py "
                    "--cycle --action AUTO-GIT-$(date +%Y%m%d%H%M%S)"
                )
            elif check == 'wip_limits':
                recommendations.append(
                    "Move items to DONE or reduce WIP: "
                    "python3 scripts/agentic/kanban_sync.py --move <ITEM_ID> NOW DONE"
                )
            elif check == 'cycle_time':
                recommendations.append(
                    "Review and complete stalled items in NOW column"
                )
        
        return recommendations


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='BML cycle health check')
    parser.add_argument('--json', action='store_true',
                       help='Output as JSON')
    parser.add_argument('--watch', action='store_true',
                       help='Continuous monitoring mode')
    
    args = parser.parse_args()
    
    checker = BMLHealthCheck()
    
    if args.watch:
        import time
        while True:
            health = checker.run_health_check()
            if args.json:
                print(json.dumps(health, indent=2))
            else:
                print(f"\n🏥 Health Check: {health['status']}")
                for check_name, check_result in health['checks'].items():
                    status_icon = {'healthy': '✅', 'warning': '⚠️', 'critical': '❌'}[check_result['status']]
                    print(f"  {status_icon} {check_name}: {check_result['message']}")
                
                if health['recommendations']:
                    print("\n💡 Recommendations:")
                    for i, rec in enumerate(health['recommendations'], 1):
                        print(f"  {i}. {rec}")
            
            time.sleep(60)
    else:
        health = checker.run_health_check()
        
        if args.json:
            print(json.dumps(health, indent=2))
        else:
            print(f"🏥 Health Check: {health['status']}")
            for check_name, check_result in health['checks'].items():
                status_icon = {'healthy': '✅', 'warning': '⚠️', 'critical': '❌'}[check_result['status']]
                print(f"  {status_icon} {check_name}: {check_result['message']}")
            
            if health['recommendations']:
                print("\n💡 Recommendations:")
                for i, rec in enumerate(health['recommendations'], 1):
                    print(f"  {i}. {rec}")


if __name__ == '__main__':
    main()
