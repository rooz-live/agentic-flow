#!/usr/bin/env python3
"""
Governance Agent for Agentic Flow
Automated policy enforcement, root cause analysis, and risk scoring

Usage:
  python scripts/governance_agent.py run [--since ISO8601] [--dry-run]
  
Or via af CLI:
  ./scripts/af governance-agent run [--since ISO8601] [--dry-run]
"""

import argparse
import json
import sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

try:
    import yaml
except ImportError:
    print("Warning: PyYAML not installed. Install with: pip install PyYAML")
    yaml = None

ROOT = Path(__file__).resolve().parents[1]
GOALIE = ROOT / ".goalie"
LOGS = ROOT / "logs"

ISO_FMT = "%Y-%m-%dT%H:%M:%SZ"

# ROAM Risk Levels
ROAM_LEVELS = {
    "RESOLVED": 0,
    "OWNED": 1,
    "ACCEPTED": 2,
    "MITIGATED": 3
}

# Policy thresholds
POLICY_THRESHOLDS = {
    "cpu_load_critical": 100.0,
    "cpu_load_warning": 80.0,
    "memory_critical": 95.0,
    "memory_warning": 90.0,
    "wip_limit_now": 3,
    "wip_limit_next": 5,
    "opex_ratio_max": 40.0,
    "learning_ratio_warning": 100.0,
    "learning_ratio_target": 10.0,
    "blocked_item_max_hours": 48,
    "high_wsjf_threshold": 15
}


def parse_time(value: Optional[str]) -> Optional[datetime]:
    """Parse ISO8601 timestamp to naive UTC datetime"""
    if not value:
        return None
    try:
        txt = value.strip()
        if "T" not in txt:
            dt = datetime.fromisoformat(txt)
        else:
            dt = datetime.fromisoformat(txt.replace("Z", "+00:00"))
        if dt.tzinfo is not None:
            dt = dt.astimezone(tz=None).replace(tzinfo=None)
        return dt
    except Exception:
        return None


def within_range(ts: Optional[str], since: Optional[datetime]) -> bool:
    """Check if timestamp is within specified range"""
    if not ts:
        return True
    dt = parse_time(ts)
    if dt is None:
        return True
    if since and dt < since:
        return False
    return True


def read_jsonl(path: Path, since: Optional[datetime] = None) -> List[Dict[str, Any]]:
    """Read JSONL file with optional time filtering"""
    if not path.exists():
        return []
    out: List[Dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except Exception:
                continue
            ts = obj.get("timestamp")
            if within_range(ts, since):
                out.append(obj)
    return out


def read_yaml_file(path: Path) -> Dict[str, Any]:
    """Read YAML file"""
    if not path.exists() or yaml is None:
        return {}
    try:
        with path.open("r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    except Exception as e:
        print(f"Warning: Failed to read {path}: {e}")
        return {}


def write_jsonl(path: Path, data: Dict[str, Any]):
    """Append to JSONL file"""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(data) + "\n")


class PolicyViolation:
    """Represents a policy violation"""
    
    def __init__(self, policy_id: str, severity: str, description: str, 
                 roam_level: str, auto_fixable: bool = False, 
                 fix_action: Optional[str] = None):
        self.policy_id = policy_id
        self.severity = severity
        self.description = description
        self.roam_level = roam_level
        self.auto_fixable = auto_fixable
        self.fix_action = fix_action
        self.timestamp = datetime.now().strftime(ISO_FMT)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "policy_id": self.policy_id,
            "severity": self.severity,
            "description": self.description,
            "roam_level": self.roam_level,
            "auto_fixable": self.auto_fixable,
            "fix_action": self.fix_action,
            "timestamp": self.timestamp
        }


