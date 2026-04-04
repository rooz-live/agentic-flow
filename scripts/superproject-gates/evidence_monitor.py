#!/usr/bin/env python3
"""
Evidence Trail Monitor
Provides comprehensive evidence trail monitoring and validation system
for production workflows and governance compliance.
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional, Set
from enum import Enum


class EvidenceValidationStatus(Enum):
    """Evidence validation statuses"""
    PENDING = "pending"
    VALIDATING = "validating"
    VALID = "valid"
    INVALID = "invalid"
    EXPIRED = "expired"


class EvidenceMonitor:
    """Evidence trail monitoring and validation system"""

    def __init__(self, goalie_dir: Optional[str] = None):
        self.goalie_dir = Path(goalie_dir) if goalie_dir else Path(".goalie")
        self.evidence_dir = self.goalie_dir / "evidence"
        self.evidence_dir.mkdir(exist_ok=True)

        # Evidence file paths
        self.unified_evidence_file = self.goalie_dir / "unified_evidence.jsonl"
        self.economic_evidence_file = self.goalie_dir / "economic_compounding.jsonl"
        self.performance_evidence_file = self.goalie_dir / "performance_metrics.jsonl"
        self.maturity_evidence_file = self.goalie_dir / "maturity_coverage.jsonl"
        self.observability_evidence_file = self.goalie_dir / "observability_gaps.jsonl"
        self.governance_evidence_file = self.goalie_dir / "governance_compliance.jsonl"

        # Evidence type mappings
        self.evidence_files = {
            "unified": self.unified_evidence_file,
            "economic": self.economic_evidence_file,
            "performance": self.performance_evidence_file,
            "maturity": self.maturity_evidence_file,
            "observability": self.observability_evidence_file,
            "governance": self.governance_evidence_file
        }

    def collect_evidence_trails(self, evidence_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Collect evidence trails from all sources"""
        all_evidence = []

        files_to_check = [self.evidence_files[evidence_type]] if evidence_type else self.evidence_files.values()

        for evidence_file in files_to_check:
            if evidence_file.exists():
                try:
                    with open(evidence_file, 'r') as f:
                        for line in f:
                            line = line.strip()
                            if line:
                                try:
                                    evidence = json.loads(line)
                                    all_evidence.append(evidence)
                                except json.JSONDecodeError:
                                    continue
                except IOError:
                    continue

        # Sort by timestamp (most recent first)
        all_evidence.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return all_evidence

    def validate_evidence_completeness(self, run_id: Optional[str] = None) -> Dict[str, Any]:
        """Validate evidence trail completeness for production workflows"""
        evidence_trails = self.collect_evidence_trails()

        if run_id:
            evidence_trails = [e for e in evidence_trails if e.get("run_id") == run_id]

        # Required evidence types for complete production cycle
        required_types = {
            "economic": ["revenue_impact", "cost_savings", "roi_calculation"],
            "performance": ["latency_metrics", "throughput_metrics", "error_rates"],
            "maturity": ["coverage_percentage", "tier_depth_analysis", "pattern_maturity"],
            "observability": ["gap_analysis", "monitoring_coverage", "alert_effectiveness"],
            "governance": ["compliance_check", "audit_trail", "policy_adherence"]
        }

        # Analyze present evidence
        present_types = {}
        validation_results = {}

        for evidence in evidence_trails:
            evidence_type = evidence.get("type", "unknown")
            if evidence_type not in present_types:
                present_types[evidence_type] = []

            present_types[evidence_type].append(evidence)

        # Validate each required type
        for req_type, req_subtypes in required_types.items():
            if req_type in present_types:
                found_subtypes = set()
                for evidence in present_types[req_type]:
                    content = evidence.get("content", {})
                    for subtype in req_subtypes:
                        if subtype in content:
                            found_subtypes.add(subtype)

                completeness = len(found_subtypes) / len(req_subtypes) * 100
                validation_results[req_type] = {
                    "status": "complete" if completeness == 100 else "partial",
                    "completeness_percentage": completeness,
                    "found_subtypes": list(found_subtypes),
                    "missing_subtypes": [st for st in req_subtypes if st not in found_subtypes],
                    "evidence_count": len(present_types[req_type])
                }
            else:
                validation_results[req_type] = {
                    "status": "missing",
                    "completeness_percentage": 0,
                    "found_subtypes": [],
                    "missing_subtypes": req_subtypes,
                    "evidence_count": 0
                }

        # Overall validation
        total_completeness = sum(v["completeness_percentage"] for v in validation_results.values()) / len(required_types)

        return {
            "run_id": run_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "overall_completeness": total_completeness,
            "overall_status": "complete" if total_completeness == 100 else "incomplete",
            "evidence_types_present": list(present_types.keys()),
            "evidence_types_missing": [t for t in required_types.keys() if t not in present_types],
            "total_evidence_count": len(evidence_trails),
            "validation_details": validation_results
        }

    def monitor_evidence_freshness(self, max_age_hours: int = 24) -> Dict[str, Any]:
        """Monitor evidence freshness and identify stale evidence"""
        evidence_trails = self.collect_evidence_trails()
        now = datetime.now(timezone.utc)

        fresh_evidence = []
        stale_evidence = []
        invalid_timestamps = []

        for evidence in evidence_trails:
            timestamp_str = evidence.get("timestamp")
            if not timestamp_str:
                invalid_timestamps.append(evidence)
                continue

            try:
                timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                age_hours = (now - timestamp).total_seconds() / 3600

                if age_hours <= max_age_hours:
                    fresh_evidence.append({
                        **evidence,
                        "age_hours": age_hours
                    })
                else:
                    stale_evidence.append({
                        **evidence,
                        "age_hours": age_hours
                    })
            except (ValueError, TypeError):
                invalid_timestamps.append(evidence)

        return {
            "timestamp": now.isoformat(),
            "max_age_hours": max_age_hours,
            "fresh_evidence_count": len(fresh_evidence),
            "stale_evidence_count": len(stale_evidence),
            "invalid_timestamps_count": len(invalid_timestamps),
            "freshness_percentage": (len(fresh_evidence) / len(evidence_trails) * 100) if evidence_trails else 0,
            "stale_evidence": stale_evidence[:10],  # Last 10 stale entries
            "invalid_timestamps": invalid_timestamps[:5]  # First 5 invalid
        }

    def generate_evidence_report(self, run_id: Optional[str] = None,
                               format_type: str = "text") -> str:
        """Generate comprehensive evidence report"""
        completeness = self.validate_evidence_completeness(run_id)
        freshness = self.monitor_evidence_freshness()

        if format_type == "json":
            return json.dumps({
                "completeness_validation": completeness,
                "freshness_monitoring": freshness
            }, indent=2, default=str)

        elif format_type == "text":
            output = []
            output.append("=" * 60)
            output.append("EVIDENCE TRAIL REPORT")
            output.append("=" * 60)
            output.append(f"Generated: {datetime.now(timezone.utc).isoformat()}")
            output.append(f"Run ID: {run_id or 'All Runs'}")
            output.append("")

            # Completeness Summary
            output.append("COMPLETENESS VALIDATION:")
            output.append(f"  Overall Status: {completeness['overall_status'].upper()}")
            output.append(".1f")
            output.append(f"  Evidence Types Present: {len(completeness['evidence_types_present'])}")
            output.append(f"  Evidence Types Missing: {len(completeness['evidence_types_missing'])}")
            output.append(f"  Total Evidence Count: {completeness['total_evidence_count']}")
            output.append("")

            # Evidence Types Details
            output.append("EVIDENCE TYPES:")
            for ev_type, details in completeness['validation_details'].items():
                status_icon = "✅" if details['status'] == 'complete' else "⚠️" if details['status'] == 'partial' else "❌"
                output.append(f"  {status_icon} {ev_type.upper()}: {details['status']} "
                             ".1f"
                             f"({details['evidence_count']} entries)")

                if details['missing_subtypes']:
                    output.append(f"    Missing: {', '.join(details['missing_subtypes'])}")
            output.append("")

            # Freshness Summary
            output.append("FRESHNESS MONITORING:")
            output.append(f"  Fresh Evidence: {freshness['fresh_evidence_count']}")
            output.append(f"  Stale Evidence: {freshness['stale_evidence_count']}")
            output.append(f"  Invalid Timestamps: {freshness['invalid_timestamps_count']}")
            output.append(".1f")
            output.append("")

            return "\n".join(output)

        else:
            return str(completeness)

    def audit_evidence_integrity(self) -> Dict[str, Any]:
        """Audit evidence integrity and detect anomalies"""
        evidence_trails = self.collect_evidence_trails()

        integrity_issues = {
            "missing_timestamps": [],
            "invalid_json": [],
            "duplicate_ids": [],
            "missing_required_fields": [],
            "suspicious_timestamps": []
        }

        seen_ids = set()
        now = datetime.now(timezone.utc)

        for evidence in evidence_trails:
            # Check for missing timestamp
            if not evidence.get("timestamp"):
                integrity_issues["missing_timestamps"].append(evidence.get("id", "unknown"))

            # Check for duplicate IDs
            evidence_id = evidence.get("id")
            if evidence_id:
                if evidence_id in seen_ids:
                    integrity_issues["duplicate_ids"].append(evidence_id)
                else:
                    seen_ids.add(evidence_id)

            # Check for suspicious timestamps (future dates)
            timestamp_str = evidence.get("timestamp")
            if timestamp_str:
                try:
                    timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                    if timestamp > now:
                        integrity_issues["suspicious_timestamps"].append({
                            "id": evidence_id,
                            "timestamp": timestamp_str
                        })
                except (ValueError, TypeError):
                    pass

            # Check for required fields based on type
            evidence_type = evidence.get("type")
            content = evidence.get("content", {})
            if evidence_type == "economic" and not any(k in content for k in ["revenue_impact", "cost_savings"]):
                integrity_issues["missing_required_fields"].append({
                    "id": evidence_id,
                    "type": evidence_type,
                    "missing": "revenue_impact or cost_savings"
                })

        return {
            "timestamp": now.isoformat(),
            "total_evidence_checked": len(evidence_trails),
            "integrity_score": ((len(evidence_trails) - sum(len(v) for v in integrity_issues.values())) /
                              len(evidence_trails) * 100) if evidence_trails else 100,
            "issues_found": sum(len(v) for v in integrity_issues.values()),
            "issues": integrity_issues
        }

    def get_evidence_gaps(self, run_id: Optional[str] = None) -> Dict[str, Any]:
        """Identify evidence gaps for governance compliance"""
        validation = self.validate_evidence_completeness(run_id)

        gaps = {
            "critical_gaps": [],
            "warning_gaps": [],
            "missing_evidence_types": validation["evidence_types_missing"],
            "incomplete_evidence_types": []
        }

        for ev_type, details in validation["validation_details"].items():
            if details["status"] == "missing":
                gaps["critical_gaps"].append({
                    "type": ev_type,
                    "severity": "critical",
                    "description": f"No {ev_type} evidence found",
                    "missing_subtypes": details["missing_subtypes"]
                })
            elif details["status"] == "partial":
                severity = "critical" if details["completeness_percentage"] < 50 else "warning"
                gaps[f"{severity}_gaps"].append({
                    "type": ev_type,
                    "severity": severity,
                    "description": f"Partial {ev_type} evidence",
                    "completeness": details["completeness_percentage"],
                    "missing_subtypes": details["missing_subtypes"]
                })
                gaps["incomplete_evidence_types"].append(ev_type)

        return {
            "run_id": run_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "total_gaps": len(gaps["critical_gaps"]) + len(gaps["warning_gaps"]),
            "critical_gap_count": len(gaps["critical_gaps"]),
            "warning_gap_count": len(gaps["warning_gaps"]),
            **gaps
        }


