#!/usr/bin/env python3
"""
Portfolio Hierarchy DDD Models
Domain-Driven Design for legal advocacy portfolio management

@business-context WSJF-PORTFOLIO: Core domain models for legal advocacy portfolio.
    Portfolio, Dispute, Organization are aggregate roots. WSJFScore, ROAMRisk,
    MonetaryAmount, SystemicScore are value objects. These drive all prioritization
    and litigation-readiness decisions.
@adr ADR-017: Portfolio Hierarchy Architecture chose DDD aggregate pattern over
    flat relational model to enforce invariants at the domain boundary.
@constraint DDD-PORTFOLIO: No imports from infrastructure layer. Models must be
    framework-agnostic (no Flask/Django/SQLAlchemy dependencies).
@planned-change R-2026-007: Dispute aggregate will gain eviction-specific fields
    when 26CV007491-590 defense strategy is codified.

DoR: Domain vocabulary defined, DDD aggregate/value object/entity patterns decided (ADR-017)
DoD: All domain classes importable, frozen value objects enforce immutability,
     aggregate roots maintain invariants, ≥80% unit test coverage
"""

from dataclasses import dataclass, field
from datetime import datetime, date
from decimal import Decimal
from typing import Dict, List, Optional, Set
from enum import Enum
import uuid


class PortfolioStatus(Enum):
    ACTIVE = "active"
    SETTLED = "settled"
    LITIGATION = "litigation"
    DEFERRED = "deferred"
    CLOSED = "closed"


class RiskLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass(frozen=True)
class WSJFScore:
    """Value object for WSJF calculation"""
    business_value: float
    time_criticality: float
    risk_opportunity: float
    job_size: float
    
    @property
    def score(self) -> float:
        """Calculate WSJF score"""
        if self.job_size <= 0:
            return 0.0
        return (self.business_value + self.time_criticality + self.risk_opportunity) / self.job_size
    
    @property
    def priority(self) -> str:
        """Get priority classification"""
        if self.score >= 20:
            return "CRITICAL"
        elif self.score >= 15:
            return "HIGH"
        elif self.score >= 10:
            return "MEDIUM"
        else:
            return "LOW"


@dataclass(frozen=True)
class ROAMRisk:
    """Value object for ROAM risk assessment"""
    situational: RiskLevel
    strategic: RiskLevel
    systemic: RiskLevel
    
    @property
    def multiplier(self) -> float:
        """Calculate risk multiplier"""
        risk_values = {
            RiskLevel.LOW: 1.0,
            RiskLevel.MEDIUM: 1.5,
            RiskLevel.HIGH: 2.0,
            RiskLevel.CRITICAL: 3.0
        }
        
        sit = risk_values[self.situational]
        strat = risk_values[self.strategic]
        sys = risk_values[self.systemic]
        
        # Geometric mean for balanced impact
        return (sit * strat * sys) ** (1/3)
    
    @property
    def overall_risk(self) -> RiskLevel:
        """Get overall risk level"""
        avg_value = (self.multiplier - 1.0) / 2.0  # Normalize to 0-1
        
        if avg_value >= 0.75:
            return RiskLevel.CRITICAL
        elif avg_value >= 0.5:
            return RiskLevel.HIGH
        elif avg_value >= 0.25:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW


@dataclass(frozen=True)
class MonetaryAmount:
    """Value object for monetary amounts with currency"""
    amount: Decimal
    currency: str = "USD"
    
    def __add__(self, other: 'MonetaryAmount') -> 'MonetaryAmount':
        if self.currency != other.currency:
            raise ValueError("Currency mismatch")
        return MonetaryAmount(self.amount + other.amount, self.currency)
    
    def __mul__(self, multiplier: float) -> 'MonetaryAmount':
        return MonetaryAmount(self.amount * Decimal(str(multiplier)), self.currency)
    
    def __str__(self) -> str:
        return f"{self.currency} {self.amount:,.2f}"