class RootCauseAnalysis:
    """5 Whys root cause analysis"""
    
    def __init__(self, incident: Dict[str, Any]):
        self.incident = incident
        self.whys = []
        self.root_cause = None
    
    def analyze(self) -> Dict[str, Any]:
        """Perform 5 Whys analysis"""
        incident_type = self.incident.get("type", "unknown")
        
        # Pattern-based RCA for common incident types
        if incident_type == "rate_limited":
            self.whys = [
                "Why was rate limiting triggered?",
                "Why did the system exceed the configured rate limit?",
                "Why was the workload higher than expected?",
                "Why wasn't the rate limit adjusted proactively?",
                "Why is there no predictive throttling based on workload trends?"
            ]
            self.root_cause = "Lack of predictive workload management and dynamic rate limit adjustment"
        
        elif incident_type == "wip_violation":
            self.whys = [
                "Why did WIP exceed the limit?",
                "Why were too many items started simultaneously?",
                "Why wasn't work completion prioritized?",
                "Why are blocked items not being removed from WIP?",
                "Why is there no automated WIP enforcement?"
            ]
            self.root_cause = "Missing automated WIP enforcement and blocked item management"
        
        elif incident_type == "cpu_overload":
            self.whys = [
                "Why did CPU load exceed 100%?",
                "Why are too many concurrent operations running?",
                "Why isn't the process governor throttling effectively?",
                "Why are resource-intensive operations not queued?",
                "Why is there no circuit breaker for CPU-heavy tasks?"
            ]
            self.root_cause = "Ineffective process governor throttling and lack of resource-aware queuing"
        
        else:
            self.whys = [
                f"Why did {incident_type} occur?",
                "Why wasn't this prevented by existing safeguards?",
                "Why are safeguards insufficient?",
                "Why aren't we learning from similar past incidents?",
                "Why is there no proactive detection?"
            ]
            self.root_cause = "Generic failure: insufficient safeguards and learning mechanisms"
        
        return {
            "incident_type": incident_type,
            "timestamp": self.incident.get("timestamp"),
            "whys": self.whys,
            "root_cause": self.root_cause,
            "remediation": self._suggest_remediation(incident_type)
        }
    
    def _suggest_remediation(self, incident_type: str) -> str:
        """Suggest remediation based on root cause"""
        remediations = {
            "rate_limited": "Implement predictive rate limiting with workload forecasting",
            "wip_violation": "Add automated WIP enforcement with blocked item detection",
            "cpu_overload": "Enhance process governor with circuit breaker pattern",
            "default": "Review and strengthen safeguards; implement learning from incidents"
        }
        return remediations.get(incident_type, remediations["default"])


