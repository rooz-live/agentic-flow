# Production Learning Loop: Building System Maturity

## Overview

This document explains how measuring `run_production_cycle.sh` creates a **feedback loop** that improves `af prod` learnings and accelerates production maturity.

## The Learning Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     LEARNING FEEDBACK LOOP                   │
└─────────────────────────────────────────────────────────────┘

1. MEASURE                    2. LEARN                    3. ADAPT
┌──────────────┐             ┌──────────────┐            ┌──────────────┐
│run_production│────metrics─→│prod_learning │───evidence→│  af prod     │
│  _cycle.sh   │             │ _collector.py│            │ (adaptive)   │
└──────────────┘             └──────────────┘            └──────────────┘
       │                             │                           │
       │ Monitoring                  │ Aggregation              │ Decision
       │ Scripts                     │ Analysis                 │ Optimization
       ▼                             ▼                           ▼
  WIP Monitor              Maturity Score                 Iteration Count
  Site Health              Recommendations                Mode Selection
  Heartbeat                Risk Assessment                Circle Focus
  CI Orchestrator          Trend Analysis                 Rotation Strategy
  Budget Tracker                                          Graduation Timing
```

## Key Benefits

### 1. **Evidence-Based Adaptation**

**Before (blind heuristics):**
```python
# cmd_prod.py current state
if stability < 0.7:
    cycle_iters = 10  # Fixed guess
```

**After (data-driven):**
```python
# Enhanced with learning evidence
learning = load_prod_learning_evidence()
if learning["maturity_score"] < 60:
    cycle_iters = learning["recommended_cycle_iters"]
    mode = "advisory"  # Reduce risk when immature
elif learning["infrastructure_stability"] < 80:
    mode = "advisory"  # Infrastructure issues
else:
    mode = "mutate"  # Safe to mutate
```

### 2. **Composite Maturity Score** (0-100)

Aggregates multiple signals into single metric:

| Factor | Weight | Source | Impact |
|--------|--------|--------|--------|
| **Circle Utilization** | 20% | WIP Monitor | Balanced load → Higher maturity |
| **Deployment Health** | 25% | Site Health Monitor | High uptime → System reliability |
| **Infrastructure Stability** | 20% | Heartbeat Monitor | Low failures → Safe mutations |
| **Revenue Diversification** | 20% | CI Orchestrator | Low concentration → Sustainable |
| **Allocation Efficiency** | 15% | CI Orchestrator | Efficient work distribution |

### 3. **Adaptive Recommendations**

Learning collector generates actionable insights:

```json
{
  "recommendations": [
    "INCREASE_CYCLE_ITERS: Low circle utilization suggests system can handle more load",
    "FOCUS_UNDERUTILIZED_CIRCLES: Diversify revenue sources",
    "REDUCE_MUTATION_RATE: Unstable infrastructure, use advisory mode"
  ]
}
```

## How It Improves af prod

### Current af prod Assessment (Basic)

```python
# scripts/cmd_prod.py lines 40-107
def _calculate_stability_score(metrics):
    failures = count_failures_in_metrics()
    return 1.0 - (failures / total)

def _calculate_maturity_gaps(metrics):
    return count_gap_patterns()

def _calculate_economic_volatility(metrics):
    return coefficient_of_variation(wsjf_changes)
```

**Limitations:**
- Only looks at pattern_metrics.jsonl
- No monitoring script data
- No composite scoring
- No historical trend analysis

### Enhanced af prod Assessment (Learning-Enabled)

```python
# Proposed enhancement to cmd_prod.py
class EnhancedNeedsAssessor(NeedsAssessor):
    def assess_needs_with_learning(self):
        # Get baseline assessment
        base_assessment = super().assess_needs()
        
        # Load learning evidence
        learning = self._load_learning_evidence()
        
        if learning:
            # Override with learned insights
            if learning["maturity_score"] < 50:
                # Immature system → More cautious
                base_assessment["recommended_cycle_iters"] = min(
                    base_assessment["recommended_cycle_iters"], 3
                )
                base_assessment["reason"] += f"; LOW MATURITY ({learning['maturity_score']})"
            
            if learning["infrastructure_stability"] < 70:
                # Unstable infra → Advisory mode only
                base_assessment["recommended_mode"] = "advisory"
                base_assessment["reason"] += "; UNSTABLE INFRASTRUCTURE"
            
            if learning["deployment_health_score"] < 50:
                # Poor health → More swarm exploration
                base_assessment["recommended_swarm_iters"] *= 2
                base_assessment["reason"] += "; POOR DEPLOYMENT HEALTH"
        
        return base_assessment