@dataclass(frozen=True)
class SystemicScore:
    """Value object for systemic indifference scoring"""
    timeline_months: float
    evidence_count: int
    org_levels: int
    pattern_consistency: float
    
    @property
    def score(self) -> int:
        """Calculate systemic score 0-40"""
        score = 0
        
        # Timeline weight (max 10)
        if self.timeline_months >= 24:
            score += 10
        elif self.timeline_months >= 12:
            score += 7
        elif self.timeline_months >= 6:
            score += 4
        elif self.timeline_months >= 3:
            score += 2
        
        # Evidence weight (max 10)
        if self.evidence_count >= 40:
            score += 10
        elif self.evidence_count >= 20:
            score += 7
        elif self.evidence_count >= 10:
            score += 4
        elif self.evidence_count >= 5:
            score += 2
        
        # Org levels weight (max 10)
        if self.org_levels >= 4:
            score += 10
        elif self.org_levels >= 3:
            score += 7
        elif self.org_levels >= 2:
            score += 4
        else:
            score += 1
        
        # Pattern consistency weight (max 10)
        score += int(self.pattern_consistency * 10)
        
        return min(score, 40)
    
    @property
    def verdict(self) -> str:
        """Get litigation readiness verdict"""
        score = self.score
        
        if score >= 35:
            return "LITIGATION-READY (complete SoR)"
        elif score >= 25:
            return "STRONG SETTLEMENT (substantial SoR)"
        elif score >= 15:
            return "SETTLEMENT-ONLY (insufficient evidence)"
        elif score >= 10:
            return "DEFER TO PHASE LATER"
        else:
            return "NOT SYSTEMIC (isolated event)"


@dataclass
class Organization:
    """Entity representing opposing organization"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    org_type: str = ""  # property_management, bank, telecom, government
    contact_info: Dict[str, str] = field(default_factory=dict)
    
    # Systemic analysis
    systemic_score: Optional[SystemicScore] = None
    evidence_chains: List[str] = field(default_factory=list)
    
    def add_evidence(self, evidence: str):
        """Add evidence chain"""
        self.evidence_chains.append(evidence)
    
    def calculate_systemic_score(self) -> SystemicScore:
        """Calculate systemic indifference score"""
        if self.systemic_score:
            return self.systemic_score
        
        # Default calculation based on available evidence
        timeline = 0.0  # Would be calculated from evidence dates
        evidence_count = len(self.evidence_chains)
        org_levels = 2  # Default assumption
        consistency = 0.5  # Default assumption
        
        self.systemic_score = SystemicScore(
            timeline_months=timeline,
            evidence_count=evidence_count,
            org_levels=org_levels,
            pattern_consistency=consistency
        )
        
        return self.systemic_score


@dataclass
class LegalCase:
    """Aggregate root for legal case management"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    case_number: str = ""
    jurisdiction: str = ""
    status: PortfolioStatus = PortfolioStatus.ACTIVE
    
    # Key dates
    filing_date: Optional[date] = None
    settlement_deadline: Optional[date] = None
    next_court_date: Optional[date] = None
    
    # Financials
    claimed_amount: Optional[MonetaryAmount] = None
    settlement_amount: Optional[MonetaryAmount] = None
    costs_incurred: List[MonetaryAmount] = field(default_factory=list)
    
    # Strategic metrics
    wsjf_score: Optional[WSJFScore] = None
    roam_risk: Optional[ROAMRisk] = None
    
    # Opposition
    opposing_organizations: List[Organization] = field(default_factory=list)
    
    # Evidence and documents
    evidence_count: int = 0
    document_count: int = 0
    
    def add_opposing_org(self, org: Organization):
        """Add opposing organization"""
        self.opposing_organizations.append(org)
    
    def calculate_wsjf(self, business_value: float, time_criticality: float, 
                      risk_opportunity: float, job_size: float) -> WSJFScore:
        """Calculate WSJF score for case"""
        self.wsjf_score = WSJFScore(
            business_value=business_value,
            time_criticality=time_criticality,
            risk_opportunity=risk_opportunity,
            job_size=job_size
        )
        return self.wsjf_score
    
    def calculate_roam_risk(self, situational: RiskLevel, strategic: RiskLevel,
                           systemic: RiskLevel) -> ROAMRisk:
        """Calculate ROAM risk assessment"""
        self.roam_risk = ROAMRisk(
            situational=situational,
            strategic=strategic,
            systemic=systemic
        )
        return self.roam_risk
    
    def get_total_costs(self) -> MonetaryAmount:
        """Calculate total costs incurred"""
        if not self.costs_incurred:
            return MonetaryAmount(Decimal('0'))
        
        total = self.costs_incurred[0]
        for cost in self.costs_incurred[1:]:
            total = total + cost
        return total
    
    def days_to_deadline(self) -> Optional[int]:
        """Calculate days to settlement deadline"""
        if not self.settlement_deadline:
            return None
        
        today = date.today()
        delta = self.settlement_deadline - today
        return delta.days