class GovernanceAgent:
    """Main governance agent orchestrator"""
    
    def __init__(self, since: Optional[datetime] = None, dry_run: bool = False):
        self.since = since
        self.dry_run = dry_run
        self.violations: List[PolicyViolation] = []
        self.insights: List[Dict[str, Any]] = []
        
        # Load data
        self.kanban = self._load_kanban()
        self.pattern_metrics = self._load_pattern_metrics()
        self.governor_incidents = self._load_governor_incidents()
        self.learning_events = self._load_learning_events()
        self.metrics_log = self._load_metrics_log()
    
    def _load_kanban(self) -> Dict[str, Any]:
        return read_yaml_file(GOALIE / "KANBAN_BOARD.yaml")
    
    def _load_pattern_metrics(self) -> List[Dict[str, Any]]:
        return read_jsonl(GOALIE / "pattern_metrics_append.jsonl", self.since)
    
    def _load_governor_incidents(self) -> List[Dict[str, Any]]:
        return read_jsonl(LOGS / "governor_incidents.jsonl", self.since)
    
    def _load_learning_events(self) -> List[Dict[str, Any]]:
        learning_dir = LOGS / "learning"
        if learning_dir.exists():
            return read_jsonl(learning_dir / "events.jsonl", self.since)
        return []
    
    def _load_metrics_log(self) -> List[Dict[str, Any]]:
        return read_jsonl(GOALIE / "metrics_log.jsonl", self.since)
    
    def check_wip_limits(self):
        """Check WIP limit violations"""
        columns = self.kanban.get("columns", {})
        
        # Check NOW column
        now_items = columns.get("NOW", {}).get("items", [])
        now_limit = columns.get("NOW", {}).get("wip_limit", POLICY_THRESHOLDS["wip_limit_now"])
        
        if len(now_items) > now_limit:
            violation = PolicyViolation(
                policy_id="WIP_NOW_EXCEEDED",
                severity="HIGH",
                description=f"NOW column has {len(now_items)} items, exceeding limit of {now_limit}",
                roam_level="OWNED",
                auto_fixable=False,
                fix_action="Review and move items to NEXT or complete existing work"
            )
            self.violations.append(violation)
        
        # Check NEXT column
        next_items = columns.get("NEXT", {}).get("items", [])
        next_limit = columns.get("NEXT", {}).get("wip_limit", POLICY_THRESHOLDS["wip_limit_next"])
        
        if len(next_items) > next_limit:
            violation = PolicyViolation(
                policy_id="WIP_NEXT_EXCEEDED",
                severity="MEDIUM",
                description=f"NEXT column has {len(next_items)} items, exceeding limit of {next_limit}",
                roam_level="ACCEPTED",
                auto_fixable=False,
                fix_action="Prioritize and defer low-priority items to LATER"
            )
            self.violations.append(violation)
    
    def check_blocked_items(self):
        """Check for items blocked too long"""
        columns = self.kanban.get("columns", {})
        now_items = columns.get("NOW", {}).get("items", [])
        
        now = datetime.now()
        max_hours = POLICY_THRESHOLDS["blocked_item_max_hours"]
        
        for item in now_items:
            if item.get("status") == "BLOCKED":
                blocked_at = parse_time(item.get("blocked_at"))
                if blocked_at:
                    hours_blocked = (now - blocked_at).total_seconds() / 3600
                    if hours_blocked > max_hours:
                        violation = PolicyViolation(
                            policy_id="BLOCKED_TOO_LONG",
                            severity="CRITICAL",
                            description=f"Item '{item.get('title')}' blocked for {hours_blocked:.1f}h (>{max_hours}h)",
                            roam_level="OWNED",
                            auto_fixable=False,
                            fix_action="Escalate blocker or move to LATER"
                        )
                        self.violations.append(violation)
    
    def check_cpu_memory(self):
        """Check CPU and memory violations"""
        if not self.metrics_log:
            return
        
        latest = self.metrics_log[-1]
        cpu_load = latest.get("cpu", {}).get("load_pct", 0)
        memory_pct = latest.get("memory", {}).get("used_pct", 0)
        
        # Critical CPU
        if cpu_load > POLICY_THRESHOLDS["cpu_load_critical"]:
            violation = PolicyViolation(
                policy_id="CPU_CRITICAL",
                severity="CRITICAL",
                description=f"CPU load at {cpu_load:.1f}% (critical threshold: {POLICY_THRESHOLDS['cpu_load_critical']}%)",
                roam_level="MITIGATED",
                auto_fixable=True,
                fix_action="Reduce AF_MAX_WIP and increase AF_CPU_HEADROOM_TARGET"
            )
            self.violations.append(violation)
        
        # Warning CPU
        elif cpu_load > POLICY_THRESHOLDS["cpu_load_warning"]:
            violation = PolicyViolation(
                policy_id="CPU_WARNING",
                severity="MEDIUM",
                description=f"CPU load at {cpu_load:.1f}% (warning threshold: {POLICY_THRESHOLDS['cpu_load_warning']}%)",
                roam_level="ACCEPTED",
                auto_fixable=False,
                fix_action="Monitor and prepare to throttle if continues"
            )
            self.violations.append(violation)
        
        # Critical memory
        if memory_pct > POLICY_THRESHOLDS["memory_critical"]:
            violation = PolicyViolation(
                policy_id="MEMORY_CRITICAL",
                severity="CRITICAL",
                description=f"Memory at {memory_pct:.1f}% (critical threshold: {POLICY_THRESHOLDS['memory_critical']}%)",
                roam_level="OWNED",
                auto_fixable=False,
                fix_action="Clear caches, restart services, or scale up memory"
            )
            self.violations.append(violation)
    
    def check_learning_capture_ratio(self):
        """Check learning capture ratio"""
        if not self.learning_events:
            return
        
        command_count = len([e for e in self.learning_events if e.get("type") == "command"])
        learning_count = len([e for e in self.learning_events if e.get("type") == "learning_capture"])
        
        if learning_count == 0:
            return
        
        capture_ratio = command_count / learning_count
        
        if capture_ratio > POLICY_THRESHOLDS["learning_ratio_warning"]:
            violation = PolicyViolation(
                policy_id="LEARNING_RATIO_HIGH",
                severity="MEDIUM",
                description=f"Learning capture ratio is {capture_ratio:.1f}:1 (warning: >{POLICY_THRESHOLDS['learning_ratio_warning']}:1)",
                roam_level="ACCEPTED",
                auto_fixable=True,
                fix_action="Increase AGENTDB_CAPTURE frequency or expand hook coverage"
            )
            self.violations.append(violation)
    
    def check_high_wsjf_in_later(self):
        """Check for high-priority items stuck in LATER"""
        columns = self.kanban.get("columns", {})
        later_items = columns.get("LATER", {}).get("items", [])
        
        high_wsjf = [item for item in later_items 
                     if item.get("wsjf_score", 0) > POLICY_THRESHOLDS["high_wsjf_threshold"]]
        
        if high_wsjf:
            violation = PolicyViolation(
                policy_id="HIGH_WSJF_STUCK",
                severity="MEDIUM",
                description=f"{len(high_wsjf)} high-priority items (WSJF>{POLICY_THRESHOLDS['high_wsjf_threshold']}) stuck in LATER",
                roam_level="OWNED",
                auto_fixable=False,
                fix_action="Review and promote high-WSJF items to NEXT"
            )
            self.violations.append(violation)
    
    def perform_rca_on_incidents(self):
        """Perform RCA on recent governor incidents"""
        for incident in self.governor_incidents[-5:]:  # Last 5 incidents
            rca = RootCauseAnalysis(incident)
            analysis = rca.analyze()
            
            insight = {
                "type": "rca",
                "timestamp": datetime.now().strftime(ISO_FMT),
                "incident_id": incident.get("id"),
                "analysis": analysis
            }
            self.insights.append(insight)
    
    def calculate_economic_risk_score(self) -> Dict[str, Any]:
        """Calculate economic risk score (ROAM framework)"""
        risk_score = 0
        risk_items = []
        
        for violation in self.violations:
            severity_weights = {"CRITICAL": 10, "HIGH": 5, "MEDIUM": 2, "LOW": 1}
            weight = severity_weights.get(violation.severity, 1)
            risk_score += weight
            
            risk_items.append({
                "policy_id": violation.policy_id,
                "severity": violation.severity,
                "roam_level": violation.roam_level,
                "weight": weight
            })
        
        # Calculate ROAM distribution
        roam_counts = Counter(v.roam_level for v in self.violations)
        
        return {
            "total_risk_score": risk_score,
            "violation_count": len(self.violations),
            "roam_distribution": dict(roam_counts),
            "risk_items": risk_items,
            "risk_level": self._classify_risk_level(risk_score)
        }
    
    def _classify_risk_level(self, score: int) -> str:
        """Classify overall risk level"""
        if score >= 30:
            return "CRITICAL"
        elif score >= 15:
            return "HIGH"
        elif score >= 5:
            return "MEDIUM"
        else:
            return "LOW"
    
    def auto_apply_fixes(self) -> List[Dict[str, Any]]:
        """Auto-apply safe fixes for violations"""
        applied_fixes = []
        
        for violation in self.violations:
            if not violation.auto_fixable:
                continue
            
            if self.dry_run:
                applied_fixes.append({
                    "policy_id": violation.policy_id,
                    "action": violation.fix_action,
                    "status": "DRY_RUN",
                    "timestamp": datetime.now().strftime(ISO_FMT)
                })
            else:
                # Apply actual fixes
                success = self._apply_fix(violation)
                applied_fixes.append({
                    "policy_id": violation.policy_id,
                    "action": violation.fix_action,
                    "status": "APPLIED" if success else "FAILED",
                    "timestamp": datetime.now().strftime(ISO_FMT)
                })
        
        return applied_fixes
    
    def _apply_fix(self, violation: PolicyViolation) -> bool:
        """Apply a specific fix"""
        # Placeholder for actual fix application
        # In production, this would modify config files, environment variables, etc.
        
        if violation.policy_id == "CPU_CRITICAL":
            # Example: Write recommended settings to a file
            recommendations_file = GOALIE / "auto_fix_recommendations.yaml"
            recommendations = {
                "AF_MAX_WIP": 2,
                "AF_CPU_HEADROOM_TARGET": 50,
                "AF_TOKENS_PER_SECOND": 5,
                "applied_at": datetime.now().strftime(ISO_FMT),
                "reason": "CPU critical threshold exceeded"
            }
            
            if yaml:
                with recommendations_file.open("w") as f:
                    yaml.dump(recommendations, f)
                return True
        
        elif violation.policy_id == "LEARNING_RATIO_HIGH":
            # Example: Write capture frequency recommendation
            recommendations_file = GOALIE / "auto_fix_recommendations.yaml"
            recommendations = {
                "AGENTDB_CAPTURE": "high",
                "AGENTDB_SCOPE": "all",
                "applied_at": datetime.now().strftime(ISO_FMT),
                "reason": "Learning capture ratio too high"
            }
            
            if yaml:
                with recommendations_file.open("w") as f:
                    yaml.dump(recommendations, f)
                return True
        
        return False
    
    def generate_action_items(self) -> List[Dict[str, Any]]:
        """Generate action items for KANBAN_BOARD.yaml"""
        action_items = []
        
        for violation in self.violations:
            if violation.severity in ["CRITICAL", "HIGH"]:
                # Calculate WSJF
                severity_cod = {"CRITICAL": 20, "HIGH": 10, "MEDIUM": 5, "LOW": 2}
                cost_of_delay = severity_cod.get(violation.severity, 5)
                job_size = 2 if violation.auto_fixable else 5
                wsjf_score = cost_of_delay / job_size
                
                action_item = {
                    "id": f"GOV-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    "title": f"Fix {violation.policy_id}: {violation.description}",
                    "priority": violation.severity,
                    "wsjf_score": wsjf_score,
                    "cost_of_delay": cost_of_delay,
                    "job_size": job_size,
                    "status": "PENDING",
                    "source": "governance_agent",
                    "fix_action": violation.fix_action,
                    "created_at": datetime.now().strftime(ISO_FMT)
                }
                action_items.append(action_item)
        
        return action_items
    
    def run(self) -> Dict[str, Any]:
        """Execute governance agent workflow"""
        print("🔍 Running Governance Agent...")
        
        # Policy checks
        print("  ✓ Checking WIP limits...")
        self.check_wip_limits()
        
        print("  ✓ Checking blocked items...")
        self.check_blocked_items()
        
        print("  ✓ Checking CPU/Memory...")
        self.check_cpu_memory()
        
        print("  ✓ Checking learning capture ratio...")
        self.check_learning_capture_ratio()
        
        print("  ✓ Checking high-priority items...")
        self.check_high_wsjf_in_later()
        
        # RCA
        print("  ✓ Performing RCA on incidents...")
        self.perform_rca_on_incidents()
        
        # Risk scoring
        print("  ✓ Calculating economic risk score...")
        risk_score = self.calculate_economic_risk_score()
        
        # Auto-fix
        print("  ✓ Applying auto-fixes...")
        applied_fixes = self.auto_apply_fixes()
        
        # Action items
        print("  ✓ Generating action items...")
        action_items = self.generate_action_items()
        
        # Output results
        results = {
            "timestamp": datetime.now().strftime(ISO_FMT),
            "since": self.since.strftime(ISO_FMT) if self.since else None,
            "violations": [v.to_dict() for v in self.violations],
            "insights": self.insights,
            "risk_score": risk_score,
            "applied_fixes": applied_fixes,
            "action_items": action_items,
            "summary": {
                "total_violations": len(self.violations),
                "critical_violations": len([v for v in self.violations if v.severity == "CRITICAL"]),
                "auto_fixed": len([f for f in applied_fixes if f["status"] == "APPLIED"]),
                "action_items_generated": len(action_items)
            }
        }
        
        # Write insights to file
        if not self.dry_run:
            insights_file = GOALIE / "governance_insights.jsonl"
            write_jsonl(insights_file, results)
            print(f"\n📝 Insights written to {insights_file}")
        else:
            print("\n🔍 DRY RUN - No changes written")
        
        return results


