#!/usr/bin/env python3
"""
Governance Orchestrator
Main governance engine implementing hierarchical governance structure and circle-based governance
"""

import json
import logging
import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class GovernanceStatus(Enum):
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    UNKNOWN = "unknown"


class CircleRole(Enum):
    ANALYST = "analyst"
    ASSESSOR = "assessor"
    INNOVATOR = "innovator"
    INTUITIVE = "intuitive"
    ORCHESTRATOR = "orchestrator"
    SEEKER = "seeker"


@dataclass
class Purpose:
    id: str
    name: str
    description: str
    objectives: List[str]
    key_results: List[str]
    status: GovernanceStatus = GovernanceStatus.UNKNOWN


@dataclass
class Domain:
    id: str
    name: str
    purpose: str
    boundaries: List[str]
    accountabilities: List[str]
    status: GovernanceStatus = GovernanceStatus.UNKNOWN


@dataclass
class Accountability:
    id: str
    role: str
    responsibilities: List[str]
    metrics: List[str]
    reporting_to: List[str]
    status: GovernanceStatus = GovernanceStatus.UNKNOWN


@dataclass
class CircleMember:
    id: str
    name: str
    circle_id: str
    responsibilities: List[str]
    status: str = "active"
    current_tasks: List[str] = None
    performance_score: float = 0.0
    last_update: datetime.datetime = None

    def __post_init__(self):
        if self.current_tasks is None:
            self.current_tasks = []
        if self.last_update is None:
            self.last_update = datetime.datetime.now()


@dataclass
class GovernanceHierarchy:
    purpose: Purpose
    domains: List[Domain]
    accountabilities: List[Accountability]
    circles: Dict[str, List[CircleMember]]


