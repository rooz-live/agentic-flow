# WSJF Anti-Pattern Analysis & Robust Framework

**Date**: 2026-02-13  
**Methodology**: Inversion Thinking + Examiner Rejection Scenarios  
**Status**: DEFENSIVE FRAMEWORK

---

## Problem Statement

**WSJF (Weighted Shortest Job First)** prioritizes work based on:
```
WSJF = Cost of Delay (CoD) / Job Duration
CoD = User-Business Value + Time Criticality + Risk Reduction
```

**Core Problem**: Subjective manipulation and estimation bias can render WSJF meaningless, leading to:
- Gaming the system (inflating CoD, deflating duration)
- Analysis paralysis (over-engineering estimates)
- Strategic misalignment (local optimization vs. global value)

---

## Critical Anti-Patterns (Examiner Rejection Scenarios)

### Anti-Pattern 1: **Subjective Inflation**
**Scenario**: Team inflates User-Business Value from 5 to 10 to prioritize their pet project.

**Examiner Rejection**: "How do you prevent teams from gaming WSJF scores?"

**Mitigation**:
- **Objective Anchors**: Tie User-Business Value to measurable outcomes (revenue, cost savings, user count)
- **Historical Calibration**: Compare against completed work with known outcomes
- **Multi-Role Validation**: Require 3+ roles to agree (Analyst, Assessor, Legal)

**Implementation**:
```python
def calculate_user_business_value(impact_metrics: dict) -> float:
    """
    Objective calculation based on measurable impact.
    
    Args:
        impact_metrics: {
            "revenue_impact": 50000,  # $50K revenue
            "cost_savings": 10000,    # $10K savings
            "users_affected": 1000,   # 1K users
            "strategic_alignment": 0.8  # 0-1 scale
        }
    
    Returns:
        Normalized score 1-10
    """
    revenue_score = min(impact_metrics["revenue_impact"] / 10000, 10)
    savings_score = min(impact_metrics["cost_savings"] / 5000, 10)
    user_score = min(impact_metrics["users_affected"] / 100, 10)
    strategic_score = impact_metrics["strategic_alignment"] * 10
    
    # Weighted average (prevent single metric domination)
    return (revenue_score * 0.3 + savings_score * 0.2 + 
            user_score * 0.2 + strategic_score * 0.3)
```

---

### Anti-Pattern 2: **Duration Deflation**
**Scenario**: Team estimates 2 hours for a task that actually takes 20 hours.

**Examiner Rejection**: "How do you prevent sandbagging duration estimates?"

**Mitigation**:
- **Historical Velocity**: Use actual completion times from similar tasks
- **Confidence Intervals**: Require P50, P75, P90 estimates (not just optimistic)
- **Penalty for Overruns**: Reduce future WSJF scores if estimates are consistently wrong

**Implementation**:
```python
def calculate_job_duration(estimate_hours: float, confidence: str, 
                          historical_accuracy: float) -> float:
    """
    Adjust duration based on confidence and historical accuracy.
    
    Args:
        estimate_hours: Initial estimate
        confidence: "high" (P50), "medium" (P75), "low" (P90)
        historical_accuracy: 0-1 (1.0 = perfect estimates)
    
    Returns:
        Adjusted duration with safety margin
    """
    confidence_multipliers = {
        "high": 1.0,    # P50: 50% chance of completion
        "medium": 1.5,  # P75: 75% chance of completion
        "low": 2.0      # P90: 90% chance of completion
    }
    
    # Penalize teams with poor historical accuracy
    accuracy_penalty = 1.0 + (1.0 - historical_accuracy)
    
    return estimate_hours * confidence_multipliers[confidence] * accuracy_penalty
```

---

### Anti-Pattern 3: **Time Criticality Manipulation**
**Scenario**: Every task is marked "URGENT" to inflate WSJF.

**Examiner Rejection**: "How do you prevent deadline inflation?"

**Mitigation**:
- **External Deadlines Only**: Only count court deadlines, contract dates, regulatory dates
- **Decay Function**: Time criticality decreases as deadline approaches (prevents last-minute gaming)
- **Opportunity Cost**: Measure what you lose by NOT doing this now

**Implementation**:
```python
from datetime import datetime, timedelta

def calculate_time_criticality(deadline: datetime, 
                               opportunity_cost_per_week: float) -> float:
    """
    Calculate time criticality based on external deadline and opportunity cost.
    
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
```

