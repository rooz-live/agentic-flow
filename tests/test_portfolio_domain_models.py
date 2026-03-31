#!/usr/bin/env python3
"""
Portfolio Domain Model Unit Tests (COH-001 Gap Closure)
========================================================
Tests for all 12 domain classes in src/domain_models.py:
  Value Objects: WSJFScore, ROAMRisk, MonetaryAmount, SystemicScore
  Enums: PortfolioStatus, RiskLevel
  Entities: Organization
  Aggregate Roots: LegalCase, Portfolio
  Services: PortfolioAnalyticsService
  Repository: PortfolioRepository
  Factory: PortfolioFactory

@business-context WSJF-COH001: These tests close the Python DDD→TDD gap.
    src/domain_models.py had 12 domain classes with zero unit tests.
@adr ADR-017: Tests validate the DDD aggregate pattern invariants.
@constraint DDD-PORTFOLIO: No infrastructure imports — pure domain logic.

DoR: src/domain_models.py readable, all classes importable
DoD: All 12 domain classes tested, ≥2 assertions per class, pytest green
"""

import sys
from pathlib import Path
from datetime import date, datetime
from decimal import Decimal

# Ensure project root on path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.domain_models import (
    PortfolioStatus,
    RiskLevel,
    WSJFScore,
    ROAMRisk,
    MonetaryAmount,
    SystemicScore,
    Organization,
    LegalCase,
    Portfolio,
    PortfolioAnalyticsService,
    PortfolioRepository,
    PortfolioFactory,
)


# ═══════════════════════════════════════════════════════════════════════════════
# VALUE OBJECTS
# ═══════════════════════════════════════════════════════════════════════════════


class TestWSJFScoreValueObject:
    """Tests for WSJFScore frozen value object."""

    def test_wsjfscore_calculation(self):
        """WSJF = (BV + TC + RR) / JS."""
        score = WSJFScore(
            business_value=8.0,
            time_criticality=6.0,
            risk_opportunity=4.0,
            job_size=2.0,
        )
        assert score.score == 9.0  # (8+6+4)/2

    def test_wsjfscore_zero_job_size_returns_zero(self):
        """Division by zero handled gracefully."""
        score = WSJFScore(
            business_value=10.0,
            time_criticality=10.0,
            risk_opportunity=10.0,
            job_size=0.0,
        )
        assert score.score == 0.0

    def test_wsjfscore_priority_critical(self):
        """Score >= 20 = CRITICAL priority."""
        score = WSJFScore(
            business_value=10.0,
            time_criticality=10.0,
            risk_opportunity=10.0,
            job_size=1.0,
        )
        assert score.score == 30.0
        assert score.priority == "CRITICAL"

    def test_wsjfscore_priority_high(self):
        """Score >= 15 and < 20 = HIGH priority."""
        score = WSJFScore(
            business_value=7.0,
            time_criticality=5.0,
            risk_opportunity=4.0,
            job_size=1.0,
        )
        assert score.score == 16.0
        assert score.priority == "HIGH"

    def test_wsjfscore_priority_medium(self):
        """Score >= 10 and < 15 = MEDIUM priority."""
        score = WSJFScore(
            business_value=5.0,
            time_criticality=4.0,
            risk_opportunity=3.0,
            job_size=1.0,
        )
        assert score.priority == "MEDIUM"

    def test_wsjfscore_priority_low(self):
        """Score < 10 = LOW priority."""
        score = WSJFScore(
            business_value=2.0,
            time_criticality=2.0,
            risk_opportunity=2.0,
            job_size=1.0,
        )
        assert score.priority == "LOW"

    def test_wsjfscore_immutable(self):
        """WSJFScore is frozen (immutable value object)."""
        score = WSJFScore(business_value=5.0, time_criticality=5.0,
                          risk_opportunity=5.0, job_size=1.0)
        try:
            score.business_value = 10.0
            assert False, "Should have raised FrozenInstanceError"
        except AttributeError:
            pass  # Expected — frozen dataclass