class GovernanceOrchestrator:
    """
    Main governance engine implementing hierarchical governance structure
    and circle-based governance with role-specific responsibilities
    """

    def __init__(self, config_path: Optional[Path] = None):
        self.config_path = config_path or Path(".goalie/governance_config.json")
        self.purposes: Dict[str, Purpose] = {}
        self.domains: Dict[str, Domain] = {}
        self.accountabilities: Dict[str, Accountability] = {}
        self.circles: Dict[str, List[CircleMember]] = {}
        self.hierarchies: Dict[str, GovernanceHierarchy] = {}

        # Initialize circle roles
        for role in CircleRole:
            self.circles[role.value] = []

        self._load_config()
        self._initialize_default_hierarchy()

    def _load_config(self):
        """Load governance configuration"""
        if self.config_path.exists():
            try:
                with open(self.config_path, 'r') as f:
                    config = json.load(f)
                logger.info(f"Loaded governance config from {self.config_path}")
                # Load config data if needed
            except Exception as e:
                logger.error(f"Failed to load governance config: {e}")

    def _initialize_default_hierarchy(self):
        """Initialize default governance hierarchy"""
        # Default purposes
        system_optimization = Purpose(
            id="system-optimization",
            name="System Optimization",
            description="Continuously optimize system performance, reliability, and efficiency",
            objectives=[
                "Maximize system throughput",
                "Minimize resource waste",
                "Ensure 99.9% uptime",
                "Reduce technical debt"
            ],
            key_results=[
                "352x performance improvement",
                "Zero critical incidents",
                "Resource utilization > 80%",
                "Technical debt reduction < 5%"
            ]
        )

        agent_intelligence = Purpose(
            id="agent-intelligence",
            name="Agent Intelligence Enhancement",
            description="Enhance agent learning, reasoning, and decision-making capabilities",
            objectives=[
                "Improve pattern recognition",
                "Enhance causal reasoning",
                "Optimize model selection",
                "Increase success rates"
            ],
            key_results=[
                "90%+ task success rate",
                "46% faster execution",
                "Automatic error correction",
                "Continuous learning improvement"
            ]
        )

        operational_excellence = Purpose(
            id="operational-excellence",
            name="Operational Excellence",
            description="Achieve operational excellence through standardized processes and continuous improvement",
            objectives=[
                "Standardize workflows",
                "Implement comprehensive monitoring",
                "Establish quality gates",
                "Enable rapid response to incidents"
            ],
            key_results=[
                "Zero manual interventions",
                "Sub-5 minute incident response",
                "100% automated deployments",
                "Continuous process improvement"
            ]
        )

        self.purposes = {
            system_optimization.id: system_optimization,
            agent_intelligence.id: agent_intelligence,
            operational_excellence.id: operational_excellence
        }

        # Default domains
        technical_operations = Domain(
            id="technical-operations",
            name="Technical Operations",
            purpose="system-optimization",
            boundaries=[
                "Infrastructure management",
                "Deployment pipelines",
                "System monitoring",
                "Incident response"
            ],
            accountabilities=[
                "System reliability",
                "Performance optimization",
                "Security compliance",
                "Cost management"
            ]
        )

        business_operations = Domain(
            id="business-operations",
            name="Business Operations",
            purpose="operational-excellence",
            boundaries=[
                "Business process management",
                "Stakeholder coordination",
                "Value stream optimization"
            ],
            accountabilities=[
                "Business value delivery",
                "Stakeholder satisfaction",
                "Process efficiency",
                "Revenue optimization"
            ]
        )

        data_intelligence = Domain(
            id="data-intelligence",
            name="Data Intelligence",
            purpose="agent-intelligence",
            boundaries=[
                "Data collection",
                "Analytics and insights",
                "Intelligence services"
            ],
            accountabilities=[
                "Data quality",
                "Insight accuracy",
                "Model performance",
                "Privacy compliance"
            ]
        )

        self.domains = {
            technical_operations.id: technical_operations,
            business_operations.id: business_operations,
            data_intelligence.id: data_intelligence
        }

        # Default accountabilities
        system_architect = Accountability(
            id="system-architect",
            role="System Architect",
            responsibilities=[
                "Design system architecture",
                "Define technical standards",
                "Ensure scalability and reliability",
                "Technology selection and evaluation"
            ],
            metrics=[
                "Architecture quality score",
                "System scalability index",
                "Technology adoption rate",
                "Design review completion rate"
            ],
            reporting_to=["cto", "engineering-lead"]
        )

        operations_lead = Accountability(
            id="operations-lead",
            role="Operations Lead",
            responsibilities=[
                "Manage day-to-day operations",
                "Ensure system reliability",
                "Coordinate incident response",
                "Team performance management"
            ],
            metrics=[
                "System uptime percentage",
                "Mean time to recovery",
                "Incident response time",
                "Team effectiveness score"
            ],
            reporting_to=["coo", "cto"]
        )

        quality_assurance = Accountability(
            id="quality-assurance",
            role="Quality Assurance Lead",
            responsibilities=[
                "Define quality standards",
                "Implement testing frameworks",
                "Monitor quality metrics",
                "Drive continuous improvement"
            ],
            metrics=[
                "Defect escape rate",
                "Test coverage percentage",
                "Quality gate pass rate",
                "Automation coverage"
            ],
            reporting_to=["coo", "engineering-lead"]
        )

        self.accountabilities = {
            system_architect.id: system_architect,
            operations_lead.id: operations_lead,
            quality_assurance.id: quality_assurance
        }

        # Initialize circle responsibilities
        self._initialize_circle_responsibilities()

        logger.info("Initialized default governance hierarchy")

    def _initialize_circle_responsibilities(self):
        """Initialize circle role responsibilities"""
        circle_responsibilities = {
            CircleRole.ANALYST.value: [
                "Data analysis and insights generation",
                "Pattern recognition and optimization",
                "Performance metrics analysis"
            ],
            CircleRole.ASSESSOR.value: [
                "Risk assessment and quality assurance",
                "Compliance monitoring",
                "Quality gate management"
            ],
            CircleRole.INNOVATOR.value: [
                "Research and development initiatives",
                "Prototype development",
                "Innovation pipeline management"
            ],
            CircleRole.INTUITIVE.value: [
                "User experience and interface design",
                "Usability testing",
                "User feedback collection"
            ],
            CircleRole.ORCHESTRATOR.value: [
                "System coordination and workflow management",
                "Resource allocation",
                "Performance optimization"
            ],
            CircleRole.SEEKER.value: [
                "Market research and opportunity identification",
                "Competitive analysis",
                "Trend monitoring"
            ]
        }

        # Create default circle members
        for circle_id, responsibilities in circle_responsibilities.items():
            member = CircleMember(
                id=f"{circle_id}-lead",
                name=f"{circle_id.title()} Lead",
                circle_id=circle_id,
                responsibilities=responsibilities
            )
            self.circles[circle_id].append(member)

    def create_purpose(self, purpose: Purpose) -> Purpose:
        """Create a new purpose in the governance hierarchy"""
        if purpose.id in self.purposes:
            raise ValueError(f"Purpose {purpose.id} already exists")

        self.purposes[purpose.id] = purpose
        logger.info(f"Created purpose: {purpose.name}")
        return purpose

    def create_domain(self, domain: Domain) -> Domain:
        """Create a new domain in the governance hierarchy"""
        if domain.id in self.domains:
            raise ValueError(f"Domain {domain.id} already exists")

        if domain.purpose not in self.purposes:
            raise ValueError(f"Purpose {domain.purpose} does not exist")

        self.domains[domain.id] = domain
        logger.info(f"Created domain: {domain.name}")
        return domain

    def create_accountability(self, accountability: Accountability) -> Accountability:
        """Create a new accountability in the governance hierarchy"""
        if accountability.id in self.accountabilities:
            raise ValueError(f"Accountability {accountability.id} already exists")

        self.accountabilities[accountability.id] = accountability
        logger.info(f"Created accountability: {accountability.role}")
        return accountability

    def add_circle_member(self, member: CircleMember) -> CircleMember:
        """Add a member to a circle"""
        if member.circle_id not in self.circles:
            raise ValueError(f"Circle {member.circle_id} does not exist")

        # Check for duplicate IDs
        for existing in self.circles[member.circle_id]:
            if existing.id == member.id:
                raise ValueError(f"Member {member.id} already exists in circle {member.circle_id}")

        self.circles[member.circle_id].append(member)
        logger.info(f"Added member {member.name} to circle {member.circle_id}")
        return member

    def get_governance_hierarchy(self, purpose_id: str) -> Optional[GovernanceHierarchy]:
        """Get the complete governance hierarchy for a purpose"""
        if purpose_id not in self.purposes:
            return None

        purpose = self.purposes[purpose_id]
        domains = [d for d in self.domains.values() if d.purpose == purpose_id]
        accountabilities = []  # Could be linked to domains

        # Get circles (all circles are relevant)
        circles = self.circles.copy()

        return GovernanceHierarchy(
            purpose=purpose,
            domains=domains,
            accountabilities=accountabilities,
            circles=circles
        )

    def assess_governance_health(self) -> Dict[str, Any]:
        """Assess overall governance health"""
        issues = []
        recommendations = []

        # Check purposes
        if len(self.purposes) < 3:
            issues.append("Insufficient purposes defined")
            recommendations.append("Define at least 3 core purposes")

        # Check domains
        if len(self.domains) < 3:
            issues.append("Insufficient domains defined")
            recommendations.append("Define technical, business, and data domains")

        # Check accountabilities
        if len(self.accountabilities) < 3:
            issues.append("Insufficient accountabilities defined")
            recommendations.append("Define architect, operations, and QA accountabilities")

        # Check circle utilization
        for circle_id, members in self.circles.items():
            active_members = [m for m in members if m.status == "active"]
            if len(active_members) == 0:
                issues.append(f"No active members in {circle_id} circle")
                recommendations.append(f"Assign at least one active member to {circle_id} circle")

        # Determine overall status
        if len(issues) == 0:
            status = GovernanceStatus.HEALTHY
        elif len(issues) <= 2:
            status = GovernanceStatus.WARNING
        else:
            status = GovernanceStatus.CRITICAL

        return {
            "status": status.value,
            "issues": issues,
            "recommendations": recommendations,
            "metrics": {
                "purposes": len(self.purposes),
                "domains": len(self.domains),
                "accountabilities": len(self.accountabilities),
                "circles": len(self.circles),
                "total_members": sum(len(members) for members in self.circles.values())
            }
        }

    def get_circle_performance(self, circle_id: str) -> Dict[str, Any]:
        """Get performance metrics for a specific circle"""
        if circle_id not in self.circles:
            raise ValueError(f"Circle {circle_id} does not exist")

        members = self.circles[circle_id]
        active_members = [m for m in members if m.status == "active"]

        if not active_members:
            return {
                "circle_id": circle_id,
                "status": "inactive",
                "member_count": 0,
                "active_members": 0,
                "average_performance": 0.0,
                "total_tasks": 0
            }

        avg_performance = sum(m.performance_score for m in active_members) / len(active_members)
        total_tasks = sum(len(m.current_tasks) for m in active_members)

        return {
            "circle_id": circle_id,
            "status": "active",
            "member_count": len(members),
            "active_members": len(active_members),
            "average_performance": round(avg_performance, 2),
            "total_tasks": total_tasks
        }

    def update_circle_member_status(self, member_id: str, circle_id: str, status: str,
                                  performance_score: Optional[float] = None):
        """Update a circle member's status and performance"""
        if circle_id not in self.circles:
            raise ValueError(f"Circle {circle_id} does not exist")

        for member in self.circles[circle_id]:
            if member.id == member_id:
                member.status = status
                if performance_score is not None:
                    member.performance_score = performance_score
                member.last_update = datetime.datetime.now()
                logger.info(f"Updated member {member_id} in circle {circle_id}: status={status}")
                return

        raise ValueError(f"Member {member_id} not found in circle {circle_id}")

    def export_governance_state(self) -> Dict[str, Any]:
        """Export current governance state"""
        return {
            "timestamp": datetime.datetime.now().isoformat(),
            "purposes": {k: asdict(v) for k, v in self.purposes.items()},
            "domains": {k: asdict(v) for k, v in self.domains.items()},
            "accountabilities": {k: asdict(v) for k, v in self.accountabilities.items()},
            "circles": {k: [asdict(m) for m in v] for k, v in self.circles.items()},
            "health": self.assess_governance_health()
        }

    def import_governance_state(self, state: Dict[str, Any]):
        """Import governance state"""
        try:
            # Import purposes
            if "purposes" in state:
                for purpose_data in state["purposes"].values():
                    purpose = Purpose(**purpose_data)
                    self.purposes[purpose.id] = purpose

            # Import domains
            if "domains" in state:
                for domain_data in state["domains"].values():
                    domain = Domain(**domain_data)
                    self.domains[domain.id] = domain

            # Import accountabilities
            if "accountabilities" in state:
                for acc_data in state["accountabilities"].values():
                    acc = Accountability(**acc_data)
                    self.accountabilities[acc.id] = acc

            # Import circles
            if "circles" in state:
                for circle_id, members_data in state["circles"].items():
                    members = []
                    for member_data in members_data:
                        # Handle datetime parsing
                        if "last_update" in member_data and member_data["last_update"]:
                            member_data["last_update"] = datetime.datetime.fromisoformat(member_data["last_update"])
                        member = CircleMember(**member_data)
                        members.append(member)
                    self.circles[circle_id] = members

            logger.info("Imported governance state successfully")

        except Exception as e:
            logger.error(f"Failed to import governance state: {e}")
            raise


