#!/usr/bin/env python3
"""
Enhanced JSON Status File Manager
Provides comprehensive status file management with standardized schema,
real-time updates, and integration with evidence emitters and pattern metrics.
"""

import argparse
import json
import os
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from enum import Enum


class StatusType(Enum):
    """Status types for production workflows"""
    INITIALIZING = "initializing"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    BLOCKED = "blocked"
    CANCELLED = "cancelled"


class EvidenceType(Enum):
    """Evidence types for trail validation"""
    ECONOMIC = "economic"
    PERFORMANCE = "performance"
    MATURITY = "maturity"
    OBSERVABILITY = "observability"
    GOVERNANCE = "governance"


@dataclass
class StatusSchema:
    """Standardized JSON schema for production status files"""
    # Core metadata
    run_id: str
    command: str
    start_time: str
    end_time: Optional[str] = None
    status: str = StatusType.INITIALIZING.value
    version: str = "1.0"

    # Workflow tracking
    steps: Dict[str, Dict[str, Any]] = None
    multipass: Dict[str, Any] = None
    evidence_trails: List[Dict[str, Any]] = None

    # Metrics and monitoring
    metrics: Dict[str, Any] = None
    health_indicators: Dict[str, Any] = None
    performance_indicators: Dict[str, Any] = None

    # Governance and compliance
    governance_status: Dict[str, Any] = None
    compliance_checks: List[Dict[str, Any]] = None

    # Environment context
    environment: Dict[str, Any] = None

    def __post_init__(self):
        if self.steps is None:
            self.steps = {}
        if self.multipass is None:
            self.multipass = {
                "enabled": False,
                "preflight_iterations": 0,
                "status": "not_started"
            }
        if self.evidence_trails is None:
            self.evidence_trails = []
        if self.metrics is None:
            self.metrics = {}
        if self.health_indicators is None:
            self.health_indicators = {}
        if self.performance_indicators is None:
            self.performance_indicators = {}
        if self.governance_status is None:
            self.governance_status = {}
        if self.compliance_checks is None:
            self.compliance_checks = []
        if self.environment is None:
            self.environment = {}


