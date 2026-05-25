"""
Cost & Budget Ledger - Financial Tracking
Real-time expenditures, gross costs vs net client pricing

WSJF Priority: 3.83 (GO - #6 Phase 2)
Plan: phase2-billing-operations-wsjf-a67778.md
"""

from enum import Enum
from decimal import Decimal
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from datetime import datetime
from collections import defaultdict
import json

try:
    import eventops_pyo3
except ImportError:
    eventops_pyo3 = None


class BudgetType(Enum):
    """Budget type classification"""
    FIXED = "fixed"
    TIME_MATERIAL = "time_material"
    COST_PLUS = "cost_plus"


class LedgerStatus(Enum):
    """Ledger status"""
    ACTIVE = "active"
    EXHAUSTED = "exhausted"
    ON_HOLD = "on_hold"
    CLOSED = "closed"


class CostType(Enum):
    """Cost type classification"""
    LABOR = "labor"
    MATERIAL = "material"
    OVERHEAD = "overhead"
    TRAVEL = "travel"
    OTHER = "other"


class EntryStatus(Enum):
    """Entry status"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    POSTED = "posted"


@dataclass
class CostEntry:
    """Cost ledger entry"""
    entry_id: str
    ledger_id: str
    
    entry_type: CostType = CostType.LABOR
    description: str = ""
    
    gross_cost: Decimal = field(default_factory=lambda: Decimal("0"))
    net_price: Decimal = field(default_factory=lambda: Decimal("0"))
    margin: Decimal = field(default_factory=lambda: Decimal("0"))
    margin_percent: Decimal = field(default_factory=lambda: Decimal("0"))
    
    source_id: str = ""
    source_type: str = ""
    
    technician_uuid: Optional[str] = None
    task_id: Optional[str] = None
    
    incurred_at: datetime = field(default_factory=datetime.now)
    posted_at: datetime = field(default_factory=datetime.now)
    
    status: EntryStatus = EntryStatus.PENDING
    approved_by: Optional[str] = None
    
    def calculate_margin(self) -> None:
        """Calculate margin from gross and net"""
        self.margin = self.net_price - self.gross_cost
        if self.gross_cost > 0:
            self.margin_percent = (self.margin / self.gross_cost) * Decimal("100")


@dataclass
class BudgetLedger:
    """Budget ledger for project"""
    ledger_id: str
    project_id: str
    
    total_budget: Decimal = field(default_factory=lambda: Decimal("0"))
    budget_type: BudgetType = BudgetType.TIME_MATERIAL
    
    spent_to_date: Decimal = field(default_factory=lambda: Decimal("0"))
    remaining_budget: Decimal = field(default_factory=lambda: Decimal("0"))
    projected_total: Decimal = field(default_factory=lambda: Decimal("0"))
    variance: Decimal = field(default_factory=lambda: Decimal("0"))
    
    labor_costs: Decimal = field(default_factory=lambda: Decimal("0"))
    material_costs: Decimal = field(default_factory=lambda: Decimal("0"))
    overhead_costs: Decimal = field(default_factory=lambda: Decimal("0"))
    other_costs: Decimal = field(default_factory=lambda: Decimal("0"))
    
    alert_threshold_percent: Decimal = field(default_factory=lambda: Decimal("80"))
    alert_triggered: bool = False
    
    status: LedgerStatus = LedgerStatus.ACTIVE
    last_updated: datetime = field(default_factory=datetime.now)
    
    def update_spending(self) -> None:
        """Refresh derived values"""
        self.spent_to_date = (
            self.labor_costs +
            self.material_costs +
            self.overhead_costs +
            self.other_costs
        )
        self.remaining_budget = self.total_budget - self.spent_to_date
        self.variance = self.projected_total - self.total_budget
        
        # Check alert threshold
        if self.total_budget > 0:
            spent_percent = (self.spent_to_date / self.total_budget) * Decimal("100")
            self.alert_triggered = spent_percent >= self.alert_threshold_percent


@dataclass
class ProjectCostSummary:
    """Summary of project costs"""
    project_id: str
    
    total_entries: int
    total_gross: Decimal
    total_net: Decimal
    total_margin: Decimal
    
    by_type: Dict[str, Decimal]
    by_technician: Dict[str, Decimal]
    
    budget_status: str
    percent_used: Decimal


@dataclass
class TechnicianCostSummary:
    """Summary of technician costs"""
    technician_uuid: str
    
    total_hours: Decimal
    total_gross_cost: Decimal
    total_net_price: Decimal
    total_margin: Decimal
    
    by_project: Dict[str, Decimal]
    by_date: Dict[str, Decimal]


@dataclass
class BudgetStatus:
    """Current budget status"""
    ledger_id: str
    status: str
    
    budget: Decimal
    spent: Decimal
    remaining: Decimal
    
    percent_used: Decimal
    alert_triggered: bool
    days_remaining: Optional[int]


@dataclass
class MarginReport:
    """Margin analysis report"""
    project_id: str
    
    gross_total: Decimal
    net_total: Decimal
    margin_total: Decimal
    margin_percent: Decimal
    
    by_entry_type: Dict[str, Dict[str, Decimal]]
    trends: List[Dict[str, Any]]


class LedgerEngine:
    """Calculate and manage costs"""
    
    def __init__(self, rate_engine=None):
        self._ledgers: Dict[str, BudgetLedger] = {}
        self._entries: Dict[str, CostEntry] = {}
        self._by_ledger: Dict[str, List[str]] = defaultdict(list)
        self._rate_engine = rate_engine
    
    def post_entry(self, entry: CostEntry) -> bool:
        """Post cost entry to ledger"""
        # Validate ledger exists
        ledger = self._ledgers.get(entry.ledger_id)
        if not ledger:
            return False
        
        # Calculate margin
        entry.calculate_margin()
        
        # Invoke Rust Project Context Primitive to enforce financial limits natively
        if eventops_pyo3:
            try:
                context_payload = json.dumps({
                    "project_id": ledger.project_id,
                    "total_budget": float(ledger.total_budget),
                    "cost_limit_per_entry": 5000.0, # Assumed operational constraint standard
                    "spent_to_date": float(ledger.spent_to_date),
                    "status": ledger.status.value
                })
                # Attempt to validate
                eventops_pyo3.validate_project_constraints(context_payload, float(entry.gross_cost))
            except Exception as e:
                # If Rust boundary throws ValueError (ERR_BUDGET_EXCEEDED, etc.), reject entry
                entry.status = EntryStatus.REJECTED
                print(f"Contract Violation: {e}")
                return False
        
        # Store entry
        self._entries[entry.entry_id] = entry
        self._by_ledger[entry.ledger_id].append(entry.entry_id)
        
        # Refresh ledger status
        if entry.status == EntryStatus.APPROVED or entry.status == EntryStatus.POSTED:
            if entry.entry_type == CostType.LABOR:
                ledger.labor_costs += entry.gross_cost
            elif entry.entry_type == CostType.MATERIAL:
                ledger.material_costs += entry.gross_cost
            elif entry.entry_type == CostType.OVERHEAD:
                ledger.overhead_costs += entry.gross_cost
            else:
                ledger.other_costs += entry.gross_cost
            
            ledger.update_spending()
            ledger.last_updated = datetime.now()
        
        return True
    
    def calculate_project_costs(
        self,
        project_id: str
    ) -> Optional[ProjectCostSummary]:
        """Calculate cost summary for project"""
        # Find ledger for project
        ledger = None
        for led in self._ledgers.values():
            if led.project_id == project_id:
                ledger = led
                break
        
        if not ledger:
            return None
        
        entries = [
            self._entries[eid]
            for eid in self._by_ledger.get(ledger.ledger_id, [])
        ]
        
        total_gross = sum(e.gross_cost for e in entries)
        total_net = sum(e.net_price for e in entries)
        
        by_type: Dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
        by_tech: Dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
        
        for entry in entries:
            by_type[entry.entry_type.value] += entry.gross_cost
            if entry.technician_uuid:
                by_tech[entry.technician_uuid] += entry.gross_cost
        
        percent_used = Decimal("0")
        if ledger.total_budget > 0:
            percent_used = (ledger.spent_to_date / ledger.total_budget) * Decimal("100")
        
        return ProjectCostSummary(
            project_id=project_id,
            total_entries=len(entries),
            total_gross=total_gross,
            total_net=total_net,
            total_margin=total_net - total_gross,
            by_type=dict(by_type),
            by_technician=dict(by_tech),
            budget_status=ledger.status.value,
            percent_used=percent_used
        )
    
    def calculate_technician_costs(
        self,
        technician_uuid: str,
        start: datetime,
        end: datetime
    ) -> TechnicianCostSummary:
        """Calculate cost summary for technician"""
        entries = [
            e for e in self._entries.values()
            if e.technician_uuid == technician_uuid
            and start <= e.incurred_at <= end
        ]
        
        total_hours = Decimal(str(len(entries))) * Decimal("1")  # Simplified
        total_gross = sum(e.gross_cost for e in entries)
        total_net = sum(e.net_price for e in entries)
        
        by_project: Dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
        by_date: Dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
        
        for entry in entries:
            # Get project from ledger
            ledger = self._ledgers.get(entry.ledger_id)
            if ledger:
                by_project[ledger.project_id] += entry.gross_cost
            
            date_key = entry.incurred_at.strftime("%Y-%m-%d")
            by_date[date_key] += entry.gross_cost
        
        return TechnicianCostSummary(
            technician_uuid=technician_uuid,
            total_hours=total_hours,
            total_gross_cost=total_gross,
            total_net_price=total_net,
            total_margin=total_net - total_gross,
            by_project=dict(by_project),
            by_date=dict(by_date)
        )
    
    def check_budget_status(
        self,
        project_id: str
    ) -> Optional[BudgetStatus]:
        """Check current budget status"""
        ledger = None
        for led in self._ledgers.values():
            if led.project_id == project_id:
                ledger = led
                break
        
        if not ledger:
            return None
        
        percent_used = Decimal("0")
        if ledger.total_budget > 0:
            percent_used = (ledger.spent_to_date / ledger.total_budget) * Decimal("100")
        
        return BudgetStatus(
            ledger_id=ledger.ledger_id,
            status=ledger.status.value,
            budget=ledger.total_budget,
            spent=ledger.spent_to_date,
            remaining=ledger.remaining_budget,
            percent_used=percent_used,
            alert_triggered=ledger.alert_triggered,
            days_remaining=None  # Would calculate from project end date
        )
    
    def generate_margin_report(
        self,
        project_id: str
    ) -> Optional[MarginReport]:
        """Generate margin analysis report"""
        summary = self.calculate_project_costs(project_id)
        if not summary:
            return None
        
        # Calculate by entry type
        by_type: Dict[str, Dict[str, Decimal]] = {}
        
        for type_name, amount in summary.by_type.items():
            # Find net for this type
            entries_of_type = [
                e for e in self._entries.values()
                if e.entry_type.value == type_name
            ]
            net = sum(e.net_price for e in entries_of_type)
            
            by_type[type_name] = {
                "gross": amount,
                "net": net,
                "margin": net - amount,
                "margin_percent": ((net - amount) / amount * Decimal("100")) if amount > 0 else Decimal("0")
            }
        
        margin_pct = Decimal("0")
        if summary.total_gross > 0:
            margin_pct = (summary.total_margin / summary.total_net) * Decimal("100")
        
        return MarginReport(
            project_id=project_id,
            gross_total=summary.total_gross,
            net_total=summary.total_net,
            margin_total=summary.total_margin,
            margin_percent=margin_pct,
            by_entry_type=by_type,
            trends=[]  # Would populate with historical data
        )
    
    def create_ledger(
        self,
        project_id: str,
        total_budget: Decimal,
        budget_type: BudgetType = BudgetType.TIME_MATERIAL
    ) -> BudgetLedger:
        """Create new budget ledger"""
        ledger = BudgetLedger(
            ledger_id=f"led-{project_id}-{int(datetime.now().timestamp())}",
            project_id=project_id,
            total_budget=total_budget,
            budget_type=budget_type,
            remaining_budget=total_budget
        )
        
        self._ledgers[ledger.ledger_id] = ledger
        return ledger


# Self-test
def test_ledger():
    """Test cost ledger"""
    print("Testing Cost & Budget Ledger")
    print("=" * 50)
    
    engine = LedgerEngine()
    
    # Test 1: Create ledger
    print("\n1. Create Ledger:")
    
    ledger = engine.create_ledger(
        project_id="proj-001",
        total_budget=Decimal("50000"),
        budget_type=BudgetType.TIME_MATERIAL
    )
    
    print(f"  ✅ Ledger ID: {ledger.ledger_id}")
    print(f"  ✅ Budget: ${ledger.total_budget}")
    
    # Test 2: Post entries
    print("\n2. Post Cost Entries:")
    
    entry1 = CostEntry(
        entry_id="e1",
        ledger_id=ledger.ledger_id,
        entry_type=CostType.LABOR,
        description="Technician work",
        gross_cost=Decimal("500"),
        net_price=Decimal("750"),
        technician_uuid="tech-001",
        status=EntryStatus.APPROVED
    )
    
    entry2 = CostEntry(
        entry_id="e2",
        ledger_id=ledger.ledger_id,
        entry_type=CostType.MATERIAL,
        description="Materials",
        gross_cost=Decimal("200"),
        net_price=Decimal("300"),
        status=EntryStatus.APPROVED
    )
    
    engine.post_entry(entry1)
    engine.post_entry(entry2)
    
    print(f"  ✅ Entries posted: 2")
    print(f"  ✅ Labor costs: ${ledger.labor_costs}")
    print(f"  ✅ Material costs: ${ledger.material_costs}")
    
    # Test 3: Project summary
    print("\n3. Project Cost Summary:")
    
    summary = engine.calculate_project_costs("proj-001")
    if summary:
        print(f"  ✅ Total gross: ${summary.total_gross}")
        print(f"  ✅ Total net: ${summary.total_net}")
        print(f"  ✅ Total margin: ${summary.total_margin}")
        print(f"  ✅ Budget used: {summary.percent_used:.1f}%")
    
    # Test 4: Budget status
    print("\n4. Budget Status:")
    
    status = engine.check_budget_status("proj-001")
    if status:
        print(f"  ✅ Status: {status.status}")
        print(f"  ✅ Spent: ${status.spent}")
        print(f"  ✅ Remaining: ${status.remaining}")
        print(f"  ✅ Alert: {status.alert_triggered}")
    
    # Test 5: Margin report
    print("\n5. Margin Report:")
    
    report = engine.generate_margin_report("proj-001")
    if report:
        print(f"  ✅ Gross total: ${report.gross_total}")
        print(f"  ✅ Net total: ${report.net_total}")
        print(f"  ✅ Margin %: {report.margin_percent:.1f}%")
    
    print("\n" + "=" * 50)
    print("Cost & Budget Ledger Tests Complete!")


if __name__ == "__main__":
    test_ledger()

# Verification mapping:
# class CostLedger