```

## Maturity Progression Model

### Phase 1: Immature (0-40)
- **Characteristics:** High failures, unstable infrastructure, concentrated revenue
- **af prod behavior:** 
  - Advisory mode only
  - 3-5 cycle iterations
  - 50+ swarm iterations (explore alternatives)
  - No autocommit graduation

### Phase 2: Developing (40-70)
- **Characteristics:** Improving stability, some diversification, moderate health
- **af prod behavior:**
  - Advisory mode with occasional mutate
  - 5-10 cycle iterations
  - 25-50 swarm iterations
  - Shadow autocommit (monitor only)

### Phase 3: Mature (70-85)
- **Characteristics:** Stable infrastructure, diversified revenue, good health
- **af prod behavior:**
  - Mutate mode default
  - 10-25 cycle iterations
  - 10-25 swarm iterations
  - Graduated autocommit (with safeguards)

### Phase 4: Production-Grade (85-100)
- **Characteristics:** Highly stable, optimized allocation, excellent health
- **af prod behavior:**
  - Enforcement mode enabled
  - 25+ cycle iterations
  - 5-10 swarm iterations (maintenance)
  - Full autocommit with confidence

## Integration Points

### 1. run_production_cycle.sh
```bash
# At end of cycle
./scripts/agentic/prod_learning_collector.py
```

**Emits:**
- `.goalie/prod_learning_evidence.jsonl`
- Maturity score
- Recommendations for next cycle

### 2. af prod (Enhanced)
```python
# At start of rotation
learning = load_prod_learning_evidence()
adaptive_params = adjust_based_on_learning(learning)
run_prod_cycle(**adaptive_params)
```

### 3. Evidence Config Integration
```json
{
  "emitters": {
    "prod_maturity": {
      "enabled": true,
      "source": ".goalie/prod_learning_evidence.jsonl",
      "graduation_threshold": 85,
      "required_stable_cycles": 10
    }
  }
}
```

## Measurement Strategy

### Real-Time Metrics

1. **Circle Utilization** → WIP Monitor
   - Current: 0% (all circles empty)
   - Target: 50-70% (balanced load)
   - Impact: Higher → More throughput

2. **Deployment Health** → Site Health Monitor
   - Current: 0% (all sites down in test)
   - Target: >95% (production readiness)
   - Impact: Higher → Safe to mutate

3. **Infrastructure Stability** → Heartbeat Monitor
   - Current: 0% (device down)
   - Target: >95% (reliable execution)
   - Impact: Higher → Enable enforcement mode

4. **Revenue Concentration** → CI Orchestrator
   - Current: 69.6% from testing circle
   - Target: <40% from any single circle
   - Impact: Lower → Sustainable growth

5. **Allocation Efficiency** → CI Orchestrator
   - Current: 0% (imbalanced workload)
   - Target: >80% (optimized distribution)
   - Impact: Higher → Cost efficiency

### Historical Trends

```python
def analyze_maturity_trend(days=7):
    """Track maturity score progression"""
    evidence = load_evidence_history(days)
    scores = [e["maturity_score"] for e in evidence]
    
    trend = calculate_trend(scores)
    if trend == "IMPROVING":
        # System learning, maintain strategy
        return "MAINTAIN"
    elif trend == "DECLINING":
        # System degrading, reduce risk
        return "DEGRADE_TO_ADVISORY"
    else:
        # Stable, consider graduation
        return "CONSIDER_GRADUATION"