class TestROAMRiskValueObject:
    """Tests for ROAMRisk frozen value object."""

    def test_roamrisk_multiplier_all_low(self):
        """All LOW risks → multiplier 1.0."""
        risk = ROAMRisk(
            situational=RiskLevel.LOW,
            strategic=RiskLevel.LOW,
            systemic=RiskLevel.LOW,
        )
        assert risk.multiplier == 1.0

    def test_roamrisk_multiplier_all_critical(self):
        """All CRITICAL risks → multiplier 3.0."""
        risk = ROAMRisk(
            situational=RiskLevel.CRITICAL,
            strategic=RiskLevel.CRITICAL,
            systemic=RiskLevel.CRITICAL,
        )
        assert risk.multiplier == 3.0

    def test_roamrisk_multiplier_mixed(self):
        """Mixed risk levels → geometric mean."""
        risk = ROAMRisk(
            situational=RiskLevel.MEDIUM,
            strategic=RiskLevel.HIGH,
            systemic=RiskLevel.CRITICAL,
        )
        # (1.5 * 2.0 * 3.0) ** (1/3) ≈ 2.08
        assert 2.0 < risk.multiplier < 2.2

    def test_roamrisk_overall_risk_critical(self):
        """Overall risk classification for high multiplier."""
        risk = ROAMRisk(
            situational=RiskLevel.CRITICAL,
            strategic=RiskLevel.CRITICAL,
            systemic=RiskLevel.CRITICAL,
        )
        assert risk.overall_risk == RiskLevel.CRITICAL

    def test_roamrisk_overall_risk_low(self):
        """Overall risk classification for all LOW."""
        risk = ROAMRisk(
            situational=RiskLevel.LOW,
            strategic=RiskLevel.LOW,
            systemic=RiskLevel.LOW,
        )
        assert risk.overall_risk == RiskLevel.LOW

    def test_roamrisk_immutable(self):
        """ROAMRisk is frozen (immutable value object)."""
        risk = ROAMRisk(
            situational=RiskLevel.LOW,
            strategic=RiskLevel.LOW,
            systemic=RiskLevel.LOW,
        )
        try:
            risk.situational = RiskLevel.HIGH
            assert False, "Should have raised FrozenInstanceError"
        except AttributeError:
            pass


class TestMonetaryAmountValueObject:
    """Tests for MonetaryAmount frozen value object."""

    def test_monetaryamount_addition(self):
        """Two MonetaryAmounts can be added if same currency."""
        a = MonetaryAmount(Decimal("100.00"))
        b = MonetaryAmount(Decimal("50.00"))
        result = a + b
        assert result.amount == Decimal("150.00")
        assert result.currency == "USD"

    def test_monetaryamount_currency_mismatch_raises(self):
        """Adding different currencies raises ValueError."""
        a = MonetaryAmount(Decimal("100.00"), "USD")
        b = MonetaryAmount(Decimal("50.00"), "EUR")
        try:
            _ = a + b
            assert False, "Should have raised ValueError"
        except ValueError as e:
            assert "Currency mismatch" in str(e)

    def test_monetaryamount_multiplication(self):
        """MonetaryAmount can be multiplied by a scalar."""
        a = MonetaryAmount(Decimal("100.00"))
        result = a * 3.0
        assert result.amount == Decimal("300.00")

    def test_monetaryamount_str_format(self):
        """String representation includes currency and formatted amount."""
        a = MonetaryAmount(Decimal("75000.00"))
        s = str(a)
        assert "USD" in s
        assert "75,000.00" in s

    def test_monetaryamount_immutable(self):
        """MonetaryAmount is frozen (immutable value object)."""
        m = MonetaryAmount(Decimal("100.00"))
        try:
            m.amount = Decimal("200.00")
            assert False, "Should have raised FrozenInstanceError"
        except AttributeError:
            pass


class TestSystemicScoreValueObject:
    """Tests for SystemicScore frozen value object."""

    def test_systemicscore_max_score(self):
        """Maximum systemic score is 40."""
        score = SystemicScore(
            timeline_months=24.0,
            evidence_count=40,
            org_levels=4,
            pattern_consistency=1.0,
        )
        assert score.score == 40

    def test_systemicscore_zero_evidence(self):
        """Zero evidence → low score."""
        score = SystemicScore(
            timeline_months=0.0,
            evidence_count=0,
            org_levels=1,
            pattern_consistency=0.0,
        )
        assert score.score <= 5

    def test_systemicscore_maa_case(self):
        """MAA case (22mo, 40+ work orders, 4 org levels, 95% consistency)."""
        score = SystemicScore(
            timeline_months=22.0,
            evidence_count=40,
            org_levels=4,
            pattern_consistency=0.95,
        )
        assert score.score >= 35  # LITIGATION-READY threshold

    def test_systemicscore_verdict_litigation_ready(self):
        """Score >= 35 = LITIGATION-READY."""
        score = SystemicScore(
            timeline_months=24.0,
            evidence_count=40,
            org_levels=4,
            pattern_consistency=0.95,
        )
        assert "LITIGATION-READY" in score.verdict

    def test_systemicscore_verdict_settlement_only(self):
        """Score 15-24 = SETTLEMENT-ONLY."""
        score = SystemicScore(
            timeline_months=12.0,
            evidence_count=10,
            org_levels=2,
            pattern_consistency=0.3,
        )
        assert score.score >= 15
        assert "SETTLEMENT" in score.verdict

    def test_systemicscore_verdict_defer(self):
        """Score 10-14 = DEFER."""
        score = SystemicScore(
            timeline_months=6.0,
            evidence_count=5,
            org_levels=2,
            pattern_consistency=0.0,
        )
        assert "DEFER" in score.verdict

    def test_systemicscore_verdict_not_systemic(self):
        """Score < 10 = NOT SYSTEMIC."""
        score = SystemicScore(
            timeline_months=1.0,
            evidence_count=1,
            org_levels=1,
            pattern_consistency=0.0,
        )
        assert "NOT SYSTEMIC" in score.verdict

    def test_systemicscore_capped_at_40(self):
        """Score cannot exceed 40 even with extreme values."""
        score = SystemicScore(
            timeline_months=100.0,
            evidence_count=1000,
            org_levels=10,
            pattern_consistency=1.0,
        )
        assert score.score == 40


