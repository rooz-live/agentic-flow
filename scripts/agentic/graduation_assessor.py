#!/usr/bin/env python3
"""
Graduation Assessor - Assess autocommit readiness using evidence and thresholds
Determines qualification status based on stability, success rate, and error metrics
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from collections import defaultdict

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


class GraduationAssessor:
    """Assess autocommit readiness using evidence"""
    
    def __init__(self, config_path: Optional[str] = None):
        """Initialize with graduation thresholds from config"""
        if config_path is None:
            config_path = PROJECT_ROOT / "config" / "evidence_config.json"
        else:
            config_path = Path(config_path)
        
        if not config_path.exists():
            raise FileNotFoundError(f"Evidence config not found: {config_path}")
        
        with open(config_path) as f:
            config = json.load(f)
            self.thresholds = config['graduation_thresholds']
        
        self.evidence_path = PROJECT_ROOT / ".goalie" / "evidence.jsonl"
        self.pattern_metrics_path = PROJECT_ROOT / ".goalie" / "pattern_metrics.jsonl"
    
    def _load_evidence(self, run_id: str) -> List[Dict[str, Any]]:
        """Load evidence events for a specific run"""
        if not self.evidence_path.exists():
            return []
        
        evidence = []
        with open(self.evidence_path) as f:
            for line in f:
                try:
                    event = json.loads(line)
                    if event.get('run_id') == run_id:
                        evidence.append(event)
                except json.JSONDecodeError:
                    continue
        
        return evidence
    
    def _load_recent_runs(self, limit: int = 20) -> List[str]:
        """Load recent run IDs from evidence"""
        if not self.evidence_path.exists():
            return []
        
        # Track latest timestamp per run_id
        run_timestamps = {}
        with open(self.evidence_path) as f:
            for line in f:
                try:
                    event = json.loads(line)
                    run_id = event.get('run_id')
                    timestamp = event.get('timestamp', '')
                    if run_id and run_id != 'unknown':
                        # Keep latest timestamp for this run
                        if run_id not in run_timestamps or timestamp > run_timestamps[run_id]:
                            run_timestamps[run_id] = timestamp
                except json.JSONDecodeError:
                    continue
        
        # Sort by timestamp (most recent first)
        sorted_runs = sorted(run_timestamps.items(), key=lambda x: x[1], reverse=True)
        return [run_id for run_id, _ in sorted_runs[:limit]]
    
    def _load_pattern_metrics(self, run_id: Optional[str] = None, limit: int = 1000) -> List[Dict[str, Any]]:
        """Load pattern metrics for analysis"""
        if not self.pattern_metrics_path.exists():
            return []
        
        metrics = []
        with open(self.pattern_metrics_path) as f:
            for line in f:
                try:
                    event = json.loads(line)
                    # Filter by run_id if provided
                    if run_id is None or event.get('run_id') == run_id:
                        metrics.append(event)
                        if len(metrics) >= limit:
                            break
                except json.JSONDecodeError:
                    continue
        
        return metrics
    
    def _calculate_ok_rate(self, run_ids: List[str]) -> float:
        """Calculate success rate across runs - tolerant of minority failures"""
        if not run_ids:
            return 0.0
        
        total_runs = len(run_ids)
        successful_runs = 0
        
        for run_id in run_ids:
            evidence = self._load_evidence(run_id)
            if not evidence:
                continue
            
            # NEW: Check for top-level status fields first (enhanced schema)
            # Look for cycle-level success indicators
            has_cycle_status = False
            cycle_ok = False
            
            for e in evidence:
                # Check enhanced schema fields
                if 'status' in e:
                    has_cycle_status = True
                    if e.get('status') == 'success' or e.get('ok') == True:
                        cycle_ok = True
                        break
            
            if has_cycle_status:
                if cycle_ok:
                    successful_runs += 1
                continue
            
            # FALLBACK: Count emitter success/failure (legacy schema)
            emitter_success = 0
            emitter_failure = 0
            
            for e in evidence:
                status = e.get('metadata', {}).get('status')
                if status == 'success':
                    emitter_success += 1
                elif status == 'failure':
                    emitter_failure += 1
            
            # If no emitters recorded, but run_id exists in evidence = success
            # This handles cases where cycles complete but don't emit per-emitter events
            total_emitters = emitter_success + emitter_failure
            if total_emitters == 0 and len(evidence) > 0:
                # Evidence exists for this run = successful cycle
                successful_runs += 1
            elif total_emitters > 0:
                # Run is successful if majority of emitters succeeded (>50%)
                success_rate = emitter_success / total_emitters
                if success_rate > 0.5:  # Majority passed
                    successful_runs += 1
                elif emitter_success > 0 and emitter_failure == 0:  # All passed
                    successful_runs += 1
        
        return (successful_runs / total_runs * 100) if total_runs > 0 else 0.0
    
    def _calculate_stability(self, run_ids: List[str]) -> float:
        """Calculate stability score based on variance in metrics"""
        if len(run_ids) < 2:
            return 50.0  # Insufficient data
        
        # Collect duration metrics per run
        durations = []
        for run_id in run_ids:
            evidence = self._load_evidence(run_id)
            total_duration = sum(e.get('metadata', {}).get('duration_ms', 0) for e in evidence)
            if total_duration > 0:
                durations.append(total_duration)
        
        if len(durations) < 2:
            return 50.0
        
        # Calculate coefficient of variation (lower = more stable)
        mean_duration = sum(durations) / len(durations)
        variance = sum((d - mean_duration) ** 2 for d in durations) / len(durations)
        std_dev = variance ** 0.5
        cv = std_dev / mean_duration if mean_duration > 0 else 1.0
        
        # Convert CV to stability score (0-100, higher = more stable)
        # CV < 0.1 = 100, CV > 0.5 = 0
        stability = max(0.0, min(100.0, 100.0 - (cv / 0.5) * 100))
        return stability
    
    def _count_autofix_advisories(self, run_ids: List[str]) -> int:
        """Count autofix advisory events across runs"""
        count = 0
        for run_id in run_ids:
            metrics = self._load_pattern_metrics(run_id)
            count += sum(1 for m in metrics if m.get('pattern_name') in ['code_fix_proposal', 'wsjf-enrichment'])
        return count
    
    def _count_sys_state_errors(self, run_ids: List[str]) -> int:
        """Count system state errors across runs"""
        count = 0
        for run_id in run_ids:
            metrics = self._load_pattern_metrics(run_id)
            count += sum(1 for m in metrics if 'sys_state_err' in m.get('pattern_name', '').lower())
        return count
    
    def _count_aborts(self, run_ids: List[str]) -> int:
        """Count abort events across runs"""
        count = 0
        for run_id in run_ids:
            metrics = self._load_pattern_metrics(run_id)
            count += sum(1 for m in metrics if 'abort' in m.get('pattern_name', '').lower())
        return count
    
    def _calculate_green_streak(self, run_ids: List[str]) -> int:
        """Calculate consecutive successful runs (green streak) - using majority-wins logic"""
        streak = 0
        for run_id in reversed(run_ids):  # Most recent first
            evidence = self._load_evidence(run_id)
            if not evidence:
                break
            
            # NEW: Check for top-level status fields first (enhanced schema)
            has_cycle_status = False
            cycle_ok = False
            
            for e in evidence:
                if 'status' in e:
                    has_cycle_status = True
                    if e.get('status') == 'success' or e.get('ok') == True:
                        cycle_ok = True
                        break
            
            if has_cycle_status:
                if cycle_ok:
                    streak += 1
                else:
                    break
                continue
            
            # FALLBACK: Count emitter success/failure (legacy schema)
            emitter_success = 0
            emitter_failure = 0
            
            for e in evidence:
                status = e.get('metadata', {}).get('status')
                if status == 'success':
                    emitter_success += 1
                elif status == 'failure':
                    emitter_failure += 1
            
            # If no emitters recorded, but evidence exists = success
            total_emitters = emitter_success + emitter_failure
            if total_emitters == 0 and len(evidence) > 0:
                streak += 1
            elif total_emitters > 0:
                success_rate = emitter_success / total_emitters
                if success_rate > 0.5:  # Majority passed
                    streak += 1
                elif emitter_success > 0 and emitter_failure == 0:  # All passed
                    streak += 1
                else:
                    break  # Streak ended
            else:
                break
        return streak
    
    def assess(self, run_id: Optional[str] = None, include_recent: int = 10) -> Dict[str, Any]:
        """
        Assess graduation status based on collected evidence
        
        Args:
            run_id: Specific run to assess (or None for most recent)
            include_recent: Number of recent runs to include in analysis
        
        Returns:
            Assessment dict with qualification status and metrics
        """
        # Get runs to analyze
        if run_id:
            run_ids = [run_id] + self._load_recent_runs(limit=include_recent - 1)
        else:
            run_ids = self._load_recent_runs(limit=include_recent)
        
        if not run_ids:
            return {
                "qualified_for_autocommit": False,
                "error": "No runs found",
                "recommendation": "BLOCK",
                "message": "No evidence data available",
                "metrics": {},
                "thresholds": self.thresholds,
                "checks": {},
                "analyzed_runs": []
            }
        
        # Calculate metrics
        ok_rate = self._calculate_ok_rate(run_ids)
        stability_score = self._calculate_stability(run_ids)
        autofix_adv_count = self._count_autofix_advisories(run_ids)
        sys_state_err = self._count_sys_state_errors(run_ids)
        abort_count = self._count_aborts(run_ids)
        green_streak = self._calculate_green_streak(run_ids)
        
        # Check thresholds
        checks = {
            "green_streak": green_streak >= self.thresholds['green_streak_required'],
            "autofix_adv": autofix_adv_count <= self.thresholds['max_autofix_adv_per_cycle'] * len(run_ids),
            "stability": stability_score >= self.thresholds['min_stability_score'],
            "ok_rate": ok_rate >= self.thresholds['min_ok_rate'],
            "sys_state_err": sys_state_err <= self.thresholds['max_sys_state_err'],
            "abort": abort_count <= self.thresholds['max_abort']
        }
        
        passed = all(checks.values())
        
        # Build recommendation
        if passed:
            if len(run_ids) < self.thresholds['shadow_cycles_before_recommend']:
                recommendation = "SHADOW_CONTINUE"
                message = f"Need {self.thresholds['shadow_cycles_before_recommend'] - len(run_ids)} more shadow cycles"
            else:
                recommendation = "APPROVE" if self.thresholds['retro_approval_required'] else "AUTO_APPROVE"
                message = "Qualified for autocommit" + (" (pending retro approval)" if self.thresholds['retro_approval_required'] else "")
        else:
            recommendation = "BLOCK"
            failed_checks = [k for k, v in checks.items() if not v]
            message = f"Failed checks: {', '.join(failed_checks)}"
        
        return {
            "qualified_for_autocommit": passed and len(run_ids) >= self.thresholds['shadow_cycles_before_recommend'],
            "recommendation": recommendation,
            "message": message,
            "metrics": {
                "ok_rate": round(ok_rate, 3),
                "stability_score": round(stability_score, 3),
                "autofix_adv_count": autofix_adv_count,
                "sys_state_err": sys_state_err,
                "abort_count": abort_count,
                "green_streak": green_streak,
                "runs_analyzed": len(run_ids)
            },
            "thresholds": self.thresholds,
            "checks": checks,
            "analyzed_runs": run_ids
        }
    
    def print_assessment(self, assessment: Dict[str, Any]):
        """Print assessment results in human-readable format"""
        print(f"\n🎓 Graduation Assessment")
        print(f"   Status: {assessment['recommendation']}")
        print(f"   Message: {assessment['message']}")
        print(f"   Qualified: {'✅ YES' if assessment['qualified_for_autocommit'] else '❌ NO'}")
        
        if 'error' in assessment:
            print(f"\n⚠️  Error: {assessment['error']}")
            return
        
        print(f"\n📊 Metrics:")
        metrics = assessment['metrics']
        thresholds = assessment['thresholds']
        checks = assessment['checks']
        
        def check_symbol(passed):
            return '✅' if passed else '❌'
        
        print(f"   {check_symbol(checks['ok_rate'])} OK Rate: {metrics['ok_rate']:.1f}% (threshold: {thresholds['min_ok_rate']}%)")
        print(f"   {check_symbol(checks['stability'])} Stability: {metrics['stability_score']:.1f}% (threshold: {thresholds['min_stability_score']}%)")
        print(f"   {check_symbol(checks['green_streak'])} Green Streak: {metrics['green_streak']} (threshold: {thresholds['green_streak_required']})")
        print(f"   {check_symbol(checks['autofix_adv'])} Autofix Advisories: {metrics['autofix_adv_count']} (max: {thresholds['max_autofix_adv_per_cycle'] * metrics['runs_analyzed']})")
        print(f"   {check_symbol(checks['sys_state_err'])} System Errors: {metrics['sys_state_err']} (max: {thresholds['max_sys_state_err']})")
        print(f"   {check_symbol(checks['abort'])} Aborts: {metrics['abort_count']} (max: {thresholds['max_abort']})")
        
        print(f"\n   Runs Analyzed: {metrics['runs_analyzed']}")
        if assessment['analyzed_runs']:
            print(f"   Recent Runs: {', '.join(assessment['analyzed_runs'][:5])}")


def main():
    """CLI entry point for graduation assessor"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Graduation Assessor - Assess autocommit readiness")
    parser.add_argument('--run-id', help='Specific run ID to assess')
    parser.add_argument('--recent', type=int, default=10, help='Number of recent runs to analyze')
    parser.add_argument('--config', help='Path to evidence config JSON')
    parser.add_argument('--json', action='store_true', help='Output as JSON')
    parser.add_argument('--strict', action='store_true', help='Exit with code 1 if not qualified (for CI/CD gates)')
    
    args = parser.parse_args()
    
    # Initialize assessor
    try:
        assessor = GraduationAssessor(config_path=args.config)
    except Exception as e:
        print(f"❌ Failed to initialize Graduation Assessor: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Run assessment
    try:
        assessment = assessor.assess(run_id=args.run_id, include_recent=args.recent)
    except Exception as e:
        print(f"❌ Assessment failed: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Output results
    if args.json:
        print(json.dumps(assessment, indent=2))
    else:
        assessor.print_assessment(assessment)
    
    # Exit code based on qualification and mode
    # In strict mode (CI/CD gates), fail if not qualified
    # In advisory mode (default), always succeed but report status
    if args.strict:
        sys.exit(0 if assessment['qualified_for_autocommit'] else 1)
    else:
        # Advisory mode: always exit 0, status is informational
        sys.exit(0)


if __name__ == '__main__':
    main()