def main():
    """CLI interface for evidence monitor"""
    import argparse

    parser = argparse.ArgumentParser(description="Evidence Trail Monitor")
    parser.add_argument("action", choices=[
        "collect", "validate", "freshness", "report", "audit", "gaps"
    ], help="Action to perform")
    parser.add_argument("--run-id", help="Specific run ID to analyze")
    parser.add_argument("--evidence-type", help="Specific evidence type to analyze")
    parser.add_argument("--max-age-hours", type=int, default=24,
                       help="Maximum age in hours for freshness check")
    parser.add_argument("--format", default="text", choices=["text", "json"],
                       help="Output format")

    args = parser.parse_args()

    monitor = EvidenceMonitor()

    try:
        if args.action == "collect":
            evidence = monitor.collect_evidence_trails(args.evidence_type)
            if args.format == "json":
                print(json.dumps(evidence, indent=2, default=str))
            else:
                print(f"Collected {len(evidence)} evidence trails")
                for ev in evidence[:5]:  # Show first 5
                    print(f"  {ev.get('type', 'unknown')}: {ev.get('timestamp', 'no timestamp')}")

        elif args.action == "validate":
            validation = monitor.validate_evidence_completeness(args.run_id)
            if args.format == "json":
                print(json.dumps(validation, indent=2, default=str))
            else:
                print(f"Evidence completeness: {validation['overall_completeness']:.1f}%")
                print(f"Status: {validation['overall_status']}")
                print(f"Missing types: {', '.join(validation['evidence_types_missing'])}")

        elif args.action == "freshness":
            freshness = monitor.monitor_evidence_freshness(args.max_age_hours)
            if args.format == "json":
                print(json.dumps(freshness, indent=2, default=str))
            else:
                print(f"Fresh evidence: {freshness['fresh_evidence_count']}")
                print(f"Stale evidence: {freshness['stale_evidence_count']}")
                print(f"Freshness: {freshness['freshness_percentage']:.1f}%")

        elif args.action == "report":
            report = monitor.generate_evidence_report(args.run_id, args.format)
            print(report)

        elif args.action == "audit":
            audit = monitor.audit_evidence_integrity()
            if args.format == "json":
                print(json.dumps(audit, indent=2, default=str))
            else:
                print(f"Integrity score: {audit['integrity_score']:.1f}%")
                print(f"Issues found: {audit['issues_found']}")

        elif args.action == "gaps":
            gaps = monitor.get_evidence_gaps(args.run_id)
            if args.format == "json":
                print(json.dumps(gaps, indent=2, default=str))
            else:
                print(f"Total gaps: {gaps['total_gaps']}")
                print(f"Critical gaps: {gaps['critical_gap_count']}")
                print(f"Warning gaps: {gaps['warning_gap_count']}")

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()