# ═══════════════════════════════════════════════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════════════════════════════════════════════


class TestPortfolioStatusEnum:
    """Tests for PortfolioStatus enum."""

    def test_portfoliostatus_has_five_members(self):
        assert len(PortfolioStatus) == 5

    def test_portfoliostatus_active_value(self):
        assert PortfolioStatus.ACTIVE.value == "active"

    def test_portfoliostatus_litigation_value(self):
        assert PortfolioStatus.LITIGATION.value == "litigation"

    def test_portfoliostatus_settled_value(self):
        assert PortfolioStatus.SETTLED.value == "settled"

    def test_portfoliostatus_deferred_value(self):
        assert PortfolioStatus.DEFERRED.value == "deferred"

    def test_portfoliostatus_closed_value(self):
        assert PortfolioStatus.CLOSED.value == "closed"


class TestRiskLevelEnum:
    """Tests for RiskLevel enum."""

    def test_risklevel_has_four_members(self):
        assert len(RiskLevel) == 4

    def test_risklevel_values(self):
        assert RiskLevel.LOW.value == "low"
        assert RiskLevel.MEDIUM.value == "medium"
        assert RiskLevel.HIGH.value == "high"
        assert RiskLevel.CRITICAL.value == "critical"


# ═══════════════════════════════════════════════════════════════════════════════
# ENTITIES
# ═══════════════════════════════════════════════════════════════════════════════


class TestOrganizationEntity:
    """Tests for Organization entity."""

    def test_organization_default_id(self):
        """Organization generates UUID id on creation."""
        org = Organization(name="MAA", org_type="property_management")
        assert org.id is not None
        assert len(org.id) > 0

    def test_organization_add_evidence(self):
        """Evidence chains can be added."""
        org = Organization(name="MAA")
        org.add_evidence("40+ cancelled work orders")
        org.add_evidence("Mold photos")
        assert len(org.evidence_chains) == 2

    def test_organization_calculate_systemic_score(self):
        """Default systemic score calculated from evidence."""
        org = Organization(name="MAA")
        org.add_evidence("work order 1")
        org.add_evidence("work order 2")
        score = org.calculate_systemic_score()
        assert score is not None
        assert isinstance(score, SystemicScore)

    def test_organization_explicit_systemic_score(self):
        """Pre-set systemic score returned without recalculation."""
        s = SystemicScore(
            timeline_months=22.0, evidence_count=40,
            org_levels=4, pattern_consistency=0.95,
        )
        org = Organization(name="MAA", systemic_score=s)
        returned = org.calculate_systemic_score()
        assert returned is s  # Same object — no recalculation


# ═══════════════════════════════════════════════════════════════════════════════
# AGGREGATE ROOTS
# ═══════════════════════════════════════════════════════════════════════════════


