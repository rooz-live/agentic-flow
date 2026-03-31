#!/usr/bin/env python3
"""
TDD Tests for WSJF Calculator Anti-Pattern Mitigation
======================================================
Tests that WSJF calculator prevents:
1. Subjective inflation
2. Duration deflation
3. Time criticality manipulation
4. Risk reduction vagueness

DoR: WSJF calculator implemented
DoD: ≥95% test coverage, all anti-patterns tested
"""

import pytest
from datetime import datetime, timedelta
from pathlib import Path
import sys

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from coherence.wsjf_calculator import (
    WSJFCalculator,
    Task,
    ImpactMetrics,
    RiskProfile
)


class TestAntiPattern1_SubjectiveInflation:
    """Test mitigation of subjective inflation in User-Business Value."""
    
    def test_objective_anchors_prevent_inflation(self):
        """User-Business Value is calculated from objective metrics, not subjective scores."""
        calculator = WSJFCalculator()
        
        # High-impact metrics
        high_impact = ImpactMetrics(
            revenue_impact=100000,  # $100K revenue
            cost_savings=50000,     # $50K savings
            users_affected=1000,    # 1K users
            strategic_alignment=1.0  # 100% aligned
        )
        
        # Low-impact metrics
        low_impact = ImpactMetrics(
            revenue_impact=1000,    # $1K revenue
            cost_savings=500,       # $500 savings
            users_affected=10,      # 10 users
            strategic_alignment=0.2  # 20% aligned
        )
        
        high_score = calculator.calculate_user_business_value(high_impact)
        low_score = calculator.calculate_user_business_value(low_impact)
        
        assert high_score > 8.0, "High-impact should score >8"
        assert low_score < 3.0, "Low-impact should score <3"
        assert high_score > low_score * 3, "High-impact should be 3x+ low-impact"
    
    def test_weighted_average_prevents_single_metric_domination(self):
        """No single metric can dominate the User-Business Value score."""
        calculator = WSJFCalculator()
        
        # Only revenue (other metrics zero)
        revenue_only = ImpactMetrics(
            revenue_impact=100000,
            cost_savings=0,
            users_affected=0,
            strategic_alignment=0.0
        )
        
        score = calculator.calculate_user_business_value(revenue_only)
        
        # Revenue weight is 30%, so max score is 3.0 (30% of 10)
        assert score <= 3.5, "Single metric shouldn't dominate (max 30% weight)"


class TestAntiPattern2_DurationDeflation:
    """Test mitigation of duration deflation (sandbagging estimates)."""
    
    def test_confidence_intervals_adjust_duration(self):
        """Duration is adjusted based on confidence level (P50, P75, P90)."""
        calculator = WSJFCalculator()
        
        base_estimate = 10.0  # 10 hours
        
        high_conf = calculator.calculate_job_duration(base_estimate, "high", "default")
        medium_conf = calculator.calculate_job_duration(base_estimate, "medium", "default")
        low_conf = calculator.calculate_job_duration(base_estimate, "low", "default")
        
        assert high_conf < medium_conf < low_conf, "Lower confidence → longer duration"
        assert medium_conf >= base_estimate * 1.5, "Medium confidence ≥ 1.5x base"
        assert low_conf >= base_estimate * 2.0, "Low confidence ≥ 2.0x base"
    
    def test_historical_accuracy_penalty(self):
        """Teams with poor historical accuracy get penalized."""
        # Team with 90% accuracy
        good_team_data = {"good_team": {"accuracy": 0.9}}
        calculator_good = WSJFCalculator()
        calculator_good.historical_data = good_team_data
        
        # Team with 50% accuracy
        bad_team_data = {"bad_team": {"accuracy": 0.5}}
        calculator_bad = WSJFCalculator()
        calculator_bad.historical_data = bad_team_data
        
        base_estimate = 10.0
        
        good_duration = calculator_good.calculate_job_duration(base_estimate, "high", "good_team")
        bad_duration = calculator_bad.calculate_job_duration(base_estimate, "high", "bad_team")
        
        assert bad_duration > good_duration, "Poor accuracy → longer duration"
        assert bad_duration >= good_duration * 1.3, "50% accuracy → 30%+ penalty"