class StatusFileManager:
    """Enhanced status file manager with comprehensive schema support"""

    def __init__(self, status_file: str, auto_backup: bool = True):
        """Initialize the status file manager"""
        self.status_file = Path(status_file)
        self.backup_dir = self.status_file.parent / "backups"
        self.auto_backup = auto_backup

        if auto_backup:
            self.backup_dir.mkdir(exist_ok=True)

        self.status_data = self._load_or_create_status()

    def _load_or_create_status(self) -> StatusSchema:
        """Load existing status or create new one"""
        if self.status_file.exists():
            try:
                with open(self.status_file, 'r') as f:
                    data = json.load(f)
                return StatusSchema(**data)
            except (json.JSONDecodeError, IOError, TypeError) as e:
                print(f"Warning: Could not load status file "
                      f"{self.status_file}: {e}", file=sys.stderr)
                # Create backup of corrupted file
                if self.auto_backup:
                    backup_path = self.backup_dir / f"{self.status_file.name}.corrupted.{int(time.time())}"
                    try:
                        self.status_file.rename(backup_path)
                        print(f"Corrupted status file backed up to {backup_path}", file=sys.stderr)
                    except IOError:
                        pass

        # Create new status
        return StatusSchema(
            run_id=os.environ.get("AF_RUN_ID", str(uuid.uuid4())),
            command=os.environ.get("AF_COMMAND", "unknown"),
            start_time=datetime.now(timezone.utc).isoformat(),
            environment={
                "af_env": os.environ.get("AF_ENV", "local"),
                "af_run_id": os.environ.get("AF_RUN_ID", ""),
                "af_enable_iris_metrics": os.environ.get("AF_ENABLE_IRIS_METRICS", "0"),
                "af_prod_observability_first": os.environ.get("AF_PROD_OBSERVABILITY_FIRST", "1"),
                "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
                "working_directory": str(Path.cwd())
            }
        )

    def _save_status(self, create_backup: bool = True) -> None:
        """Save status data to file with optional backup"""
        if create_backup and self.auto_backup and self.status_file.exists():
            backup_path = self.backup_dir / f"{self.status_file.name}.{int(time.time())}"
            try:
                self.status_file.rename(backup_path)
            except IOError:
                pass  # Continue without backup if rename fails

        # Ensure directory exists
        self.status_file.parent.mkdir(parents=True, exist_ok=True)

        # Save with pretty formatting and timestamp
        status_dict = asdict(self.status_data)
        status_dict["_last_updated"] = datetime.now(timezone.utc).isoformat()

        with open(self.status_file, 'w') as f:
            json.dump(status_dict, f, indent=2, default=str)

    def initialize_run(self, command: str, run_id: Optional[str] = None) -> None:
        """Initialize a new production run"""
        self.status_data.run_id = run_id or os.environ.get("AF_RUN_ID", str(uuid.uuid4()))
        self.status_data.command = command
        self.status_data.start_time = datetime.now(timezone.utc).isoformat()
        self.status_data.end_time = None
        self.status_data.status = StatusType.RUNNING.value
        self.status_data.steps = {}
        self.status_data.metrics = {}
        self._save_status()

    def update_step(self, step_name: str, status: str, message: str = "",
                   metrics: Optional[Dict[str, Any]] = None,
                   evidence: Optional[Dict[str, Any]] = None) -> None:
        """Update the status of a specific step"""
        timestamp = datetime.now(timezone.utc).isoformat()

        if step_name not in self.status_data.steps:
            self.status_data.steps[step_name] = {}

        step_data = self.status_data.steps[step_name]
        step_data.update({
            "status": status,
            "message": message,
            "timestamp": timestamp,
            "last_updated": timestamp
        })

        # Add metrics if provided
        if metrics:
            if "metrics" not in step_data:
                step_data["metrics"] = {}
            step_data["metrics"].update(metrics)

        # Add evidence if provided
        if evidence:
            if "evidence" not in step_data:
                step_data["evidence"] = []
            step_data["evidence"].append({
                **evidence,
                "timestamp": timestamp
            })

        # Update global status based on step statuses
        self._update_global_status()
        self._save_status()

    def add_evidence_trail(self, evidence_type: str, content: Dict[str, Any],
                          source: str = "system", validation_status: str = "pending") -> None:
        """Add evidence trail entry"""
        timestamp = datetime.now(timezone.utc).isoformat()

        evidence_entry = {
            "id": str(uuid.uuid4()),
            "type": evidence_type,
            "content": content,
            "source": source,
            "validation_status": validation_status,
            "timestamp": timestamp,
            "version": "1.0"
        }

        self.status_data.evidence_trails.append(evidence_entry)
        self._save_status()

    def update_multipass_status(self, enabled: bool, preflight_iterations: int = 0,
                               status: str = "not_started") -> None:
        """Update multipass configuration and status"""
        self.status_data.multipass.update({
            "enabled": enabled,
            "preflight_iterations": preflight_iterations,
            "status": status,
            "last_updated": datetime.now(timezone.utc).isoformat()
        })
        self._save_status()

    def add_metric(self, name: str, value: Any, category: str = "general",
                  step: Optional[str] = None) -> None:
        """Add a metric to the status"""
        timestamp = datetime.now(timezone.utc).isoformat()

        metric_entry = {
            "value": value,
            "timestamp": timestamp,
            "category": category
        }

        if step:
            # Step-specific metric
            if step not in self.status_data.steps:
                self.status_data.steps[step] = {}
            if "metrics" not in self.status_data.steps[step]:
                self.status_data.steps[step]["metrics"] = {}
            self.status_data.steps[step]["metrics"][name] = metric_entry
        else:
            # Global metric
            self.status_data.metrics[name] = metric_entry

        self._save_status()

    def update_health_indicators(self, indicators: Dict[str, Any]) -> None:
        """Update system health indicators"""
        self.status_data.health_indicators.update(indicators)
        self.status_data.health_indicators["last_updated"] = datetime.now(timezone.utc).isoformat()
        self._save_status()

    def update_performance_indicators(self, indicators: Dict[str, Any]) -> None:
        """Update performance indicators"""
        self.status_data.performance_indicators.update(indicators)
        self.status_data.performance_indicators["last_updated"] = datetime.now(timezone.utc).isoformat()
        self._save_status()

    def update_governance_status(self, governance_data: Dict[str, Any]) -> None:
        """Update governance compliance status"""
        self.status_data.governance_status.update(governance_data)
        self.status_data.governance_status["last_updated"] = datetime.now(timezone.utc).isoformat()
        self._save_status()

    def add_compliance_check(self, check_name: str, status: str, details: Dict[str, Any]) -> None:
        """Add a compliance check result"""
        timestamp = datetime.now(timezone.utc).isoformat()

        compliance_entry = {
            "check_name": check_name,
            "status": status,
            "details": details,
            "timestamp": timestamp
        }

        self.status_data.compliance_checks.append(compliance_entry)
        self._save_status()

    def complete_run(self, status: str = StatusType.COMPLETED.value,
                    message: str = "") -> None:
        """Mark the production run as completed"""
        self.status_data.end_time = datetime.now(timezone.utc).isoformat()
        self.status_data.status = status

        if message:
            self.status_data.metrics["completion_message"] = message

        self._save_status()

    def get_status(self) -> Dict[str, Any]:
        """Get the current status data"""
        return asdict(self.status_data)

    def get_step_status(self, step_name: str) -> Optional[Dict[str, Any]]:
        """Get the status of a specific step"""
        return self.status_data.steps.get(step_name)

    def get_evidence_trails(self, evidence_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get evidence trails, optionally filtered by type"""
        trails = self.status_data.evidence_trails
        if evidence_type:
            trails = [t for t in trails if t.get("type") == evidence_type]
        return trails

    def validate_evidence_completeness(self) -> Dict[str, Any]:
        """Validate evidence trail completeness"""
        required_types = [e.value for e in EvidenceType]
        present_types = set(t.get("type") for t in self.status_data.evidence_trails)

        validation = {
            "required_types": required_types,
            "present_types": list(present_types),
            "missing_types": [t for t in required_types if t not in present_types],
            "completeness_score": len(present_types) / len(required_types) * 100,
            "is_complete": len(present_types) == len(required_types)
        }

        return validation

    def generate_summary(self) -> Dict[str, Any]:
        """Generate a comprehensive summary of the production run"""
        steps = self.status_data.steps

        summary = {
            "run_id": self.status_data.run_id,
            "command": self.status_data.command,
            "status": self.status_data.status,
            "start_time": self.status_data.start_time,
            "end_time": self.status_data.end_time,
            "version": self.status_data.version,
            "total_steps": len(steps),
            "completed_steps": len([s for s in steps.values() if s.get("status") == "completed"]),
            "failed_steps": len([s for s in steps.values() if s.get("status") == "failed"]),
            "running_steps": len([s for s in steps.values() if s.get("status") == "running"]),
            "multipass_enabled": self.status_data.multipass.get("enabled", False),
            "evidence_trails_count": len(self.status_data.evidence_trails),
            "compliance_checks_count": len(self.status_data.compliance_checks)
        }

        # Calculate duration if both start and end times are available
        if summary["start_time"] and summary["end_time"]:
            try:
                start = datetime.fromisoformat(summary["start_time"])
                end = datetime.fromisoformat(summary["end_time"])
                summary["duration_seconds"] = (end - start).total_seconds()
            except (ValueError, TypeError):
                pass

        # Evidence completeness
        evidence_validation = self.validate_evidence_completeness()
        summary["evidence_completeness"] = evidence_validation

        return summary

    def _update_global_status(self) -> None:
        """Update the global status based on step statuses"""
        steps = self.status_data.steps

        # Check for failed steps
        failed_steps = [name for name, data in steps.items() if data.get("status") == "failed"]
        if failed_steps:
            self.status_data.status = StatusType.FAILED.value
            return

        # Check for running steps
        running_steps = [name for name, data in steps.items() if data.get("status") == "running"]
        if running_steps:
            self.status_data.status = StatusType.RUNNING.value
            return

        # If no failed or running steps, check if all are completed
        if steps and all(data.get("status") == "completed" for data in steps.values()):
            self.status_data.status = StatusType.COMPLETED.value

    def export_status(self, format_type: str = "json") -> str:
        """Export status data in specified format"""
        if format_type == "json":
            return json.dumps(asdict(self.status_data), indent=2, default=str)
        elif format_type == "compact":
            summary = self.generate_summary()
            return json.dumps(summary, indent=2, default=str)
        else:
            return str(asdict(self.status_data))


def main():
    """CLI entry point for the status file manager"""
    parser = argparse.ArgumentParser(description="Enhanced JSON Status File Manager")
    parser.add_argument("action", choices=[
        "initialize", "update-step", "add-evidence", "add-metric",
        "update-health", "update-performance", "update-governance",
        "add-compliance", "complete", "status", "summary", "validate-evidence", "export"
    ], help="Action to perform")
    parser.add_argument("--status-file", default=".goalie/prod_status_current.json",
                        help="Path to the status file")
    parser.add_argument("--run-id", help="Run ID for initialization")
    parser.add_argument("--command", help="Command name for initialization")
    parser.add_argument("--step", help="Step name for update-step action")
    parser.add_argument("--step-status", help="Step status for update-step action")
    parser.add_argument("--message", help="Message for update-step action")
    parser.add_argument("--metrics", help="JSON string of metrics for update-step action")
    parser.add_argument("--evidence-type", help="Evidence type for add-evidence action")
    parser.add_argument("--evidence-content", help="JSON string of evidence content")
    parser.add_argument("--metric-name", help="Metric name for add-metric action")
    parser.add_argument("--metric-value", help="Metric value for add-metric action")
    parser.add_argument("--metric-category", default="general", help="Metric category")
    parser.add_argument("--health-indicators", help="JSON string of health indicators")
    parser.add_argument("--performance-indicators", help="JSON string of performance indicators")
    parser.add_argument("--governance-data", help="JSON string of governance data")
    parser.add_argument("--check-name", help="Compliance check name")
    parser.add_argument("--check-status", help="Compliance check status")
    parser.add_argument("--check-details", help="JSON string of compliance check details")
    parser.add_argument("--global-status", help="Global status for complete action")
    parser.add_argument("--completion-message", help="Completion message")
    parser.add_argument("--format", default="json", choices=["json", "compact"],
                        help="Export format")

    args = parser.parse_args()

    # Initialize status manager
    manager = StatusFileManager(args.status_file)

    try:
        if args.action == "initialize":
            command = args.command or "unknown"
            manager.initialize_run(command, args.run_id)
            print(f"Initialized production status for command: {command}")

        elif args.action == "update-step":
            if not args.step or not args.step_status:
                print("Error: --step and --step-status are required for update-step action", file=sys.stderr)
                sys.exit(1)

            metrics = None
            if args.metrics:
                try:
                    metrics = json.loads(args.metrics)
                except json.JSONDecodeError as e:
                    print(f"Error parsing metrics JSON: {e}", file=sys.stderr)
                    sys.exit(1)

            manager.update_step(args.step, args.step_status, args.message or "", metrics)
            print(f"Updated step '{args.step}' status to '{args.step_status}'")

        elif args.action == "add-evidence":
            if not args.evidence_type or not args.evidence_content:
                print("Error: --evidence-type and --evidence-content are required", file=sys.stderr)
                sys.exit(1)

            try:
                content = json.loads(args.evidence_content)
            except json.JSONDecodeError as e:
                print(f"Error parsing evidence content JSON: {e}", file=sys.stderr)
                sys.exit(1)

            manager.add_evidence_trail(args.evidence_type, content)
            print(f"Added evidence trail of type '{args.evidence_type}'")

        elif args.action == "add-metric":
            if not args.metric_name:
                print("Error: --metric-name is required", file=sys.stderr)
                sys.exit(1)

            manager.add_metric(args.metric_name, args.metric_value, args.metric_category)
            print(f"Added metric '{args.metric_name}' = {args.metric_value}")

        elif args.action == "update-health":
            if not args.health_indicators:
                print("Error: --health-indicators is required", file=sys.stderr)
                sys.exit(1)

            try:
                indicators = json.loads(args.health_indicators)
            except json.JSONDecodeError as e:
                print(f"Error parsing health indicators JSON: {e}", file=sys.stderr)
                sys.exit(1)

            manager.update_health_indicators(indicators)
            print("Updated health indicators")

        elif args.action == "update-performance":
            if not args.performance_indicators:
                print("Error: --performance-indicators is required", file=sys.stderr)
                sys.exit(1)

            try:
                indicators = json.loads(args.performance_indicators)
            except json.JSONDecodeError as e:
                print(f"Error parsing performance indicators JSON: {e}", file=sys.stderr)
                sys.exit(1)

            manager.update_performance_indicators(indicators)
            print("Updated performance indicators")

        elif args.action == "update-governance":
            if not args.governance_data:
                print("Error: --governance-data is required", file=sys.stderr)
                sys.exit(1)

            try:
                data = json.loads(args.governance_data)
            except json.JSONDecodeError as e:
                print(f"Error parsing governance data JSON: {e}", file=sys.stderr)
                sys.exit(1)

            manager.update_governance_status(data)
            print("Updated governance status")

        elif args.action == "add-compliance":
            if not args.check_name or not args.check_status or not args.check_details:
                print("Error: --check-name, --check-status, and --check-details are required", file=sys.stderr)
                sys.exit(1)

            try:
                details = json.loads(args.check_details)
            except json.JSONDecodeError as e:
                print(f"Error parsing check details JSON: {e}", file=sys.stderr)
                sys.exit(1)

            manager.add_compliance_check(args.check_name, args.check_status, details)
            print(f"Added compliance check '{args.check_name}' with status '{args.check_status}'")

        elif args.action == "complete":
            status = args.global_status or StatusType.COMPLETED.value
            manager.complete_run(status, args.completion_message or "")
            print(f"Marked production run as '{status}'")

        elif args.action == "status":
            status_data = manager.get_status()
            print(json.dumps(status_data, indent=2, default=str))

        elif args.action == "summary":
            summary = manager.generate_summary()
            print(json.dumps(summary, indent=2, default=str))

        elif args.action == "validate-evidence":
            validation = manager.validate_evidence_completeness()
            print(json.dumps(validation, indent=2, default=str))

        elif args.action == "export":
            exported = manager.export_status(args.format)
            print(exported)

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()