@dataclass
class Portfolio:
    """Aggregate root for entire legal portfolio"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Legal Advocacy Portfolio"
    owner: str = ""
    
    # Portfolio cases
    cases: List[LegalCase] = field(default_factory=list)
    
    # Portfolio metrics
    total_claimed_value: Optional[MonetaryAmount] = None
    total_settlement_value: Optional[MonetaryAmount] = None
    total_costs: Optional[MonetaryAmount] = None
    
    # Strategic overview
    active_cases: int = 0
    settled_cases: int = 0
    litigation_ready_cases: int = 0
    
    def add_case(self, case: LegalCase):
        """Add case to portfolio"""
        self.cases.append(case)
        self._update_metrics()
    
    def _update_metrics(self):
        """Update portfolio metrics"""
        self.active_cases = sum(1 for case in self.cases if case.status == PortfolioStatus.ACTIVE)
        self.settled_cases = sum(1 for case in self.cases if case.status == PortfolioStatus.SETTLED)
        self.litigation_ready_cases = sum(
            1 for case in self.cases
            if any(org.systemic_score and org.systemic_score.score >= 35 
                  for org in case.opposing_organizations)
        )
        
        # Calculate financial totals
        claimed_amounts = [case.claimed_amount for case in self.cases if case.claimed_amount]
        if claimed_amounts:
            self.total_claimed_value = claimed_amounts[0]
            for amount in claimed_amounts[1:]:
                self.total_claimed_value = self.total_claimed_value + amount
        
        settlement_amounts = [case.settlement_amount for case in self.cases if case.settlement_amount]
        if settlement_amounts:
            self.total_settlement_value = settlement_amounts[0]
            for amount in settlement_amounts[1:]:
                self.total_settlement_value = self.total_settlement_value + amount
        
        all_costs = []
        for case in self.cases:
            all_costs.extend(case.costs_incurred)
        
        if all_costs:
            self.total_costs = all_costs[0]
            for cost in all_costs[1:]:
                self.total_costs = self.total_costs + cost
    
    def get_cases_by_status(self, status: PortfolioStatus) -> List[LegalCase]:
        """Get cases filtered by status"""
        return [case for case in self.cases if case.status == status]
    
    def get_high_priority_cases(self, min_wsjf: float = 15.0) -> List[LegalCase]:
        """Get high priority cases by WSJF score"""
        return [
            case for case in self.cases
            if case.wsjf_score and case.wsjf_score.score >= min_wsjf
        ]
    
    def get_systemic_organizations(self) -> Dict[str, Organization]:
        """Get all organizations with systemic indifference"""
        systemic_orgs = {}
        
        for case in self.cases:
            for org in case.opposing_organizations:
                if org.systemic_score and org.systemic_score.score >= 15:
                    systemic_orgs[org.name] = org
        
        return systemic_orgs


# Domain Services
@dataclass
class PortfolioAnalyticsService:
    """Domain service for portfolio analytics"""
    
    @staticmethod
    def calculate_portfolio_health(portfolio: Portfolio) -> Dict:
        """Calculate overall portfolio health metrics"""
        
        total_cases = len(portfolio.cases)
        if total_cases == 0:
            return {"health_score": 0, "status": "EMPTY"}
        
        # Health factors
        active_ratio = portfolio.active_cases / total_cases
        settled_ratio = portfolio.settled_cases / total_cases
        litigation_ready_ratio = portfolio.litigation_ready_cases / total_cases
        
        # Calculate health score (0-100)
        health_score = (
            settled_ratio * 40 +  # Success rate
            (1 - active_ratio) * 30 +  # Closure rate
            litigation_ready_ratio * 30  # Litigation readiness
        )
        
        # Status classification
        if health_score >= 80:
            status = "EXCELLENT"
        elif health_score >= 60:
            status = "GOOD"
        elif health_score >= 40:
            status = "FAIR"
        else:
            status = "POOR"
        
        return {
            "health_score": round(health_score, 1),
            "status": status,
            "active_cases": portfolio.active_cases,
            "settled_cases": portfolio.settled_cases,
            "litigation_ready_cases": portfolio.litigation_ready_cases,
            "total_cases": total_cases
        }
    
    @staticmethod
    def generate_wsif_priorities(portfolio: Portfolio) -> List[Dict]:
        """Generate WSJF prioritized list of cases"""
        
        cases_with_wsjf = [
            {
                "case_id": case.id,
                "case_number": case.case_number,
                "wsjf_score": case.wsjf_score.score if case.wsjf_score else 0,
                "priority": case.wsjf_score.priority if case.wsjf_score else "LOW",
                "days_to_deadline": case.days_to_deadline(),
                "status": case.status.value
            }
            for case in portfolio.cases
            if case.wsjf_score
        ]
        
        # Sort by WSJF score descending
        cases_with_wsjf.sort(key=lambda x: x["wsjf_score"], reverse=True)
        
        return cases_with_wsjf


# Repository Interface (for actual implementation)
class PortfolioRepository:
    """Repository interface for Portfolio aggregate"""
    
    def save(self, portfolio: Portfolio) -> Portfolio:
        raise NotImplementedError
    
    def find_by_id(self, portfolio_id: str) -> Optional[Portfolio]:
        raise NotImplementedError
    
    def find_by_owner(self, owner: str) -> List[Portfolio]:
        raise NotImplementedError


# Factory for creating test data
class PortfolioFactory:
    """Factory for creating portfolio instances"""
    
    @staticmethod
    def create_maa_case() -> LegalCase:
        """Create MAA case with real data"""
        
        # Create MAA organization
        maa = Organization(
            name="Mid-America Apartment Communities",
            org_type="property_management"
        )
        
        # Add systemic score
        maa.systemic_score = SystemicScore(
            timeline_months=22.0,
            evidence_count=40,
            org_levels=4,
            pattern_consistency=0.95
        )
        
        # Create case
        case = LegalCase(
            case_number="MAA-26CV005596-590",
            jurisdiction="NC",
            filing_date=date(2024, 6, 1),
            settlement_deadline=date(2026, 2, 13),
            claimed_amount=MonetaryAmount(Decimal('50000.00')),
            status=PortfolioStatus.ACTIVE
        )
        
        case.add_opposing_org(maa)
        case.calculate_wsjf(
            business_value=20.0,
            time_criticality=18.0,
            risk_opportunity=15.0,
            job_size=2.0
        )
        
        case.calculate_roam_risk(
            situational=RiskLevel.MEDIUM,
            strategic=RiskLevel.HIGH,
            systemic=RiskLevel.CRITICAL
        )
        
        return case
    
    @staticmethod
    def create_sample_portfolio() -> Portfolio:
        """Create sample portfolio with MAA case"""
        
        portfolio = Portfolio(
            name="Legal Advocacy Portfolio",
            owner="Shahrooz Bhopti"
        )
        
        # Add MAA case
        maa_case = PortfolioFactory.create_maa_case()
        portfolio.add_case(maa_case)
        
        return portfolio


def main():
    """Demo of DDD models"""
    
    # Create sample portfolio
    portfolio = PortfolioFactory.create_sample_portfolio()
    
    # Generate analytics
    analytics = PortfolioAnalyticsService()
    health = analytics.calculate_portfolio_health(portfolio)
    priorities = analytics.generate_wsif_priorities(portfolio)
    
    print("=== PORTFOLIO ANALYTICS ===")
    print(f"Health Score: {health['health_score']}/100 ({health['status']})")
    print(f"Active Cases: {health['active_cases']}")
    print(f"Settled Cases: {health['settled_cases']}")
    print(f"Litigation Ready: {health['litigation_ready_cases']}")
    
    print("\n=== WSJF PRIORITIES ===")
    for case in priorities:
        print(f"{case['case_number']}: WSJF {case['wsjf_score']:.1f} ({case['priority']})")
    
    print("\n=== SYSTEMIC ORGANIZATIONS ===")
    systemic_orgs = portfolio.get_systemic_organizations()
    for name, org in systemic_orgs.items():
        score = org.systemic_score
        print(f"{name}: {score.score}/40 - {score.verdict}")


if __name__ == "__main__":
    main()
