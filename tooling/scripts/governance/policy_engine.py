#!/usr/bin/env python3
"""
Policy Engine
Implements policy-driven governance and guardrails for system operations
"""

import json
import logging
import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class PolicyType(Enum):
    GOVERNANCE = "governance"
    SECURITY = "security"
    COMPLIANCE = "compliance"
    PERFORMANCE = "performance"
    RESOURCE = "resource"


class PolicySeverity(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class EnforcementAction(Enum):
    ALLOW = "allow"
    DENY = "deny"
    QUARANTINE = "quarantine"
    NOTIFY = "notify"
    ESCALATE = "escalate"


@dataclass
class PolicyCondition:
    field: str
    operator: str  # equals, contains, greater_than, less_than, regex_match
    value: Any
    description: str = ""


@dataclass
class PolicyAction:
    type: EnforcementAction
    parameters: Optional[Dict[str, Any]] = None
    message: str = ""

    def __post_init__(self):
        if self.parameters is None:
            self.parameters = {}


@dataclass
class Policy:
    id: str
    name: str
    description: str
    type: PolicyType
    severity: PolicySeverity
    conditions: List[PolicyCondition]
    actions: List[PolicyAction]
    enabled: bool = True
    priority: int = 100
    created_date: Optional[datetime.datetime] = None
    last_modified: Optional[datetime.datetime] = None

    def __post_init__(self):
        if self.created_date is None:
            self.created_date = datetime.datetime.now()
        if self.last_modified is None:
            self.last_modified = datetime.datetime.now()


@dataclass
class PolicyViolation:
    id: str
    policy_id: str
    resource: str
    context: Dict[str, Any]
    violation_details: Dict[str, Any]
    timestamp: datetime.datetime
    severity: PolicySeverity
    actions_taken: List[str]
    resolved: bool = False
    resolution_notes: str = ""


class PolicyEngine:
    """
    Policy-driven governance engine with guardrails and enforcement
    """

    def __init__(self, goalie_dir: Path = Path(".goalie")):
        self.goalie_dir = goalie_dir
        self.policies: Dict[str, Policy] = {}
        self.violations: List[PolicyViolation] = []
        self.policy_handlers: Dict[str, Callable] = {}

        self.policies_file = goalie_dir / "policies.json"
        self.violations_file = goalie_dir / "policy_violations.jsonl"

        self.goalie_dir.mkdir(exist_ok=True)
        self._load_policies()
        self._load_violations()
        self._initialize_default_policies()
        self._register_default_handlers()

    def _load_policies(self):
        """Load existing policies"""
        if self.policies_file.exists():
            try:
                with open(self.policies_file, 'r') as f:
                    data = json.load(f)

                for policy_data in data.get("policies", []):
                    # Parse datetime strings
                    if "created_date" in policy_data:
                        policy_data["created_date"] = datetime.datetime.fromisoformat(policy_data["created_date"])
                    if "last_modified" in policy_data:
                        policy_data["last_modified"] = datetime.datetime.fromisoformat(policy_data["last_modified"])

                    # Parse enums
                    policy_data["type"] = PolicyType(policy_data["type"])
                    policy_data["severity"] = PolicySeverity(policy_data["severity"])

                    # Parse conditions and actions
                    conditions = [PolicyCondition(**c) for c in policy_data.get("conditions", [])]
                    actions = [PolicyAction(**a) for a in policy_data.get("actions", [])]
                    policy_data["conditions"] = conditions
                    policy_data["actions"] = actions

                    policy = Policy(**policy_data)
                    self.policies[policy.id] = policy

                logger.info(f"Loaded {len(self.policies)} policies")

            except Exception as e:
                logger.error(f"Failed to load policies: {e}")

    def _load_violations(self):
        """Load existing policy violations"""
        if self.violations_file.exists():
            try:
                with open(self.violations_file, 'r') as f:
                    for line in f:
                        if line.strip():
                            violation_data = json.loads(line)
                            violation_data["timestamp"] = datetime.datetime.fromisoformat(violation_data["timestamp"])
                            violation_data["severity"] = PolicySeverity(violation_data["severity"])
                            violation = PolicyViolation(**violation_data)
                            self.violations.append(violation)

                logger.info(f"Loaded {len(self.violations)} policy violations")

            except Exception as e:
                logger.error(f"Failed to load violations: {e}")

    def _initialize_default_policies(self):
        """Initialize default governance policies"""

        # Governance Hierarchy Policy
        hierarchy_policy = Policy(
            id="governance-hierarchy",
            name="Governance Hierarchy Compliance",
            description="Ensures all actions comply with governance hierarchy (Purpose -> Domain -> Accountability)",
            type=PolicyType.GOVERNANCE,
            severity=PolicySeverity.ERROR,
            conditions=[
                PolicyCondition(
                    field="governance_context.purpose",
                    operator="equals",
                    value=None,
                    description="Action must have a defined purpose"
                ),
                PolicyCondition(
                    field="governance_context.domain",
                    operator="equals",
                    value=None,
                    description="Action must belong to a valid domain"
                )
            ],
            actions=[
                PolicyAction(
                    type=EnforcementAction.DENY,
                    message="Action violates governance hierarchy requirements"
                ),
                PolicyAction(
                    type=EnforcementAction.NOTIFY,
                    parameters={"recipients": ["governance-lead"]},
                    message="Governance hierarchy violation detected"
                )
            ],
            priority=10
        )

        # Circle Role Policy
        circle_policy = Policy(
            id="circle-role-compliance",
            name="Circle Role Compliance",
            description="Ensures actions are performed by appropriate circle roles",
            type=PolicyType.GOVERNANCE,
            severity=PolicySeverity.WARNING,
            conditions=[
                PolicyCondition(
                    field="actor.circle_role",
                    operator="equals",
                    value=None,
                    description="Actor must have a valid circle role"
                )
            ],
            actions=[
                PolicyAction(
                    type=EnforcementAction.NOTIFY,
                    parameters={"recipients": ["circle-lead", "governance-lead"]},
                    message="Action performed outside assigned circle role"
                )
            ],
            priority=20
        )

        # Performance Baseline Policy
        performance_policy = Policy(
            id="performance-baseline",
            name="Performance Baseline Enforcement",
            description="Prevents actions that would violate performance baselines",
            type=PolicyType.PERFORMANCE,
            severity=PolicySeverity.CRITICAL,
            conditions=[
                PolicyCondition(
                    field="performance_impact.score",
                    operator="less_than",
                    value=0.7,
                    description="Action must maintain performance above 70% of baseline"
                )
            ],
            actions=[
                PolicyAction(
                    type=EnforcementAction.DENY,
                    message="Action would violate performance baseline"
                ),
                PolicyAction(
                    type=EnforcementAction.ESCALATE,
                    parameters={"level": "management"},
                    message="Performance-critical action requires approval"
                )
            ],
            priority=5
        )

        # Security Policy
        security_policy = Policy(
            id="security-compliance",
            name="Security Compliance",
            description="Enforces security standards and prevents insecure actions",
            type=PolicyType.SECURITY,
            severity=PolicySeverity.CRITICAL,
            conditions=[
                PolicyCondition(
                    field="security_review.status",
                    operator="equals",
                    value="approved",
                    description="Action must have security approval"
                )
            ],
            actions=[
                PolicyAction(
                    type=EnforcementAction.DENY,
                    message="Action lacks required security approval"
                ),
                PolicyAction(
                    type=EnforcementAction.QUARANTINE,
                    message="Potentially insecure action quarantined for review"
                )
            ],
            priority=1
        )

        # Resource Usage Policy
        resource_policy = Policy(
            id="resource-limits",
            name="Resource Usage Limits",
            description="Prevents excessive resource consumption",
            type=PolicyType.RESOURCE,
            severity=PolicySeverity.ERROR,
            conditions=[
                PolicyCondition(
                    field="resource_usage.cpu",
                    operator="greater_than",
                    value=80,
                    description="CPU usage must not exceed 80%"
                ),
                PolicyCondition(
                    field="resource_usage.memory",
                    operator="greater_than",
                    value=85,
                    description="Memory usage must not exceed 85%"
                )
            ],
            actions=[
                PolicyAction(
                    type=EnforcementAction.DENY,
                    message="Action would exceed resource limits"
                ),
                PolicyAction(
                    type=EnforcementAction.NOTIFY,
                    parameters={"recipients": ["operations-lead"]},
                    message="Resource usage approaching limits"
                )
            ],
            priority=15
        )

        # Add default policies if not already present
        default_policies = [
            hierarchy_policy, circle_policy, performance_policy,
            security_policy, resource_policy
        ]

        for policy in default_policies:
            if policy.id not in self.policies:
                self.policies[policy.id] = policy

        logger.info("Initialized default governance policies")

    def _register_default_handlers(self):
        """Register default policy enforcement handlers"""
        self.policy_handlers = {
            "notify": self._handle_notify,
            "escalate": self._handle_escalate,
            "quarantine": self._handle_quarantine,
            "deny": self._handle_deny,
            "allow": self._handle_allow
        }

    def create_policy(self, policy: Policy) -> Policy:
        """Create a new governance policy"""
        if policy.id in self.policies:
            raise ValueError(f"Policy {policy.id} already exists")

        policy.last_modified = datetime.datetime.now()
        self.policies[policy.id] = policy
        self._save_policies()

        logger.info(f"Created policy: {policy.name}")
        return policy

    def update_policy(self, policy_id: str, updates: Dict[str, Any]) -> bool:
        """Update an existing policy"""
        if policy_id not in self.policies:
            return False

        policy = self.policies[policy_id]

        for key, value in updates.items():
            if hasattr(policy, key):
                setattr(policy, key, value)

        policy.last_modified = datetime.datetime.now()
        self._save_policies()

        logger.info(f"Updated policy: {policy_id}")
        return True

    def delete_policy(self, policy_id: str) -> bool:
        """Delete a policy"""
        if policy_id not in self.policies:
            return False

        del self.policies[policy_id]
        self._save_policies()

        logger.info(f"Deleted policy: {policy_id}")
        return True

    def evaluate_action(self, action_context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluate an action against all applicable policies

        Args:
            action_context: Context information about the action being evaluated

        Returns:
            Dict containing evaluation result and any violations
        """
        applicable_policies = self._get_applicable_policies(action_context)
        violations = []
        allowed = True
        actions_taken = []

        # Sort policies by priority (lower number = higher priority)
        applicable_policies.sort(key=lambda p: p.priority)

        for policy in applicable_policies:
            if not policy.enabled:
                continue

            violation = self._check_policy_violation(policy, action_context)
            if violation:
                violations.append(violation)

                # Execute policy actions
                for action in policy.actions:
                    result = self._execute_policy_action(action, violation)
                    actions_taken.append(result)

                    if action.type == EnforcementAction.DENY:
                        allowed = False

        result = {
            "allowed": allowed,
            "violations": [asdict(v) for v in violations],
            "actions_taken": actions_taken,
            "evaluated_policies": len(applicable_policies)
        }

        return result

    def _get_applicable_policies(self, action_context: Dict[str, Any]) -> List[Policy]:
        """Get policies applicable to the given action context"""
        applicable = []

        for policy in self.policies.values():
            if not policy.enabled:
                continue

            # Check if policy conditions match the context
            if self._policy_applies(policy, action_context):
                applicable.append(policy)

        return applicable

    def _policy_applies(self, policy: Policy, context: Dict[str, Any]) -> bool:
        """Check if a policy applies to the given context"""
        # Simple implementation - in practice, this would be more sophisticated
        # For now, assume all policies apply to all actions
        # Could be enhanced with tags, scopes, etc.
        return True

    def _check_policy_violation(self, policy: Policy, context: Dict[str, Any]) -> Optional[PolicyViolation]:
        """Check if a policy is violated by the given context"""
        violations = []

        for condition in policy.conditions:
            if not self._check_condition(condition, context):
                violations.append({
                    "condition": condition.description,
                    "field": condition.field,
                    "expected": f"{condition.operator} {condition.value}",
                    "actual": self._get_nested_value(context, condition.field)
                })

        if violations:
            violation = PolicyViolation(
                id=f"violation-{int(datetime.datetime.now().timestamp())}",
                policy_id=policy.id,
                resource=context.get("resource", "unknown"),
                context=context,
                violation_details={"violations": violations},
                timestamp=datetime.datetime.now(),
                severity=policy.severity,
                actions_taken=[]
            )

            self.violations.append(violation)
            self._save_violation(violation)

            return violation

        return None

    def _check_condition(self, condition: PolicyCondition, context: Dict[str, Any]) -> bool:
        """Check if a condition is satisfied"""
        actual_value = self._get_nested_value(context, condition.field)

        if condition.operator == "equals":
            return actual_value == condition.value
        elif condition.operator == "contains":
            return condition.value in actual_value if isinstance(actual_value, (list, str)) else False
        elif condition.operator == "greater_than":
            return actual_value > condition.value if isinstance(actual_value, (int, float)) else False
        elif condition.operator == "less_than":
            return actual_value < condition.value if isinstance(actual_value, (int, float)) else False
        elif condition.operator == "regex_match":
            import re
            return bool(re.match(condition.value, str(actual_value)))

        return False

    def _get_nested_value(self, data: Dict[str, Any], path: str) -> Any:
        """Get a nested value from a dictionary using dot notation"""
        keys = path.split('.')
        current = data

        try:
            for key in keys:
                current = current[key]
            return current
        except (KeyError, TypeError):
            return None

    def _execute_policy_action(self, action: PolicyAction, violation: PolicyViolation) -> str:
        """Execute a policy action"""
        handler = self.policy_handlers.get(action.type.value)
        if handler:
            return handler(action, violation)
        else:
            logger.warning(f"No handler for action type: {action.type.value}")
            return f"Unknown action: {action.type.value}"

    def _handle_notify(self, action: PolicyAction, violation: PolicyViolation) -> str:
        """Handle notify action"""
        recipients = action.parameters.get("recipients", [])
        message = action.message or f"Policy violation: {violation.policy_id}"

        # In a real implementation, this would send notifications
        logger.warning(f"NOTIFICATION: {message} to {recipients}")
        return f"Notified {recipients}: {message}"

    def _handle_escalate(self, action: PolicyAction, violation: PolicyViolation) -> str:
        """Handle escalate action"""
        level = action.parameters.get("level", "management")
        message = action.message or f"Escalating policy violation: {violation.policy_id}"

        logger.error(f"ESCALATION ({level}): {message}")
        return f"Escalated to {level}: {message}"

    def _handle_quarantine(self, action: PolicyAction, violation: PolicyViolation) -> str:
        """Handle quarantine action"""
        message = action.message or f"Quarantining due to policy violation: {violation.policy_id}"

        logger.error(f"QUARANTINE: {message}")
        return f"Quarantined: {message}"

    def _handle_deny(self, action: PolicyAction, violation: PolicyViolation) -> str:
        """Handle deny action"""
        message = action.message or f"Action denied due to policy violation: {violation.policy_id}"

        logger.error(f"DENY: {message}")
        return f"Denied: {message}"

    def _handle_allow(self, action: PolicyAction, violation: PolicyViolation) -> str:
        """Handle allow action"""
        return "Action allowed"

    def resolve_violation(self, violation_id: str, resolution_notes: str) -> bool:
        """Resolve a policy violation"""
        for violation in self.violations:
            if violation.id == violation_id:
                violation.resolved = True
                violation.resolution_notes = resolution_notes
                self._save_violation(violation)
                logger.info(f"Resolved violation: {violation_id}")
                return True

        return False

    def get_policy_report(self) -> Dict[str, Any]:
        """Generate policy compliance report"""
        total_policies = len(self.policies)
        enabled_policies = len([p for p in self.policies.values() if p.enabled])
        total_violations = len(self.violations)
        unresolved_violations = len([v for v in self.violations if not v.resolved])

        # Violations by severity
        severity_counts = {}
        for violation in self.violations:
            severity = violation.severity.value
            severity_counts[severity] = severity_counts.get(severity, 0) + 1

        # Violations by policy
        policy_counts = {}
        for violation in self.violations:
            policy_counts[violation.policy_id] = policy_counts.get(violation.policy_id, 0) + 1

        return {
            "timestamp": datetime.datetime.now().isoformat(),
            "summary": {
                "total_policies": total_policies,
                "enabled_policies": enabled_policies,
                "total_violations": total_violations,
                "unresolved_violations": unresolved_violations
            },
            "violations_by_severity": severity_counts,
            "violations_by_policy": policy_counts,
            "recent_violations": [asdict(v) for v in self.violations[-10:]]
        }

    def _save_policies(self):
        """Save policies to file"""
        data = {
            "timestamp": datetime.datetime.now().isoformat(),
            "policies": [asdict(p) for p in self.policies.values()]
        }

        with open(self.policies_file, 'w') as f:
            json.dump(data, f, indent=2, default=str)

    def _save_violation(self, violation: PolicyViolation):
        """Save a violation to the log"""
        with open(self.violations_file, 'a') as f:
            f.write(json.dumps(asdict(violation), default=str) + '\n')


def main():
    """Main entry point for policy engine"""
    import argparse

    parser = argparse.ArgumentParser(description="Policy Engine")
    parser.add_argument("--goalie-dir", type=Path, default=Path(".goalie"), help="Goalie directory")
    parser.add_argument("--evaluate", type=str, help="Evaluate action context (JSON string)")
    parser.add_argument("--report", action="store_true", help="Generate policy compliance report")
    parser.add_argument("--export", type=Path, help="Export policies to file")

    args = parser.parse_args()

    engine = PolicyEngine(args.goalie_dir)

    if args.evaluate:
        try:
            context = json.loads(args.evaluate)
            result = engine.evaluate_action(context)
            print(json.dumps(result, indent=2))
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON - {e}")

    elif args.report:
        report = engine.get_policy_report()
        print(json.dumps(report, indent=2))

    elif args.export:
        # Export policies
        data = {
            "timestamp": datetime.datetime.now().isoformat(),
            "policies": [asdict(p) for p in engine.policies.values()],
            "violations": [asdict(v) for v in engine.violations]
        }

        with open(args.export, 'w') as f:
            json.dump(data, f, indent=2, default=str)

        print(f"Exported policy data to {args.export}")

    else:
        # Default: show policy overview
        enabled = len([p for p in engine.policies.values() if p.enabled])
        violations = len(engine.violations)
        unresolved = len([v for v in engine.violations if not v.resolved])

        print("Policy Engine Overview:")
        print(f"Total policies: {len(engine.policies)}")
        print(f"Enabled policies: {enabled}")
        print(f"Total violations: {violations}")
        print(f"Unresolved violations: {unresolved}")


if __name__ == "__main__":
    main()