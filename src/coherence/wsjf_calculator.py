#!/usr/bin/env python3
"""
Robust WSJF Calculator with Anti-Pattern Mitigation
====================================================
Implements defensible WSJF calculation that prevents:
- Subjective inflation
- Duration deflation
- Time criticality manipulation
- Risk reduction vagueness

DoR: Historical data available, task metrics defined
DoD: All anti-patterns mitigated, ≥95% test coverage
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass
import json
from pathlib import Path


@dataclass
class ImpactMetrics:
    """Objective impact metrics for User-Business Value calculation."""
    revenue_impact: float  # $ revenue generated
    cost_savings: float    # $ costs saved
    users_affected: int    # Number of users impacted
    strategic_alignment: float  # 0-1 scale (alignment with strategic goals)


@dataclass
class RiskProfile:
    """Risk profile for Risk Reduction calculation."""
    probability: float  # 0-1 (probability of incident)
    impact_cost: float  # $ cost if incident occurs
    current_mitigation: float  # 0-1 (current mitigation level)
    proposed_mitigation: float  # 0-1 (mitigation after this work)


@dataclass
class Task:
    """Task definition with all WSJF inputs."""
    name: str
    impact_metrics: ImpactMetrics
    deadline: datetime
    opportunity_cost_per_week: float
    risk_profile: RiskProfile
    estimate_hours: float
    confidence: str  # "high", "medium", "low"
    team_id: str


@dataclass
class WSJFResult:
    """WSJF calculation result with breakdown."""
    wsjf_score: float
    cod: float
    duration: float
    breakdown: Dict[str, float]
    validation_warnings: List[str]


class WSJFCalculator:
    """
    Robust WSJF calculator with anti-pattern mitigation.
    
    Anti-patterns mitigated:
    1. Subjective inflation → Objective anchors
    2. Duration deflation → Historical accuracy penalty
    3. Time criticality manipulation → External deadlines only
    4. Risk reduction vagueness → ROAM framework
    """
    
    def __init__(self, historical_data_path: Optional[Path] = None):
        """
        Initialize calculator with historical data.
        
        Args:
            historical_data_path: Path to historical accuracy data
        """
        self.historical_data = self._load_historical_data(historical_data_path)
    
    def _load_historical_data(self, path: Optional[Path]) -> Dict:
        """Load historical team accuracy data."""
        if path and path.exists():
            return json.loads(path.read_text())
        
        # Default: assume 80% accuracy for all teams
        return {
            "default": {"accuracy": 0.8, "completed_tasks": []}
        }
    
    def calculate_user_business_value(self, metrics: ImpactMetrics) -> float:
        """
        Calculate User-Business Value (1-10) based on objective metrics.
        
        Anti-pattern mitigation: Objective anchors prevent inflation.
        
        Args:
            metrics: Impact metrics with measurable outcomes
        
        Returns:
            Score 1-10
        """
        # Revenue impact: $10K = 1 point, $100K = 10 points
        revenue_score = min(metrics.revenue_impact / 10000, 10)
        
        # Cost savings: $5K = 1 point, $50K = 10 points
        savings_score = min(metrics.cost_savings / 5000, 10)
        
        # Users affected: 100 users = 1 point, 1000 users = 10 points
        user_score = min(metrics.users_affected / 100, 10)
        
        # Strategic alignment: 0-1 scale → 0-10 points
        strategic_score = metrics.strategic_alignment * 10
        
        # Weighted average (prevent single metric domination)
        return (revenue_score * 0.3 + savings_score * 0.2 + 
                user_score * 0.2 + strategic_score * 0.3)
    
    def calculate_time_criticality(self, deadline: datetime, 
                                   opportunity_cost_per_week: float) -> float:
        """
        Calculate Time Criticality (1-10) based on external deadline.
        
        Anti-pattern mitigation: External deadlines only, decay function.
        
        Args:
            deadline: External deadline (court date, contract expiry)
            opportunity_cost_per_week: $ lost per week of delay
        
        Returns:
            Score 1-10
        """
        weeks_remaining = (deadline - datetime.now()).days / 7
        
        if weeks_remaining <= 0:
            return 10  # Past deadline
        elif weeks_remaining <= 1:
            return 9   # <1 week
        elif weeks_remaining <= 2:
            return 7   # 1-2 weeks
        elif weeks_remaining <= 4:
            return 5   # 2-4 weeks
        else:
            # Decay function: less urgent as deadline is farther
            base_score = max(1, 10 - (weeks_remaining / 4))
            
            # Add opportunity cost component
            opportunity_score = min(opportunity_cost_per_week / 1000, 5)
            
            return min(base_score + opportunity_score, 10)
    
    def calculate_risk_reduction(self, profile: RiskProfile) -> float:
        """
        Calculate Risk Reduction (1-10) based on ROAM framework.
        
        Anti-pattern mitigation: Probability × Impact, concrete states.
        
        Args:
            profile: Risk profile with probability and impact
        
        Returns:
            Score 1-10
        """
        current_risk = (profile.probability * 
                       profile.impact_cost * 
                       (1 - profile.current_mitigation))
        
        future_risk = (profile.probability * 
                      profile.impact_cost * 
                      (1 - profile.proposed_mitigation))
        
        risk_reduction_value = current_risk - future_risk
        
        # Normalize to 1-10 scale ($10K risk reduction = 10 points)
        return min(risk_reduction_value / 10000, 10)
    
    def calculate_job_duration(self, estimate_hours: float, confidence: str, 
                              team_id: str) -> float:
        """
        Calculate Job Duration with confidence and accuracy adjustments.
        
        Anti-pattern mitigation: Historical accuracy penalty.
        
        Args:
            estimate_hours: Initial estimate
            confidence: "high" (P50), "medium" (P75), "low" (P90)
            team_id: Team identifier for historical accuracy lookup
        
        Returns:
            Adjusted duration in hours
        """
        confidence_multipliers = {
            "high": 1.0,    # P50: 50% chance of completion
            "medium": 1.5,  # P75: 75% chance of completion
            "low": 2.0      # P90: 90% chance of completion
        }
        
        # Get team's historical accuracy (default to 0.8 if unknown)
        team_data = self.historical_data.get(team_id, {"accuracy": 0.8})
        historical_accuracy = team_data["accuracy"]
        
        # Penalize teams with poor historical accuracy
        accuracy_penalty = 1.0 + (1.0 - historical_accuracy)
        
        return estimate_hours * confidence_multipliers[confidence] * accuracy_penalty
    
    def calculate(self, task: Task) -> WSJFResult:
        """
        Calculate WSJF with anti-pattern mitigation.
        
        Args:
            task: Task definition with all inputs
        
        Returns:
            WSJF result with breakdown and validation warnings
        """
        warnings = []
        
        # 1. User-Business Value (objective)
        ubv = self.calculate_user_business_value(task.impact_metrics)
        
        # 2. Time Criticality (external deadlines only)
        tc = self.calculate_time_criticality(
            task.deadline, 
            task.opportunity_cost_per_week
        )
        
        # 3. Risk Reduction (ROAM-based)
        rr = self.calculate_risk_reduction(task.risk_profile)
        
        # 4. Cost of Delay
        cod = ubv + tc + rr
        
        # 5. Job Duration (adjusted for confidence and accuracy)
        duration = self.calculate_job_duration(
            task.estimate_hours,
            task.confidence,
            task.team_id
        )
        
        # 6. WSJF Score
        wsjf_score = cod / duration if duration > 0 else 0
        
        # Validation warnings
        if ubv < 3:
            warnings.append("Low user-business value (<3). Consider deferring.")
        if tc > 8 and duration > 40:
            warnings.append("High urgency + long duration. Consider breaking down.")
        if wsjf_score < 2.0:
            warnings.append("Low WSJF (<2.0). Defer to LATER horizon.")
        
        return WSJFResult(
            wsjf_score=round(wsjf_score, 2),
            cod=round(cod, 2),
            duration=round(duration, 2),
            breakdown={
                "user_business_value": round(ubv, 2),
                "time_criticality": round(tc, 2),
                "risk_reduction": round(rr, 2)
            },
            validation_warnings=warnings
        )

