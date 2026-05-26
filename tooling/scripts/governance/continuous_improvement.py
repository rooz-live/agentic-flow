#!/usr/bin/env python3
"""
Continuous Improvement Orchestration
Implements automated improvement cycle management with Plan-Do-Act framework
"""

import json
import logging
import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class ImprovementStatus(Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"
    CANCELLED = "cancelled"


class ImprovementPriority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class ImprovementAction:
    id: str
    name: str
    description: str
    priority: ImprovementPriority
    estimated_effort: int  # hours
    dependencies: Optional[List[str]] = None
    assigned_to: Optional[str] = None
    status: ImprovementStatus = ImprovementStatus.PLANNED
    created_date: Optional[datetime.datetime] = None
    completed_date: Optional[datetime.datetime] = None

    def __post_init__(self):
        if self.dependencies is None:
            self.dependencies = []
        if self.created_date is None:
            self.created_date = datetime.datetime.now()


@dataclass
class ImprovementCycle:
    id: str
    name: str
    description: str
    trigger_source: str
    trigger_metric: str
    trigger_value: float
    trigger_threshold: float

    # Plan phase
    plan_objectives: List[str]
    plan_actions: List[ImprovementAction]
    plan_risks: List[str]
    plan_resources: List[str]

    # Do phase
    do_started: Optional[datetime.datetime] = None
    do_completed: Optional[datetime.datetime] = None
    do_progress: float = 0.0
    do_issues: Optional[List[str]] = None

    # Act phase
    act_outcomes: Optional[List[str]] = None
    act_learnings: Optional[List[str]] = None
    act_improvements: Optional[List[str]] = None
    act_metrics: Optional[Dict[str, float]] = None

    status: ImprovementStatus = ImprovementStatus.PLANNED
    created_date: Optional[datetime.datetime] = None
    completed_date: Optional[datetime.datetime] = None

    def __post_init__(self):
        if self.do_issues is None:
            self.do_issues = []
        if self.act_outcomes is None:
            self.act_outcomes = []
        if self.act_learnings is None:
            self.act_learnings = []
        if self.act_improvements is None:
            self.act_improvements = []
        if self.act_metrics is None:
            self.act_metrics = {}
        if self.created_date is None:
            self.created_date = datetime.datetime.now()


class ContinuousImprovementOrchestrator:
    """
    Orchestrates continuous improvement cycles using Plan-Do-Act framework
    """

    def __init__(self, goalie_dir: Path = Path(".goalie")):
        self.goalie_dir = goalie_dir
        self.improvement_cycles: Dict[str, ImprovementCycle] = {}
        self.active_cycles: List[str] = []
        self.completed_cycles: List[str] = []

        self.improvement_log = goalie_dir / "improvement_cycles.jsonl"
        self.recommendations_file = goalie_dir / "improvement_recommendations.json"

        self.goalie_dir.mkdir(exist_ok=True)
        self._load_existing_cycles()
        self._initialize_default_triggers()

    def _load_existing_cycles(self):
        """Load existing improvement cycles"""
        if self.improvement_log.exists():
            try:
                with open(self.improvement_log, 'r') as f:
                    for line in f:
                        if line.strip():
                            cycle_data = json.loads(line)
                            # Parse datetime strings
                            for field in ['created_date', 'completed_date', 'do_started', 'do_completed']:
                                if field in cycle_data and cycle_data[field]:
                                    cycle_data[field] = datetime.datetime.fromisoformat(cycle_data[field])

                            # Parse actions
                            actions = []
                            for action_data in cycle_data.get('plan_actions', []):
                                if 'created_date' in action_data and action_data['created_date']:
                                    action_data['created_date'] = datetime.datetime.fromisoformat(action_data['created_date'])
                                if 'completed_date' in action_data and action_data['completed_date']:
                                    action_data['completed_date'] = datetime.datetime.fromisoformat(action_data['completed_date'])
                                actions.append(ImprovementAction(**action_data))
                            cycle_data['plan_actions'] = actions

                            cycle = ImprovementCycle(**cycle_data)
                            self.improvement_cycles[cycle.id] = cycle

                            if cycle.status in [ImprovementStatus.PLANNED, ImprovementStatus.IN_PROGRESS]:
                                self.active_cycles.append(cycle.id)
                            else:
                                self.completed_cycles.append(cycle.id)

                logger.info(f"Loaded {len(self.improvement_cycles)} improvement cycles")

            except Exception as e:
                logger.error(f"Failed to load improvement cycles: {e}")

    def _initialize_default_triggers(self):
        """Initialize default improvement triggers"""
        # These would be configured based on baseline assessments
        self.triggers = {
            "performance_degradation": {
                "metric": "performance_score",
                "threshold": 0.8,
                "description": "Performance dropped below 80% of baseline"
            },
            "compliance_violation": {
                "metric": "compliance_score",
                "threshold": 0.9,
                "description": "Compliance score below 90%"
            },
            "evidence_gap": {
                "metric": "evidence_completeness",
                "threshold": 0.85,
                "description": "Evidence trail completeness below 85%"
            },
            "health_deterioration": {
                "metric": "health_score",
                "threshold": 0.75,
                "description": "System health score below 75%"
            }
        }

    def trigger_improvement_cycle(self, trigger_source: str, trigger_metric: str,
                                trigger_value: float, trigger_threshold: float) -> ImprovementCycle:
        """Trigger a new improvement cycle based on metric deviation"""

        cycle_id = f"improvement-{int(datetime.datetime.now().timestamp())}"

        # Generate improvement actions based on trigger
        actions = self._generate_improvement_actions(trigger_source, trigger_metric, trigger_value)

        cycle = ImprovementCycle(
            id=cycle_id,
            name=f"Improvement: {trigger_source.title()} Issue",
            description=f"Automated improvement cycle triggered by {trigger_metric} deviation",
            trigger_source=trigger_source,
            trigger_metric=trigger_metric,
            trigger_value=trigger_value,
            trigger_threshold=trigger_threshold,
            plan_objectives=[
                f"Address {trigger_metric} degradation",
                f"Restore {trigger_source} performance to acceptable levels",
                "Implement preventive measures",
                "Update monitoring and alerting"
            ],
            plan_actions=actions,
            plan_risks=[
                "Implementation may impact system stability",
                "Resource constraints may delay completion",
                "Unexpected side effects from changes"
            ],
            plan_resources=[
                f"{trigger_source} team",
                "DevOps resources",
                "Quality assurance",
                "Monitoring tools"
            ]
        )

        self.improvement_cycles[cycle_id] = cycle
        self.active_cycles.append(cycle_id)

        # Log the cycle creation
        self._log_cycle_event(cycle, "created")

        logger.info(f"Triggered improvement cycle: {cycle_id} for {trigger_source}")
        return cycle

    def _generate_improvement_actions(self, trigger_source: str, trigger_metric: str,
                                    trigger_value: float) -> List[ImprovementAction]:
        """Generate improvement actions based on the trigger"""

        actions = []

        if trigger_metric == "performance_score":
            actions.extend([
                ImprovementAction(
                    id=f"perf-analyze-{int(datetime.datetime.now().timestamp())}",
                    name="Performance Analysis",
                    description="Analyze performance bottlenecks and identify root causes",
                    priority=ImprovementPriority.HIGH,
                    estimated_effort=8
                ),
                ImprovementAction(
                    id=f"perf-optimize-{int(datetime.datetime.now().timestamp())}",
                    name="Performance Optimization",
                    description="Implement performance optimizations based on analysis",
                    priority=ImprovementPriority.HIGH,
                    estimated_effort=16,
                    dependencies=["perf-analyze"]
                ),
                ImprovementAction(
                    id=f"perf-monitor-{int(datetime.datetime.now().timestamp())}",
                    name="Enhanced Monitoring",
                    description="Add additional performance monitoring and alerting",
                    priority=ImprovementPriority.MEDIUM,
                    estimated_effort=4
                )
            ])

        elif trigger_metric == "compliance_score":
            actions.extend([
                ImprovementAction(
                    id=f"comp-audit-{int(datetime.datetime.now().timestamp())}",
                    name="Compliance Audit",
                    description="Conduct detailed compliance audit to identify violations",
                    priority=ImprovementPriority.CRITICAL,
                    estimated_effort=12
                ),
                ImprovementAction(
                    id=f"comp-remediate-{int(datetime.datetime.now().timestamp())}",
                    name="Compliance Remediation",
                    description="Implement fixes for identified compliance issues",
                    priority=ImprovementPriority.CRITICAL,
                    estimated_effort=20,
                    dependencies=["comp-audit"]
                ),
                ImprovementAction(
                    id=f"comp-train-{int(datetime.datetime.now().timestamp())}",
                    name="Compliance Training",
                    description="Provide training on compliance requirements",
                    priority=ImprovementPriority.MEDIUM,
                    estimated_effort=8
                )
            ])

        elif trigger_metric == "evidence_completeness":
            actions.extend([
                ImprovementAction(
                    id=f"evidence-review-{int(datetime.datetime.now().timestamp())}",
                    name="Evidence Review",
                    description="Review evidence collection processes and identify gaps",
                    priority=ImprovementPriority.MEDIUM,
                    estimated_effort=6
                ),
                ImprovementAction(
                    id=f"evidence-automate-{int(datetime.datetime.now().timestamp())}",
                    name="Evidence Automation",
                    description="Automate evidence collection for critical processes",
                    priority=ImprovementPriority.MEDIUM,
                    estimated_effort=10,
                    dependencies=["evidence-review"]
                )
            ])

        elif trigger_metric == "health_score":
            actions.extend([
                ImprovementAction(
                    id=f"health-diagnostic-{int(datetime.datetime.now().timestamp())}",
                    name="Health Diagnostics",
                    description="Run comprehensive health diagnostics",
                    priority=ImprovementPriority.HIGH,
                    estimated_effort=4
                ),
                ImprovementAction(
                    id=f"health-repair-{int(datetime.datetime.now().timestamp())}",
                    name="Health Repairs",
                    description="Address identified health issues",
                    priority=ImprovementPriority.HIGH,
                    estimated_effort=12,
                    dependencies=["health-diagnostic"]
                ),
                ImprovementAction(
                    id=f"health-prevent-{int(datetime.datetime.now().timestamp())}",
                    name="Preventive Measures",
                    description="Implement preventive health measures",
                    priority=ImprovementPriority.MEDIUM,
                    estimated_effort=8
                )
            ])

        return actions

    def start_improvement_cycle(self, cycle_id: str) -> bool:
        """Start executing an improvement cycle"""
        if cycle_id not in self.improvement_cycles:
            logger.error(f"Improvement cycle {cycle_id} not found")
            return False

        cycle = self.improvement_cycles[cycle_id]
        if cycle.status != ImprovementStatus.PLANNED:
            logger.error(f"Cannot start cycle {cycle_id} with status {cycle.status.value}")
            return False

        cycle.status = ImprovementStatus.IN_PROGRESS
        cycle.do_started = datetime.datetime.now()

        # Start with the first action that has no dependencies
        for action in cycle.plan_actions:
            if not action.dependencies and action.status == ImprovementStatus.PLANNED:
                action.status = ImprovementStatus.IN_PROGRESS
                break

        self._log_cycle_event(cycle, "started")
        logger.info(f"Started improvement cycle: {cycle_id}")
        return True

    def update_action_status(self, cycle_id: str, action_id: str,
                           status: ImprovementStatus, notes: str = "") -> bool:
        """Update the status of an improvement action"""
        if cycle_id not in self.improvement_cycles:
            return False

        cycle = self.improvement_cycles[cycle_id]

        for action in cycle.plan_actions:
            if action.id == action_id:
                old_status = action.status
                action.status = status

                if status == ImprovementStatus.COMPLETED:
                    action.completed_date = datetime.datetime.now()

                    # Check if we can start dependent actions
                    self._check_dependencies(cycle)

                # Update cycle progress
                self._update_cycle_progress(cycle)

                logger.info(f"Updated action {action_id} in cycle {cycle_id}: {old_status.value} -> {status.value}")
                return True

        return False

    def _check_dependencies(self, cycle: ImprovementCycle):
        """Check and start actions whose dependencies are now satisfied"""
        completed_actions = {a.id for a in cycle.plan_actions if a.status == ImprovementStatus.COMPLETED}

        for action in cycle.plan_actions:
            if (action.status == ImprovementStatus.PLANNED and
                all(dep in completed_actions for dep in action.dependencies)):
                action.status = ImprovementStatus.IN_PROGRESS

    def _update_cycle_progress(self, cycle: ImprovementCycle):
        """Update overall cycle progress"""
        total_actions = len(cycle.plan_actions)
        if total_actions == 0:
            cycle.do_progress = 1.0
            return

        completed_actions = sum(1 for a in cycle.plan_actions if a.status == ImprovementStatus.COMPLETED)
        in_progress_actions = sum(1 for a in cycle.plan_actions if a.status == ImprovementStatus.IN_PROGRESS)

        # Weight: completed = 1.0, in_progress = 0.5
        cycle.do_progress = (completed_actions + 0.5 * in_progress_actions) / total_actions

        # Check if cycle is complete
        if completed_actions == total_actions:
            cycle.status = ImprovementStatus.COMPLETED
            cycle.do_completed = datetime.datetime.now()
            cycle.completed_date = datetime.datetime.now()

            # Move to completed list
            if cycle.id in self.active_cycles:
                self.active_cycles.remove(cycle.id)
                self.completed_cycles.append(cycle.id)

            self._log_cycle_event(cycle, "completed")

    def complete_improvement_cycle(self, cycle_id: str, outcomes: List[str],
                                 learnings: List[str], improvements: List[str],
                                 metrics: Dict[str, float]) -> bool:
        """Complete an improvement cycle with Act phase results"""
        if cycle_id not in self.improvement_cycles:
            return False

        cycle = self.improvement_cycles[cycle_id]
        if cycle.status != ImprovementStatus.COMPLETED:
            return False

        # Update Act phase
        cycle.act_outcomes = outcomes
        cycle.act_learnings = learnings
        cycle.act_improvements = improvements
        cycle.act_metrics = metrics

        self._log_cycle_event(cycle, "act_completed")
        logger.info(f"Completed Act phase for improvement cycle: {cycle_id}")
        return True

    def get_improvement_recommendations(self) -> Dict[str, Any]:
        """Generate evidence-based improvement recommendations"""
        recommendations = {
            "timestamp": datetime.datetime.now().isoformat(),
            "based_on_cycles": len(self.completed_cycles),
            "recommendations": []
        }

        # Analyze completed cycles for patterns
        if self.completed_cycles:
            pattern_analysis = self._analyze_improvement_patterns()

            for pattern in pattern_analysis:
                recommendations["recommendations"].append({
                    "type": pattern["type"],
                    "priority": pattern["priority"],
                    "description": pattern["description"],
                    "evidence": pattern["evidence"],
                    "suggested_actions": pattern["actions"]
                })

        # Save recommendations
        with open(self.recommendations_file, 'w') as f:
            json.dump(recommendations, f, indent=2, default=str)

        return recommendations

    def _analyze_improvement_patterns(self) -> List[Dict[str, Any]]:
        """Analyze completed cycles to identify improvement patterns"""
        patterns = []

        # Analyze by trigger type
        trigger_counts = {}
        success_rates = {}

        for cycle_id in self.completed_cycles:
            cycle = self.improvement_cycles[cycle_id]
            trigger = cycle.trigger_source

            if trigger not in trigger_counts:
                trigger_counts[trigger] = 0
                success_rates[trigger] = []

            trigger_counts[trigger] += 1

            # Calculate success based on outcomes
            success_score = len(cycle.act_outcomes) / max(1, len(cycle.plan_objectives))
            success_rates[trigger].append(success_score)

        # Generate recommendations based on patterns
        for trigger, count in trigger_counts.items():
            if count >= 3:  # Pattern threshold
                avg_success = sum(success_rates[trigger]) / len(success_rates[trigger])

                if avg_success > 0.8:
                    patterns.append({
                        "type": "preventive_measure",
                        "priority": "high",
                        "description": f"Implement preventive measures for {trigger} issues",
                        "evidence": f"{count} successful improvements with {avg_success:.1%} success rate",
                        "actions": [
                            f"Add monitoring for {trigger} early warning signs",
                            f"Create automated remediation for {trigger} issues",
                            f"Update baseline thresholds for {trigger}"
                        ]
                    })
                elif avg_success < 0.5:
                    patterns.append({
                        "type": "process_improvement",
                        "priority": "critical",
                        "description": f"Review and improve {trigger} improvement process",
                        "evidence": f"{count} improvements with only {avg_success:.1%} success rate",
                        "actions": [
                            f"Conduct root cause analysis for {trigger} failures",
                            f"Update improvement action templates for {trigger}",
                            f"Provide additional training for {trigger} handling"
                        ]
                    })

        return patterns

    def get_active_cycles(self) -> List[ImprovementCycle]:
        """Get all active improvement cycles"""
        return [self.improvement_cycles[cid] for cid in self.active_cycles]

    def get_cycle_status(self, cycle_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed status of a specific cycle"""
        if cycle_id not in self.improvement_cycles:
            return None

        cycle = self.improvement_cycles[cycle_id]

        return {
            "id": cycle.id,
            "name": cycle.name,
            "status": cycle.status.value,
            "progress": cycle.do_progress,
            "trigger": {
                "source": cycle.trigger_source,
                "metric": cycle.trigger_metric,
                "value": cycle.trigger_value,
                "threshold": cycle.trigger_threshold
            },
            "actions": [
                {
                    "id": action.id,
                    "name": action.name,
                    "status": action.status.value,
                    "priority": action.priority.value,
                    "effort": action.estimated_effort
                }
                for action in cycle.plan_actions
            ],
            "timeline": {
                "created": cycle.created_date.isoformat() if cycle.created_date else None,
                "started": cycle.do_started.isoformat() if cycle.do_started else None,
                "completed": cycle.completed_date.isoformat() if cycle.completed_date else None
            }
        }

    def _log_cycle_event(self, cycle: ImprovementCycle, event: str):
        """Log improvement cycle events"""
        event_record = {
            "timestamp": datetime.datetime.now().isoformat(),
            "cycle_id": cycle.id,
            "event": event,
            "cycle_status": cycle.status.value,
            "progress": cycle.do_progress
        }

        with open(self.improvement_log, 'a') as f:
            f.write(json.dumps(event_record) + '\n')

    def export_cycles(self, export_path: Path):
        """Export improvement cycles data"""
        export_data = {
            "timestamp": datetime.datetime.now().isoformat(),
            "cycles": [asdict(cycle) for cycle in self.improvement_cycles.values()],
            "active_cycles": self.active_cycles,
            "completed_cycles": self.completed_cycles
        }

        with open(export_path, 'w') as f:
            json.dump(export_data, f, indent=2, default=str)

        logger.info(f"Exported improvement cycles to {export_path}")


def main():
    """Main entry point for continuous improvement orchestration"""
    import argparse

    parser = argparse.ArgumentParser(description="Continuous Improvement Orchestration")
    parser.add_argument("--goalie-dir", type=Path, default=Path(".goalie"), help="Goalie directory")
    parser.add_argument("--export", type=Path, help="Export improvement cycles to file")
    parser.add_argument("--recommendations", action="store_true", help="Generate improvement recommendations")
    parser.add_argument("--active", action="store_true", help="Show active improvement cycles")
    parser.add_argument("--status", type=str, help="Get status of specific cycle")
    parser.add_argument("--trigger", nargs=4, metavar=('SOURCE', 'METRIC', 'VALUE', 'THRESHOLD'),
                       help="Trigger new improvement cycle: SOURCE METRIC VALUE THRESHOLD")

    args = parser.parse_args()

    orchestrator = ContinuousImprovementOrchestrator(args.goalie_dir)

    if args.export:
        orchestrator.export_cycles(args.export)
        print(f"Exported improvement cycles to {args.export}")

    elif args.recommendations:
        recommendations = orchestrator.get_improvement_recommendations()
        print(json.dumps(recommendations, indent=2))

    elif args.active:
        active_cycles = orchestrator.get_active_cycles()
        for cycle in active_cycles:
            print(f"{cycle.id}: {cycle.name} ({cycle.status.value}) - {cycle.do_progress:.1%}")

    elif args.status:
        status = orchestrator.get_cycle_status(args.status)
        if status:
            print(json.dumps(status, indent=2))
        else:
            print(f"Cycle {args.status} not found")

    elif args.trigger:
        source, metric, value_str, threshold_str = args.trigger
        try:
            value = float(value_str)
            threshold = float(threshold_str)
            cycle = orchestrator.trigger_improvement_cycle(source, metric, value, threshold)
            print(f"Triggered improvement cycle: {cycle.id}")
        except ValueError as e:
            print(f"Error: Invalid numeric values - {e}")

    else:
        # Default: show overview
        active = len(orchestrator.active_cycles)
        completed = len(orchestrator.completed_cycles)
        print(f"Continuous Improvement Overview:")
        print(f"Active cycles: {active}")
        print(f"Completed cycles: {completed}")
        print(f"Total cycles: {active + completed}")


if __name__ == "__main__":
    main()