class TestAntiPattern3_TimeCriticalityManipulation:
    """Test mitigation of time criticality manipulation (everything is urgent)."""
    
    def test_external_deadlines_only(self):
        """Time criticality is based on external deadlines, not internal preferences."""
        calculator = WSJFCalculator()
        
        # Deadline in 1 week (urgent)
        urgent_deadline = datetime.now() + timedelta(weeks=1)
        urgent_score = calculator.calculate_time_criticality(urgent_deadline, 1000)
        
        # Deadline in 12 weeks (not urgent)
        distant_deadline = datetime.now() + timedelta(weeks=12)
        distant_score = calculator.calculate_time_criticality(distant_deadline, 1000)
        
        assert urgent_score > 8.0, "1-week deadline should be urgent (>8)"
        assert distant_score < 4.0, "12-week deadline should not be urgent (<4)"
    
    def test_decay_function_prevents_deadline_inflation(self):
        """Time criticality decreases as deadline is farther away."""
        calculator = WSJFCalculator()
        
        deadlines = [
            datetime.now() + timedelta(weeks=1),
            datetime.now() + timedelta(weeks=2),
            datetime.now() + timedelta(weeks=4),
            datetime.now() + timedelta(weeks=8),
        ]
        
        scores = [calculator.calculate_time_criticality(d, 1000) for d in deadlines]
        
        # Scores should decrease monotonically
        for i in range(len(scores) - 1):
            assert scores[i] > scores[i+1], f"Score should decrease as deadline is farther: {scores}"


class TestAntiPattern4_RiskReductionVagueness:
    """Test mitigation of risk reduction vagueness (unmeasurable claims)."""
    
    def test_roam_framework_quantifies_risk(self):
        """Risk reduction is calculated from probability × impact, not vague claims."""
        calculator = WSJFCalculator()
        
        # High-risk scenario (30% chance of $50K incident, currently 20% mitigated)
        high_risk = RiskProfile(
            probability=0.3,
            impact_cost=50000,
            current_mitigation=0.2,
            proposed_mitigation=0.8
        )
        
        # Low-risk scenario (5% chance of $1K incident, currently 50% mitigated)
        low_risk = RiskProfile(
            probability=0.05,
            impact_cost=1000,
            current_mitigation=0.5,
            proposed_mitigation=0.9
        )
        
        high_score = calculator.calculate_risk_reduction(high_risk)
        low_score = calculator.calculate_risk_reduction(low_risk)
        
        assert high_score > 5.0, "High-risk reduction should score >5"
        assert low_score < 1.0, "Low-risk reduction should score <1"
    
    def test_counterfactual_analysis(self):
        """Risk reduction measures what happens if we DON'T do this."""
        calculator = WSJFCalculator()
        
        # Scenario: 50% chance of $20K incident, no current mitigation
        no_mitigation = RiskProfile(
            probability=0.5,
            impact_cost=20000,
            current_mitigation=0.0,
            proposed_mitigation=0.9  # 90% mitigation after work
        )
        
        score = calculator.calculate_risk_reduction(no_mitigation)
        
        # Expected risk reduction: 0.5 * 20000 * 0.9 = $9K → score ~9
        assert score >= 8.0, "90% mitigation of $10K expected loss → high score"


class TestWSJFIntegration:
    """Test full WSJF calculation with all anti-patterns mitigated."""
    
    def test_high_wsjf_task(self):
        """High-value, urgent, short task should have high WSJF."""
        calculator = WSJFCalculator()
        
        task = Task(
            name="Fix critical security vulnerability",
            impact_metrics=ImpactMetrics(
                revenue_impact=50000,
                cost_savings=10000,
                users_affected=1000,
                strategic_alignment=1.0
            ),
            deadline=datetime.now() + timedelta(weeks=1),
            opportunity_cost_per_week=5000,
            risk_profile=RiskProfile(
                probability=0.5,
                impact_cost=50000,
                current_mitigation=0.0,
                proposed_mitigation=0.9
            ),
            estimate_hours=4,
            confidence="high",
            team_id="default"
        )
        
        result = calculator.calculate(task)
        
        assert result.wsjf_score > 5.0, "High-value urgent short task → WSJF >5"
        assert result.cod > 15.0, "High CoD (UBV + TC + RR)"
        assert result.duration < 10.0, "Short duration"
    
    def test_low_wsjf_task_gets_warning(self):
        """Low-value, distant deadline, long task should have low WSJF and warning."""
        calculator = WSJFCalculator()
        
        task = Task(
            name="Nice-to-have feature",
            impact_metrics=ImpactMetrics(
                revenue_impact=1000,
                cost_savings=0,
                users_affected=10,
                strategic_alignment=0.2
            ),
            deadline=datetime.now() + timedelta(weeks=12),
            opportunity_cost_per_week=100,
            risk_profile=RiskProfile(
                probability=0.05,
                impact_cost=1000,
                current_mitigation=0.5,
                proposed_mitigation=0.7
            ),
            estimate_hours=40,
            confidence="low",
            team_id="default"
        )
        
        result = calculator.calculate(task)
        
        assert result.wsjf_score < 2.0, "Low-value distant long task → WSJF <2"
        assert len(result.validation_warnings) > 0, "Should have warnings"
        assert any("defer" in w.lower() for w in result.validation_warnings), "Should suggest deferring"