class TestLegalCaseAggregateRoot:
    """Tests for LegalCase aggregate root."""

    def test_legalcase_default_creation(self):
        """LegalCase created with defaults."""
        case = LegalCase(case_number="26CV005596-590", jurisdiction="NC")
        assert case.case_number == "26CV005596-590"
        assert case.status == PortfolioStatus.ACTIVE

    def test_legalcase_calculate_wsjf(self):
        """WSJF score calculated and stored on case."""
        case = LegalCase()
        wsjf = case.calculate_wsjf(
            business_value=10.0,
            time_criticality=8.0,
            risk_opportunity=6.0,
            job_size=2.0,
        )
        assert wsjf.score == 12.0
        assert case.wsjf_score is wsjf

    def test_legalcase_calculate_roam_risk(self):
        """ROAM risk assessment calculated and stored on case."""
        case = LegalCase()
        risk = case.calculate_roam_risk(
            situational=RiskLevel.MEDIUM,
            strategic=RiskLevel.HIGH,
            systemic=RiskLevel.CRITICAL,
        )
        assert risk.multiplier > 1.0
        assert case.roam_risk is risk

    def test_legalcase_add_opposing_org(self):
        """Opposing organizations added to case."""
        case = LegalCase()
        org = Organization(name="MAA")
        case.add_opposing_org(org)
        assert len(case.opposing_organizations) == 1

    def test_legalcase_get_total_costs(self):
        """Total costs calculated from cost list."""
        case = LegalCase()
        case.costs_incurred.append(MonetaryAmount(Decimal("500.00")))
        case.costs_incurred.append(MonetaryAmount(Decimal("300.00")))
        total = case.get_total_costs()
        assert total.amount == Decimal("800.00")

    def test_legalcase_get_total_costs_empty(self):
        """Empty costs returns zero."""
        case = LegalCase()
        total = case.get_total_costs()
        assert total.amount == Decimal("0")

    def test_legalcase_days_to_deadline(self):
        """Days to deadline calculated from settlement date."""
        case = LegalCase(settlement_deadline=date(2030, 12, 31))
        days = case.days_to_deadline()
        assert days is not None
        assert days > 0

    def test_legalcase_days_to_deadline_none(self):
        """No deadline → None."""
        case = LegalCase()
        assert case.days_to_deadline() is None


class TestPortfolioAggregateRoot:
    """Tests for Portfolio aggregate root."""

    def test_portfolio_default_creation(self):
        """Portfolio created with defaults."""
        p = Portfolio(owner="SB")
        assert p.owner == "SB"
        assert len(p.cases) == 0
        assert p.active_cases == 0

    def test_portfolio_add_case_updates_metrics(self):
        """Adding a case updates active count."""
        p = Portfolio()
        case = LegalCase(status=PortfolioStatus.ACTIVE)
        p.add_case(case)
        assert p.active_cases == 1
        assert len(p.cases) == 1

    def test_portfolio_multiple_cases_metrics(self):
        """Portfolio metrics calculated across multiple cases."""
        p = Portfolio()
        p.add_case(LegalCase(status=PortfolioStatus.ACTIVE))
        p.add_case(LegalCase(status=PortfolioStatus.SETTLED))
        p.add_case(LegalCase(status=PortfolioStatus.ACTIVE))
        assert p.active_cases == 2
        assert p.settled_cases == 1

    def test_portfolio_get_cases_by_status(self):
        """Filter cases by status."""
        p = Portfolio()
        p.add_case(LegalCase(case_number="A", status=PortfolioStatus.ACTIVE))
        p.add_case(LegalCase(case_number="B", status=PortfolioStatus.SETTLED))
        p.add_case(LegalCase(case_number="C", status=PortfolioStatus.ACTIVE))
        active = p.get_cases_by_status(PortfolioStatus.ACTIVE)
        assert len(active) == 2

    def test_portfolio_get_high_priority_cases(self):
        """Filter cases by WSJF threshold."""
        p = Portfolio()
        high = LegalCase()
        high.calculate_wsjf(10.0, 10.0, 10.0, 1.0)  # Score 30
        low = LegalCase()
        low.calculate_wsjf(2.0, 2.0, 2.0, 1.0)  # Score 6
        p.add_case(high)
        p.add_case(low)
        priority = p.get_high_priority_cases(min_wsjf=15.0)
        assert len(priority) == 1

    def test_portfolio_get_systemic_organizations(self):
        """Get organizations with systemic indifference score >= 15."""
        p = Portfolio()
        case = LegalCase()
        org = Organization(name="MAA")
        org.systemic_score = SystemicScore(
            timeline_months=22.0, evidence_count=40,
            org_levels=4, pattern_consistency=0.95,
        )
        case.add_opposing_org(org)
        p.add_case(case)
        systemic = p.get_systemic_organizations()
        assert "MAA" in systemic

    def test_portfolio_litigation_ready_count(self):
        """Litigation-ready count based on org systemic scores."""
        p = Portfolio()
        case = LegalCase(status=PortfolioStatus.ACTIVE)
        org = Organization(name="MAA")
        org.systemic_score = SystemicScore(
            timeline_months=24.0, evidence_count=40,
            org_levels=4, pattern_consistency=1.0,
        )
        case.add_opposing_org(org)
        p.add_case(case)
        assert p.litigation_ready_cases == 1