```

## Autocommit Graduation Example

### Graduation Criteria (from evidence_config.json)

```python
graduation_assessment = {
    "green_streak_required": 10,      # 10 consecutive passing cycles
    "min_stability_score": 95,        # 95% stability required
    "min_ok_rate": 98,                # 98% success rate
    "max_sys_state_err": 0,           # Zero system errors
    "min_maturity_score": 85,         # NEW: From learning evidence
    "min_infrastructure_stability": 95, # NEW: From heartbeat
    "max_revenue_concentration": 40    # NEW: From CI orchestrator
}
```

### Graduation Decision Logic

```python
def assess_autocommit_graduation():
    learning = load_latest_learning_evidence()
    graduation = load_graduation_history()
    
    # Check all criteria
    checks = {
        "green_streak": graduation["green_streak"] >= 10,
        "stability": graduation["stability_score"] >= 95,
        "ok_rate": graduation["ok_rate"] >= 98,
        "maturity": learning["maturity_score"] >= 85,
        "infrastructure": learning["infrastructure_stability"] >= 95,
        "revenue_div": learning["revenue_concentration_risk"] == "LOW"
    }
    
    if all(checks.values()):
        return "READY_FOR_AUTOCOMMIT"
    else:
        failed = [k for k, v in checks.items() if not v]
        return f"NOT_READY: {', '.join(failed)}"
```

## Compounding Effects

### Short-Term (1-2 weeks)
- Better iteration tuning
- Reduced false positives in guards
- Faster issue detection

### Medium-Term (1-3 months)
- Predictive maintenance
- Optimal resource allocation
- Graduated autocommit in low-risk areas

### Long-Term (3-12 months)
- Self-optimizing system
- Autonomous maturity progression
- Economic compounding through efficiency

## ROI Measurement

### Metrics to Track

1. **Cycle Efficiency**
   - Before: Fixed 5 iterations
   - After: Adaptive 3-25 iterations
   - Benefit: 2-5x throughput in mature systems

2. **Deployment Confidence**
   - Before: Manual approval always required
   - After: Graduated autocommit at 85+ maturity
   - Benefit: 10x faster deployment velocity

3. **Resource Utilization**
   - Before: 0% (underutilized circles)
   - After: 50-70% (optimized allocation)
   - Benefit: Better ROI on infrastructure

4. **Revenue Diversification**
   - Before: 69.6% concentration
   - After: <40% concentration
   - Benefit: Sustainable growth, reduced risk

## Next Steps

### 1. Enable Learning Collection
```bash
./run_production_cycle.sh  # Now includes prod_learning_collector.py
```

### 2. Enhance af prod
```bash
# Edit scripts/cmd_prod.py
# Add load_learning_evidence() function
# Integrate into assess_needs()
```

### 3. Monitor Maturity Trend
```bash
# View historical maturity scores
jq '.maturity_score' .goalie/prod_learning_evidence.jsonl | \
  awk '{sum+=$1; n++} END {print "Avg:", sum/n}'
```

### 4. Visualize Progress
```python
import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_json('.goalie/prod_learning_evidence.jsonl', lines=True)
df['timestamp'] = pd.to_datetime(df['timestamp'])
df.set_index('timestamp')['maturity_score'].plot(title='Production Maturity Trend')
plt.ylabel('Maturity Score (0-100)')
plt.show()
```

## Conclusion

Building and measuring `run_production_cycle.sh` creates a **virtuous cycle**:

1. **Measure** → Monitoring scripts generate operational data
2. **Learn** → Learning collector aggregates into maturity insights  
3. **Adapt** → af prod adjusts strategy based on evidence
4. **Improve** → System evolves toward maturity
5. **Compound** → Mature systems enable more aggressive optimization

This transforms `af prod` from a **static orchestrator** into a **learning system** that compounds improvements over time.