---

### Anti-Pattern 4: **Risk Reduction Vagueness**
**Scenario**: "This reduces technical debt" (unmeasurable).

**Examiner Rejection**: "How do you quantify risk reduction?"

**Mitigation**:
- **ROAM Framework**: Resolved, Owned, Accepted, Mitigated (concrete states)
- **Probability × Impact**: Use historical incident data
- **Counterfactual Analysis**: What happens if we DON'T do this?

**Implementation**:
```python
def calculate_risk_reduction(risk_profile: dict) -> float:
    """
    Calculate risk reduction based on ROAM framework.
    
    Args:
        risk_profile: {
            "probability": 0.3,  # 30% chance of incident
            "impact_cost": 50000,  # $50K cost if incident occurs
            "current_mitigation": 0.2,  # 20% currently mitigated
            "proposed_mitigation": 0.8  # 80% after this work
        }
    
    Returns:
        Score 1-10
    """
    current_risk = (risk_profile["probability"] * 
                   risk_profile["impact_cost"] * 
                   (1 - risk_profile["current_mitigation"]))
    
    future_risk = (risk_profile["probability"] * 
                  risk_profile["impact_cost"] * 
                  (1 - risk_profile["proposed_mitigation"]))
    
    risk_reduction_value = current_risk - future_risk
    
    # Normalize to 1-10 scale (assume $10K risk reduction = 10 points)
    return min(risk_reduction_value / 10000, 10)
```

---

## Robust WSJF Framework (Defensible)

### Formula with Anti-Pattern Mitigation
```python
def calculate_wsjf_robust(task: dict, historical_data: dict) -> dict:
    """
    Calculate WSJF with anti-pattern mitigation.
    
    Args:
        task: {
            "name": "Portfolio Hierarchy Architecture",
            "impact_metrics": {...},
            "deadline": datetime(2026, 3, 3),
            "opportunity_cost_per_week": 5000,
            "risk_profile": {...},
            "estimate_hours": 6,
            "confidence": "medium",
            "team_id": "rust_team"
        },
        historical_data: {
            "rust_team": {
                "accuracy": 0.85,  # 85% accurate estimates
                "completed_tasks": [...]
            }
        }
    
    Returns:
        {
            "wsjf_score": 8.5,
            "cod": 25.5,
            "duration": 3.0,
            "breakdown": {...}
        }
    """
    # 1. User-Business Value (objective)
    ubv = calculate_user_business_value(task["impact_metrics"])
    
    # 2. Time Criticality (external deadlines only)
    tc = calculate_time_criticality(
        task["deadline"], 
        task["opportunity_cost_per_week"]
    )
    
    # 3. Risk Reduction (ROAM-based)
    rr = calculate_risk_reduction(task["risk_profile"])
    
    # 4. Cost of Delay
    cod = ubv + tc + rr
    
    # 5. Job Duration (adjusted for confidence and accuracy)
    team_accuracy = historical_data[task["team_id"]]["accuracy"]
    duration = calculate_job_duration(
        task["estimate_hours"],
        task["confidence"],
        team_accuracy
    )
    
    # 6. WSJF Score
    wsjf_score = cod / duration if duration > 0 else 0
    
    return {
        "wsjf_score": round(wsjf_score, 2),
        "cod": round(cod, 2),
        "duration": round(duration, 2),
        "breakdown": {
            "user_business_value": round(ubv, 2),
            "time_criticality": round(tc, 2),
            "risk_reduction": round(rr, 2)
        }
    }
```

---

## Success Metrics (Validation)

| Metric | Target | Validation Method |
|--------|--------|-------------------|
| **Estimation Accuracy** | ≥80% | Actual duration / Estimated duration |
| **WSJF Stability** | <10% variance | WSJF score shouldn't change without new data |
| **Value Delivery** | ≥90% | Completed high-WSJF tasks deliver expected value |
| **Gaming Detection** | 0 incidents | Audit trail shows no suspicious score inflation |

---

## Next: Implementation in Coherence Pipeline

**File**: `src/coherence/wsjf_calculator.py`  
**Integration**: `./scripts/ddd-tdd-adr-coherence.sh`  
**Validation**: `tests/coherence/test_wsjf_anti_patterns.py`