def main():
    """Main entry point for governance orchestrator"""
    import argparse

    parser = argparse.ArgumentParser(description="Governance Orchestrator")
    parser.add_argument("--config", type=Path, help="Path to governance config file")
    parser.add_argument("--export", type=Path, help="Export governance state to file")
    parser.add_argument("--import-state", type=Path, help="Import governance state from file")
    parser.add_argument("--health", action="store_true", help="Show governance health assessment")
    parser.add_argument("--circles", action="store_true", help="Show circle performance metrics")

    args = parser.parse_args()

    orchestrator = GovernanceOrchestrator(args.config)

    if args.export:
        state = orchestrator.export_governance_state()
        with open(args.export, 'w') as f:
            json.dump(state, f, indent=2, default=str)
        print(f"Exported governance state to {args.export}")

    elif args.import_state:
        with open(args.import_state, 'r') as f:
            state = json.load(f)
        orchestrator.import_governance_state(state)
        print(f"Imported governance state from {args.import_state}")

    elif args.health:
        health = orchestrator.assess_governance_health()
        print(json.dumps(health, indent=2))

    elif args.circles:
        circle_metrics = {}
        for circle_id in orchestrator.circles.keys():
            circle_metrics[circle_id] = orchestrator.get_circle_performance(circle_id)
        print(json.dumps(circle_metrics, indent=2))

    else:
        # Default: show governance overview
        health = orchestrator.assess_governance_health()
        print("Governance Overview:")
        print(f"Status: {health['status']}")
        print(f"Purposes: {health['metrics']['purposes']}")
        print(f"Domains: {health['metrics']['domains']}")
        print(f"Accountabilities: {health['metrics']['accountabilities']}")
        print(f"Circles: {health['metrics']['circles']}")
        print(f"Total Members: {health['metrics']['total_members']}")

        if health['issues']:
            print("\nIssues:")
            for issue in health['issues']:
                print(f"  - {issue}")

        if health['recommendations']:
            print("\nRecommendations:")
            for rec in health['recommendations']:
                print(f"  - {rec}")


if __name__ == "__main__":
    main()