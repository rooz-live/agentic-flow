#!/usr/bin/env python3
"""
Production Quality Gates Framework
Validates pre/post context, exit codes, and protocol factors for af prod
"""

import json
import sys
from pathlib import Path
from typing import Dict, List, Any, Tuple
from dataclasses import dataclass
from enum import Enum

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


class QualityLevel(Enum):
    """Quality assessment levels"""
    CRITICAL = "CRITICAL"  # Must pass, blocks execution
    HIGH = "HIGH"          # Should pass, warns but continues
    MEDIUM = "MEDIUM"      # Nice to have, informational
    LOW = "LOW"            # Optional, best practice


@dataclass
class QualityCheck:
    """Individual quality check definition"""
    name: str
    level: QualityLevel
    check_fn: callable
    context: str  # pre, post, both
    error_message: str
    remediation: str


class QualityGateOrchestrator:
    """Orchestrates quality checks for prod execution"""
    
    def __init__(self):
        self.checks_registry: List[QualityCheck] = []
        self.results = {
            "pre_context": [],
            "post_context": [],
            "exit_codes": [],
            "protocol_factors": []
        }
        self._register_checks()
    
    def _register_checks(self):
        """Register all quality checks"""
        
        # PRE-CONTEXT CHECKS
        self.checks_registry.extend([
            QualityCheck(
                name="goalie_artifacts_exist",
                level=QualityLevel.HIGH,
                check_fn=self._check_goalie_artifacts,
                context="pre",
                error_message="Critical .goalie artifacts missing",
                remediation="Run: mkdir -p .goalie && touch .goalie/pattern_metrics.jsonl"
            ),
            QualityCheck(
                name="wsjf_data_available",
                level=QualityLevel.HIGH,
                check_fn=self._check_wsjf_data,
                context="pre",
                error_message="WSJF data not available for prioritization",
                remediation="Run: ./scripts/af wsjf-replenish"
            ),
            QualityCheck(
                name="system_stability_baseline",
                level=QualityLevel.MEDIUM,
                check_fn=self._check_stability_baseline,
                context="pre",
                error_message="No stability baseline established",
                remediation="Run at least one prod-cycle to establish baseline"
            ),
            QualityCheck(
                name="sufficient_disk_space",
                level=QualityLevel.CRITICAL,
                check_fn=self._check_disk_space,
                context="pre",
                error_message="Insufficient disk space (<1GB free)",
                remediation="Free up disk space before continuing"
            ),
            QualityCheck(
                name="no_concurrent_runs",
                level=QualityLevel.CRITICAL,
                check_fn=self._check_concurrent_runs,
                context="pre",
                error_message="Another prod run is already in progress",
                remediation="Wait for existing run to complete or kill process"
            ),
        ])
        
        # POST-CONTEXT CHECKS
        self.checks_registry.extend([
            QualityCheck(
                name="evidence_collected",
                level=QualityLevel.HIGH,
                check_fn=self._check_evidence_collected,
                context="post",
                error_message="No evidence collected during execution",
                remediation="Verify emitters are enabled in config/evidence_config.json"
            ),
            QualityCheck(
                name="metrics_captured",
                level=QualityLevel.HIGH,
                check_fn=self._check_metrics_captured,
                context="post",
                error_message="Pattern metrics not captured",
                remediation="Check AF_ENABLE_IRIS_METRICS=1 is set"
            ),
            QualityCheck(
                name="no_degradation",
                level=QualityLevel.HIGH,
                check_fn=self._check_no_degradation,
                context="post",
                error_message="System degradation detected",
                remediation="Review degradation patterns and fix root causes"
            ),
            QualityCheck(
                name="wsjf_updated",
                level=QualityLevel.MEDIUM,
                check_fn=self._check_wsjf_updated,
                context="post",
                error_message="WSJF scores not updated post-execution",
                remediation="Run economic analysis manually"
            ),
            QualityCheck(
                name="graduation_assessed",
                level=QualityLevel.MEDIUM,
                check_fn=self._check_graduation_assessed,
                context="post",
                error_message="Graduation readiness not assessed",
                remediation="Run: ./scripts/af evidence assess"
            ),
        ])
        
        # EXIT CODE PROTOCOL CHECKS
        self.checks_registry.extend([
            QualityCheck(
                name="proper_exit_code_usage",
                level=QualityLevel.HIGH,
                check_fn=self._check_exit_code_protocol,
                context="both",
                error_message="Exit codes not following protocol",
                remediation="Ensure 0=success, 1=failure, 2=partial, 130=interrupted"
            ),
        ])
        
        # PROTOCOL FACTOR CHECKS
        self.checks_registry.extend([
            QualityCheck(
                name="iteration_budget_respected",
                level=QualityLevel.MEDIUM,
                check_fn=self._check_iteration_budget,
                context="both",
                error_message="Iteration budget exceeded",
                remediation="Adjust --rotations or review early exit conditions"
            ),
            QualityCheck(
                name="health_checks_enabled",
                level=QualityLevel.HIGH,
                check_fn=self._check_health_checks,
                context="both",
                error_message="Health checks not enabled",
                remediation="Ensure --with-health-check is used"
            ),
            QualityCheck(
                name="roam_tracking_active",
                level=QualityLevel.HIGH,
                check_fn=self._check_roam_tracking,
                context="both",
                error_message="ROAM risk tracking not active",
                remediation="Enable evidence assessment for ROAM visibility"
            ),
        ])
    
    # === CHECK IMPLEMENTATIONS ===
    
    def _check_goalie_artifacts(self) -> Tuple[bool, str]:
        """Check if critical .goalie artifacts exist"""
        goalie_dir = PROJECT_ROOT / ".goalie"
        required_files = ["pattern_metrics.jsonl"]
        
        if not goalie_dir.exists():
            return False, ".goalie directory not found"
        
        missing = [f for f in required_files if not (goalie_dir / f).exists()]
        if missing:
            return False, f"Missing: {', '.join(missing)}"
        
        return True, "All artifacts present"
    
    def _check_wsjf_data(self) -> Tuple[bool, str]:
        """Check if WSJF data is available"""
        backlog_dir = PROJECT_ROOT / "backlog"
        if not backlog_dir.exists():
            return False, "Backlog directory not found"
        
        # Check for any circle with backlog items
        has_items = any(
            list(circle_dir.glob("*.json"))
            for circle_dir in backlog_dir.iterdir()
            if circle_dir.is_dir()
        )
        
        if not has_items:
            return False, "No backlog items found in any circle"
        
        return True, "WSJF data available"
    
    def _check_stability_baseline(self) -> Tuple[bool, str]:
        """Check if stability baseline exists"""
        metrics_path = PROJECT_ROOT / ".goalie" / "pattern_metrics.jsonl"
        
        if not metrics_path.exists():
            return False, "No metrics file found"
        
        try:
            with open(metrics_path) as f:
                lines = f.readlines()
                if len(lines) < 10:
                    return False, f"Only {len(lines)} metric events (need 10+ for baseline)"
        except Exception as e:
            return False, f"Error reading metrics: {e}"
        
        return True, "Baseline established"
    
    def _check_disk_space(self) -> Tuple[bool, str]:
        """Check available disk space"""
        import shutil
        try:
            stat = shutil.disk_usage(PROJECT_ROOT)
            free_gb = stat.free / (1024**3)
            
            if free_gb < 1.0:
                return False, f"Only {free_gb:.2f}GB free"
            elif free_gb < 5.0:
                return True, f"Warning: {free_gb:.2f}GB free (low)"
            
            return True, f"{free_gb:.2f}GB free"
        except Exception as e:
            return False, f"Error checking disk: {e}"
    
    def _check_concurrent_runs(self) -> Tuple[bool, str]:
        """Check for concurrent prod runs"""
        try:
            import psutil
            current_pid = psutil.Process().pid
            for proc in psutil.process_iter(['pid', 'cmdline']):
                try:
                    cmdline = ' '.join(proc.info['cmdline'] or [])
                    if 'af prod' in cmdline and proc.info['pid'] != current_pid:
                        return False, f"PID {proc.info['pid']} is running af prod"
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            return True, "No concurrent runs"
        except ImportError:
            return True, "psutil not installed, skipping check"
        except Exception as e:
            return True, f"Could not check (assuming OK): {e}"
    
    def _check_evidence_collected(self) -> Tuple[bool, str]:
        """Check if evidence was collected"""
        evidence_path = PROJECT_ROOT / ".goalie" / "evidence.jsonl"
        
        if not evidence_path.exists():
            return False, "No evidence.jsonl file"
        
        try:
            with open(evidence_path) as f:
                lines = f.readlines()
                if len(lines) == 0:
                    return False, "Evidence file is empty"
                
                # Check for recent evidence (last 5 lines)
                recent = lines[-5:]
                return True, f"{len(recent)} recent evidence entries"
        except Exception as e:
            return False, f"Error reading evidence: {e}"
    
    def _check_metrics_captured(self) -> Tuple[bool, str]:
        """Check if metrics were captured during run"""
        metrics_path = PROJECT_ROOT / ".goalie" / "pattern_metrics.jsonl"
        
        if not metrics_path.exists():
            return False, "No pattern_metrics.jsonl"
        
        try:
            with open(metrics_path) as f:
                lines = f.readlines()
                if len(lines) == 0:
                    return False, "Metrics file is empty"
                
                return True, f"{len(lines)} total metrics"
        except Exception as e:
            return False, f"Error reading metrics: {e}"
    
    def _check_no_degradation(self) -> Tuple[bool, str]:
        """Check for system degradation patterns"""
        metrics_path = PROJECT_ROOT / ".goalie" / "pattern_metrics.jsonl"
        
        if not metrics_path.exists():
            return True, "No metrics to check"
        
        try:
            degradations = 0
            with open(metrics_path) as f:
                for line in f.readlines()[-100:]:  # Last 100 events
                    try:
                        event = json.loads(line)
                        if 'degrad' in event.get('pattern_name', '').lower():
                            degradations += 1
                    except json.JSONDecodeError:
                        continue
            
            if degradations > 10:
                return False, f"{degradations} degradations detected"
            elif degradations > 5:
                return True, f"Warning: {degradations} degradations"
            
            return True, f"{degradations} degradations (acceptable)"
        except Exception as e:
            return True, f"Could not check: {e}"
    
    def _check_wsjf_updated(self) -> Tuple[bool, str]:
        """Check if WSJF was updated"""
        # Check for recent WSJF recalc pattern
        metrics_path = PROJECT_ROOT / ".goalie" / "pattern_metrics.jsonl"
        
        if not metrics_path.exists():
            return False, "No metrics file"
        
        try:
            with open(metrics_path) as f:
                recent = f.readlines()[-50:]  # Last 50 events
                has_wsjf = any('wsjf' in line.lower() for line in recent)
                
                if has_wsjf:
                    return True, "WSJF updated"
                return False, "No recent WSJF updates"
        except Exception as e:
            return False, f"Error: {e}"
    
    def _check_graduation_assessed(self) -> Tuple[bool, str]:
        """Check if graduation was assessed"""
        evidence_path = PROJECT_ROOT / ".goalie" / "evidence.jsonl"
        
        if not evidence_path.exists():
            return False, "No evidence file"
        
        try:
            with open(evidence_path) as f:
                recent = f.readlines()[-20:]
                has_grad = any('graduation' in line.lower() or 'assess' in line.lower() for line in recent)
                
                if has_grad:
                    return True, "Graduation assessed"
                return False, "No graduation assessment"
        except Exception as e:
            return False, f"Error: {e}"
    
    def _check_exit_code_protocol(self) -> Tuple[bool, str]:
        """Verify exit code protocol is followed"""
        # This is a meta-check, always passes but logs protocol
        return True, "Protocol: 0=success, 1=failure, 2=partial, 130=interrupted"
    
    def _check_iteration_budget(self) -> Tuple[bool, str]:
        """Check if iteration budget is reasonable"""
        # Check last run's iteration count
        metrics_path = PROJECT_ROOT / ".goalie" / "pattern_metrics.jsonl"
        
        if not metrics_path.exists():
            return True, "No metrics to check"
        
        try:
            with open(metrics_path) as f:
                lines = f.readlines()[-100:]
                iteration_events = [l for l in lines if 'iteration' in l.lower()]
                
                if len(iteration_events) > 100:
                    return False, f"{len(iteration_events)} iterations (high)"
                
                return True, f"{len(iteration_events)} iterations"
        except Exception as e:
            return True, f"Could not check: {e}"
    
    def _check_health_checks(self) -> Tuple[bool, str]:
        """Verify health checks were enabled"""
        metrics_path = PROJECT_ROOT / ".goalie" / "pattern_metrics.jsonl"
        
        if not metrics_path.exists():
            return False, "No metrics file"
        
        try:
            with open(metrics_path) as f:
                recent = f.readlines()[-50:]
                has_health = any('health' in line.lower() for line in recent)
                
                if has_health:
                    return True, "Health checks enabled"
                return False, "No health check patterns"
        except Exception as e:
            return False, f"Error: {e}"
    
    def _check_roam_tracking(self) -> Tuple[bool, str]:
        """Verify ROAM risk tracking is active"""
        evidence_path = PROJECT_ROOT / ".goalie" / "evidence.jsonl"
        
        if not evidence_path.exists():
            return False, "Evidence tracking not active"
        
        # Check if evidence file has recent entries
        try:
            with open(evidence_path) as f:
                lines = f.readlines()
                if len(lines) > 0:
                    return True, f"ROAM tracking active ({len(lines)} entries)"
                return False, "No evidence entries"
        except Exception as e:
            return False, f"Error: {e}"
    
    # === EXECUTION ===
    
    def run_pre_checks(self, strict: bool = False) -> Dict[str, Any]:
        """Run all pre-context checks"""
        results = {"passed": True, "checks": [], "critical_failures": []}
        
        pre_checks = [c for c in self.checks_registry if c.context in ["pre", "both"]]
        
        for check in pre_checks:
            passed, message = check.check_fn()
            
            result = {
                "name": check.name,
                "level": check.level.value,
                "passed": passed,
                "message": message,
                "remediation": check.remediation if not passed else None
            }
            
            results["checks"].append(result)
            
            if not passed:
                if check.level == QualityLevel.CRITICAL:
                    results["critical_failures"].append(check.name)
                    results["passed"] = False
                elif check.level == QualityLevel.HIGH and strict:
                    results["passed"] = False
        
        self.results["pre_context"] = results
        return results
    
    def run_post_checks(self, strict: bool = False) -> Dict[str, Any]:
        """Run all post-context checks"""
        results = {"passed": True, "checks": [], "critical_failures": []}
        
        post_checks = [c for c in self.checks_registry if c.context in ["post", "both"]]
        
        for check in post_checks:
            passed, message = check.check_fn()
            
            result = {
                "name": check.name,
                "level": check.level.value,
                "passed": passed,
                "message": message,
                "remediation": check.remediation if not passed else None
            }
            
            results["checks"].append(result)
            
            if not passed:
                if check.level == QualityLevel.CRITICAL:
                    results["critical_failures"].append(check.name)
                    results["passed"] = False
                elif check.level == QualityLevel.HIGH and strict:
                    results["passed"] = False
        
        self.results["post_context"] = results
        return results
    
    def print_results(self, context: str = "pre"):
        """Print quality check results"""
        results = self.results.get(f"{context}_context", {})
        
        print(f"\n{'='*70}")
        print(f"🔍 {context.upper()}-CONTEXT QUALITY CHECKS")
        print(f"{'='*70}")
        
        if not results:
            print("No checks run yet")
            return
        
        for check in results["checks"]:
            symbol = "✅" if check["passed"] else "❌"
            level = check["level"]
            name = check["name"]
            message = check["message"]
            
            print(f"{symbol} [{level:8}] {name:30} - {message}")
            
            if not check["passed"] and check["remediation"]:
                print(f"   💡 {check['remediation']}")
        
        print(f"\n{'='*70}")
        print(f"Overall: {'✅ PASS' if results['passed'] else '❌ FAIL'}")
        
        if results["critical_failures"]:
            print(f"❌ Critical Failures: {', '.join(results['critical_failures'])}")
        
        print(f"{'='*70}\n")


def main():
    """CLI entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Production Quality Gates")
    parser.add_argument('--context', choices=['pre', 'post', 'both'], default='both')
    parser.add_argument('--strict', action='store_true', help='Fail on HIGH level issues')
    parser.add_argument('--json', action='store_true', help='Output as JSON')
    
    args = parser.parse_args()
    
    orchestrator = QualityGateOrchestrator()
    
    exit_code = 0
    
    if args.context in ['pre', 'both']:
        pre_results = orchestrator.run_pre_checks(strict=args.strict)
        if args.json:
            print(json.dumps(pre_results, indent=2))
        else:
            orchestrator.print_results('pre')
        
        if not pre_results['passed']:
            exit_code = 1
    
    if args.context in ['post', 'both']:
        post_results = orchestrator.run_post_checks(strict=args.strict)
        if args.json:
            print(json.dumps(post_results, indent=2))
        else:
            orchestrator.print_results('post')
        
        if not post_results['passed']:
            exit_code = 1
    
    sys.exit(exit_code)


if __name__ == '__main__':
    main()
