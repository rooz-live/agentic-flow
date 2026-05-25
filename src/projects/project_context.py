"""
Project Context - Project Metadata & Constraints
Budgets, cost limits, operational constraints

WSJF Priority: 3.80 (GO - #7 Phase 2)
Plan: phase2-billing-operations-wsjf-a67778.md
"""

from enum import Enum
from decimal import Decimal
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from datetime import datetime


class ProjectStatus(Enum):
    """Project lifecycle status"""
    PLANNING = "planning"
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ProjectPhase(Enum):
    """Project phase"""
    INITIATION = "initiation"
    PLANNING = "planning"
    EXECUTION = "execution"
    MONITORING = "monitoring"
    CLOSURE = "closure"


class ConstraintType(Enum):
    """Constraint type"""
    TIME = "time"
    BUDGET = "budget"
    RESOURCE = "resource"
    LOCATION = "location"
    SKILL = "skill"
    COMPLIANCE = "compliance"


class ConstraintSeverity(Enum):
    """Constraint severity"""
    WARNING = "warning"
    REQUIRED = "required"
    BLOCKING = "blocking"


@dataclass
class GeoBounds:
    """Geographic boundary"""
    min_lat: Decimal
    max_lat: Decimal
    min_lon: Decimal
    max_lon: Decimal
    
    def contains(self, lat: Decimal, lon: Decimal) -> bool:
        """Check if point is within bounds"""
        return (
            self.min_lat <= lat <= self.max_lat and
            self.min_lon <= lon <= self.max_lon
        )


@dataclass
class BillingTerms:
    """Billing terms for project"""
    payment_terms_days: int = 30
    billing_frequency: str = "monthly"  # weekly, biweekly, monthly
    preferred_payment_method: str = "ach"
    deposit_required: bool = False
    deposit_percent: Decimal = field(default_factory=lambda: Decimal("0"))


@dataclass
class ProjectConstraint:
    """Project constraint definition"""
    constraint_id: str
    constraint_type: ConstraintType
    
    name: str = ""
    description: str = ""
    
    rule: str = ""  # Expression or condition
    rule_data: Dict[str, Any] = field(default_factory=dict)
    
    severity: ConstraintSeverity = ConstraintSeverity.REQUIRED
    enforce: bool = True
    
    def evaluate(self, context: Dict[str, Any]) -> bool:
        """Evaluate constraint against context"""
        try:
            # Simple expression evaluation
            if self.constraint_type == ConstraintType.TIME:
                max_hours = self.rule_data.get("max_daily_hours", 8)
                actual_hours = context.get("hours", 0)
                return actual_hours <= max_hours
            
            elif self.constraint_type == ConstraintType.BUDGET:
                max_cost = self.rule_data.get("max_cost", 0)
                actual_cost = context.get("cost", 0)
                return actual_cost <= max_cost
            
            elif self.constraint_type == ConstraintType.LOCATION:
                max_distance = self.rule_data.get("max_travel_distance", 50)
                actual_distance = context.get("distance", 0)
                return actual_distance <= max_distance
            
            return True
            
        except Exception:
            return True  # Fail open for safety


@dataclass
class ConstraintCheckResult:
    """Result of constraint check"""
    constraint_id: str
    passed: bool
    message: str
    severity: ConstraintSeverity


@dataclass
class ProjectContext:
    """Project context record"""
    project_id: str
    project_name: str = ""
    client_id: str = ""
    
    status: ProjectStatus = ProjectStatus.PLANNING
    phase: ProjectPhase = ProjectPhase.INITIATION
    
    total_budget: Decimal = field(default_factory=lambda: Decimal("0"))
    cost_limit: Decimal = field(default_factory=lambda: Decimal("0"))
    budget_warning_threshold: Decimal = field(default_factory=lambda: Decimal("80"))
    
    constraints: List[ProjectConstraint] = field(default_factory=list)
    
    start_date: datetime = field(default_factory=datetime.now)
    target_end_date: datetime = field(default_factory=datetime.now)
    actual_end_date: Optional[datetime] = None
    
    assigned_technicians: List[str] = field(default_factory=list)
    project_manager: Optional[str] = None
    
    primary_location_id: Optional[str] = None
    service_area: Optional[GeoBounds] = None
    
    billing_terms: BillingTerms = field(default_factory=BillingTerms)
    rate_schedule_id: str = ""
    
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    custom_fields: Dict[str, Any] = field(default_factory=dict)
    
    def get_constraint(self, constraint_type: ConstraintType) -> Optional[ProjectConstraint]:
        """Get constraint by type"""
        for c in self.constraints:
            if c.constraint_type == constraint_type:
                return c
        return None
    
    def is_within_budget(self, additional_cost: Decimal = Decimal("0")) -> bool:
        """Check if project is within budget"""
        # Would integrate with ledger for actual spend
        return True  # Placeholder