# ═══════════════════════════════════════════════════════════════════════════════
# DOMAIN SERVICES
# ═══════════════════════════════════════════════════════════════════════════════


class TestPortfolioAnalyticsServiceDomainService:
    """Tests for PortfolioAnalyticsService domain service."""

    def test_portfolioanalyticsservice_empty_portfolio(self):
        """Empty portfolio → health score 0, status EMPTY."""
        p = Portfolio()
        health = PortfolioAnalyticsService.calculate_portfolio_health(p)
        assert health["health_score"] == 0
        assert health["status"] == "EMPTY"

    def test_portfolioanalyticsservice_active_portfolio(self):
        """Portfolio with cases produces valid health metrics."""
        p = PortfolioFactory.create_sample_portfolio()
        health = PortfolioAnalyticsService.calculate_portfolio_health(p)
        assert "health_score" in health
        assert "status" in health
        assert health["total_cases"] >= 1

    def test_portfolioanalyticsservice_wsjf_priorities(self):
        """WSJF priority list sorted descending."""
        p = PortfolioFactory.create_sample_portfolio()
        priorities = PortfolioAnalyticsService.generate_wsif_priorities(p)
        assert len(priorities) >= 1
        assert priorities[0]["wsjf_score"] > 0

    def test_portfolioanalyticsservice_health_status_classification(self):
        """Health status classified: EXCELLENT/GOOD/FAIR/POOR."""
        valid_statuses = {"EXCELLENT", "GOOD", "FAIR", "POOR", "EMPTY"}
        p = PortfolioFactory.create_sample_portfolio()
        health = PortfolioAnalyticsService.calculate_portfolio_health(p)
        assert health["status"] in valid_statuses


# ═══════════════════════════════════════════════════════════════════════════════
# REPOSITORY INTERFACE
# ═══════════════════════════════════════════════════════════════════════════════


class TestPortfolioRepositoryInterface:
    """Tests for PortfolioRepository interface."""

    def test_portfoliorepository_save_not_implemented(self):
        """Repository interface save() raises NotImplementedError."""
        repo = PortfolioRepository()
        try:
            repo.save(Portfolio())
            assert False, "Should have raised NotImplementedError"
        except NotImplementedError:
            pass

    def test_portfoliorepository_find_by_id_not_implemented(self):
        """Repository interface find_by_id() raises NotImplementedError."""
        repo = PortfolioRepository()
        try:
            repo.find_by_id("abc")
            assert False, "Should have raised NotImplementedError"
        except NotImplementedError:
            pass

    def test_portfoliorepository_find_by_owner_not_implemented(self):
        """Repository interface find_by_owner() raises NotImplementedError."""
        repo = PortfolioRepository()
        try:
            repo.find_by_owner("SB")
            assert False, "Should have raised NotImplementedError"
        except NotImplementedError:
            pass


# ═══════════════════════════════════════════════════════════════════════════════
# FACTORY
# ═══════════════════════════════════════════════════════════════════════════════


class TestPortfolioFactoryPattern:
    """Tests for PortfolioFactory domain factory."""

    def test_portfoliofactory_create_maa_case(self):
        """Factory creates MAA case with real data."""
        case = PortfolioFactory.create_maa_case()
        assert case.case_number == "MAA-26CV005596-590"
        assert case.jurisdiction == "NC"
        assert case.wsjf_score is not None
        assert case.roam_risk is not None
        assert len(case.opposing_organizations) == 1

    def test_portfoliofactory_maa_org_systemic_score(self):
        """MAA organization has high systemic score."""
        case = PortfolioFactory.create_maa_case()
        maa = case.opposing_organizations[0]
        assert maa.name == "Mid-America Apartment Communities"
        assert maa.systemic_score.score >= 35

    def test_portfoliofactory_create_sample_portfolio(self):
        """Factory creates sample portfolio with MAA case."""
        portfolio = PortfolioFactory.create_sample_portfolio()
        assert portfolio.owner == "Shahrooz Bhopti"
        assert len(portfolio.cases) >= 1
        assert portfolio.active_cases >= 1

    def test_portfoliofactory_maa_case_wsjf_critical(self):
        """MAA case WSJF score should be CRITICAL priority."""
        case = PortfolioFactory.create_maa_case()
        assert case.wsjf_score.priority == "CRITICAL"


# ═══════════════════════════════════════════════════════════════════════════════
# RUNNER
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import pytest
    sys.exit(pytest.main([__file__, "-v", "--tb=short"]))