def main():
    parser = argparse.ArgumentParser(description="Governance Agent for Agentic Flow")
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    
    # Run command
    run_parser = subparsers.add_parser("run", help="Run governance agent")
    run_parser.add_argument("--since", type=str, help="Filter events since ISO8601 timestamp")
    run_parser.add_argument("--dry-run", action="store_true", help="Dry run mode - don't apply fixes")
    run_parser.add_argument("--json", action="store_true", help="Output as JSON")
    
    args = parser.parse_args()
    
    if args.command == "run":
        since = parse_time(args.since) if args.since else None
        agent = GovernanceAgent(since=since, dry_run=args.dry_run)
        results = agent.run()
        
        if args.json:
            print(json.dumps(results, indent=2))
        else:
            # Pretty print summary
            print("\n" + "=" * 80)
            print("📊 Governance Agent Summary")
            print("=" * 80)
            print(f"  Total Violations: {results['summary']['total_violations']}")
            print(f"  Critical: {results['summary']['critical_violations']}")
            print(f"  Auto-Fixed: {results['summary']['auto_fixed']}")
            print(f"  Action Items: {results['summary']['action_items_generated']}")
            print(f"  Risk Level: {results['risk_score']['risk_level']}")
            print(f"  Risk Score: {results['risk_score']['total_risk_score']}")
            print("=" * 80 + "\n")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