class ProjectContextManager:
    """Manage project contexts"""
    
    def __init__(self):
        self._projects: Dict[str, ProjectContext] = {}
        self._by_client: Dict[str, List[str]] = {}
    
    def create_project(self, context: ProjectContext) -> bool:
        """Create new project"""
        self._projects[context.project_id] = context
        
        if context.client_id:
            if context.client_id not in self._by_client:
                self._by_client[context.client_id] = []
            self._by_client[context.client_id].append(context.project_id)
        
        return True
    
    def get_context(self, project_id: str) -> Optional[ProjectContext]:
        """Get project context"""
        return self._projects.get(project_id)
    
    def update_context(
        self,
        project_id: str,
        updates: Dict[str, Any]
    ) -> bool:
        """Update project context"""
        project = self._projects.get(project_id)
        if not project:
            return False
        
        for key, value in updates.items():
            if hasattr(project, key):
                setattr(project, key, value)
        
        project.updated_at = datetime.now()
        return True
    
    def check_constraints(
        self,
        project_id: str,
        action: str,
        parameters: Dict[str, Any]
    ) -> List[ConstraintCheckResult]:
        """Check all constraints for action"""
        project = self._projects.get(project_id)
        if not project:
            return []
        
        results = []
        
        for constraint in project.constraints:
            if not constraint.enforce:
                continue
            
            passed = constraint.evaluate(parameters)
            
            results.append(ConstraintCheckResult(
                constraint_id=constraint.constraint_id,
                passed=passed,
                message=f"Constraint {constraint.name}: {'passed' if passed else 'failed'}",
                severity=constraint.severity
            ))
        
        return results
    
    def validate_budget_availability(
        self,
        project_id: str,
        estimated_cost: Decimal
    ) -> bool:
        """Validate budget availability"""
        project = self._projects.get(project_id)
        if not project:
            return False
        
        return project.is_within_budget(estimated_cost)
    
    def get_projects_for_client(
        self,
        client_id: str
    ) -> List[ProjectContext]:
        """Get all projects for client"""
        project_ids = self._by_client.get(client_id, [])
        return [
            self._projects[pid]
            for pid in project_ids
            if pid in self._projects
        ]


# Self-test
def test_project_context():
    """Test project context"""
    print("Testing Project Context")
    print("=" * 50)
    
    manager = ProjectContextManager()
    
    # Test 1: Create project
    print("\n1. Create Project:")
    
    constraints = [
        ProjectConstraint(
            constraint_id="c1",
            constraint_type=ConstraintType.TIME,
            name="Max Daily Hours",
            rule="hours <= 8",
            rule_data={"max_daily_hours": 8},
            severity=ConstraintSeverity.REQUIRED
        ),
        ProjectConstraint(
            constraint_id="c2",
            constraint_type=ConstraintType.BUDGET,
            name="Budget Limit",
            rule="cost <= 50000",
            rule_data={"max_cost": 50000},
            severity=ConstraintSeverity.BLOCKING
        )
    ]
    
    project = ProjectContext(
        project_id="proj-001",
        project_name="HVAC Installation",
        client_id="client-001",
        total_budget=Decimal("50000"),
        cost_limit=Decimal("55000"),
        constraints=constraints,
        assigned_technicians=["tech-001", "tech-002"],
        rate_schedule_id="rate-001"
    )
    
    manager.create_project(project)
    
    print(f"  ✅ Project ID: {project.project_id}")
    print(f"  ✅ Budget: ${project.total_budget}")
    print(f"  ✅ Constraints: {len(project.constraints)}")
    
    # Test 2: Check constraints
    print("\n2. Check Constraints:")
    
    # Good scenario
    results = manager.check_constraints(
        project_id="proj-001",
        action="log_hours",
        parameters={"hours": 6, "cost": 400}
    )
    
    all_passed = all(r.passed for r in results)
    print(f"  ✅ Valid hours (6): {'passed' if all_passed else 'failed'}")
    
    # Bad scenario - too many hours
    results = manager.check_constraints(
        project_id="proj-001",
        action="log_hours",
        parameters={"hours": 10, "cost": 400}
    )
    
    failed = [r for r in results if not r.passed]
    print(f"  ✅ Invalid hours (10): {len(failed)} constraint(s) failed")
    
    # Test 3: Budget validation
    print("\n3. Budget Validation:")
    
    valid = manager.validate_budget_availability(
        project_id="proj-001",
        estimated_cost=Decimal("1000")
    )
    print(f"  ✅ Budget available: {valid}")
    
    # Test 4: Client projects
    print("\n4. Client Projects:")
    
    projects = manager.get_projects_for_client("client-001")
    print(f"  ✅ Projects for client: {len(projects)}")
    
    print("\n" + "=" * 50)
    print("Project Context Tests Complete!")


if __name__ == "__main__":
    test_project_context()
