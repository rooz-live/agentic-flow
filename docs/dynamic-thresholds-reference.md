# Dynamic Thresholds Quick Reference

## 🎯 At-a-Glance: What Changed

| Threshold | Old (Hardcoded) | New (Dynamic) | ROAM Risk Reduced |
|-----------|----------------|---------------|-------------------|
| **Circuit Breaker** | 0.7 (fixed) | mean - 2.5σ | ✅ Adapts to strategy |
| **Degradation** | 90% (fixed) | mean - 1.96 SE | ✅ Statistical significance |
| **Cascade** | 10 failures/5min | 3σ above baseline | ✅ Episode velocity |
| **Divergence** | 10% (fixed) | Based on Sharpe | ✅ Market conditions |
| **Check Freq** | Every 10 (fixed) | Based on volatility | ✅ Adaptive monitoring |

---

## 📊 Calculation Formulas

### Circuit Breaker
```
IF n ≥ 30: threshold = μ - 2.5σ     (95% confidence)
IF n ≥ 10: threshold = μ - 3.0σ     (99.7% confidence)  
ELSE:      threshold = 0.5          (conservative)

WHERE:
  μ = mean reward (30-day, successful episodes)
  σ = standard deviation
  n = sample size
```

### Degradation
```
IF n ≥ 30: threshold = μ - 1.96(σ/√n)   (95% CI)
IF n ≥ 10: threshold = μ - 2.5(σ/√n)    (99% CI)
ELSE:      threshold = μ × 0.85         (15% buffer)

WHERE:
  SE = σ/√n (standard error)
  CoV = σ/μ (coefficient of variation)
```

### Cascade
```
IF n ≥ 50: threshold = (μ_fail + 3σ_fail) × 50
ELSE:      threshold = (300s / avg_duration) × 1.5

window = avg_duration × 3 minutes

WHERE:
  μ_fail = baseline failure rate
  σ_fail = failure rate std dev
  avg_duration = episode duration (minutes)
```

### Divergence Rate
```
Sharpe = μ_reward / σ_reward

IF Sharpe > 2.0 AND Success > 85%: 30%  (aggressive)
IF Sharpe > 1.0 AND Success > 70%: 15%  (moderate)
IF Sharpe > 0.5 AND Success > 50%: 8%   (conservative)
ELSE:                              3%   (minimal)
```

### Check Frequency
```
Vol = σ_reward / μ_reward

IF Vol > 0.3  OR FailRate > 0.2: Check every 5
IF Vol > 0.15 OR FailRate > 0.1: Check every 10
ELSE:                            Check every 15
```

---

## 🔍 Decision Tree

```
START: Run Divergence Test
  ↓
Calculate Circuit Breaker
  ├─ n ≥ 30? → Use 2.5σ (tight bounds)
  ├─ n ≥ 10? → Use 3.0σ (conservative)
  └─ n < 10? → Use 0.5 fallback
  ↓
Calculate Divergence Rate
  ├─ Sharpe > 2.0? → 30% exploration
  ├─ Sharpe > 1.0? → 15% exploration
  ├─ Sharpe > 0.5? → 8% exploration
  └─ Otherwise    → 3% exploration
  ↓
Calculate Cascade Threshold
  ├─ n ≥ 50? → Statistical (3σ above baseline)
  └─ n < 50? → Velocity-based (300s / duration × 1.5)
  ↓
Calculate Check Frequency
  ├─ High risk?   → Every 5 episodes
  ├─ Medium risk? → Every 10 episodes
  └─ Low risk?    → Every 15 episodes
  ↓
Run Episodes with Adaptive Monitoring
  ↓
Calculate Degradation Threshold (post-test)
  ├─ n ≥ 30? → 95% CI (1.96 SE)
  ├─ n ≥ 10? → 99% CI (2.5 SE)
  └─ n < 10? → 15% buffer
  ↓
Evaluate Results
  ├─ Skills increased? → SUCCESS (keep data)
  ├─ Reward < threshold? → FAILURE (rollback)
  └─ Inconclusive? → KEEP (for analysis)
```

---

## 📈 Example Scenarios

### Scenario 1: High-Performance Bull Market
```
Input Data (7-day history):
  Mean Reward: 0.92
  Std Dev: 0.08
  Success Rate: 88%
  Sample Size: 45

Calculated Thresholds:
  Circuit Breaker: 0.72  (0.92 - 2.5 × 0.08)
  Divergence Rate: 30%   (Sharpe: 11.5, Success: 88%)
  Cascade: 8 failures/12min
  Check Frequency: Every 15 (low volatility)
  
Interpretation: System is stable → Aggressive exploration safe
```

### Scenario 2: Volatile Bear Market
```
Input Data (7-day history):
  Mean Reward: 0.54
  Std Dev: 0.28
  Success Rate: 62%
  Sample Size: 38

Calculated Thresholds:
  Circuit Breaker: 0.34  (0.54 - 2.5 × 0.28)  [TIGHT!]
  Divergence Rate: 8%    (Sharpe: 1.93, Success: 62%)
  Cascade: 12 failures/6min
  Check Frequency: Every 5 (high volatility)
  
Interpretation: System is unstable → Conservative exploration
```

### Scenario 3: New Strategy (Limited Data)
```
Input Data (7-day history):
  Mean Reward: 0.67
  Std Dev: 0.15
  Success Rate: 75%
  Sample Size: 8

Calculated Thresholds:
  Circuit Breaker: 0.5   (fallback - insufficient data)
  Divergence Rate: 5%    (fallback - small sample)
  Cascade: 5 failures/5min (fallback)
  Check Frequency: Every 10 (default)
  
Interpretation: Insufficient history → Conservative defaults
```

---

## ⚙️ Environment Variables (Override if Needed)

```bash
# Force specific thresholds (bypasses dynamic calculation)
CIRCUIT_BREAKER_THRESHOLD=0.8    # Override circuit breaker
DIVERGENCE_RATE=0.20             # Override divergence rate
CASCADE_THRESHOLD=15             # Override cascade threshold
CASCADE_WINDOW_MINUTES=10        # Override cascade window
CHECK_FREQUENCY=8                # Override check frequency

# Enable debug logging
DEBUG=1                          # Show calculation details

# Usage examples:
DEBUG=1 ./scripts/divergence-testing.sh test orchestrator standup 50
DIVERGENCE_RATE=0.25 ./scripts/divergence-testing.sh test orchestrator standup 100
```

---

## 🚨 When Thresholds Trigger

### Circuit Breaker (During Test)
```
TRIGGER: Current reward < Circuit Breaker Threshold
ACTION:  Immediate rollback + abort test
WHY:     Performance degraded beyond acceptable bounds
```

### Cascade Detector (During Test)
```
TRIGGER: Failures in window > Cascade Threshold
ACTION:  Immediate rollback + abort test
WHY:     System experiencing runaway failures
```

### Degradation Check (After Test)
```
TRIGGER: Final reward < Degradation Threshold
ACTION:  Rollback to backup
WHY:     Net performance worse than baseline (statistically)
```

---

## 📊 Interpreting Metrics

### Sharpe Ratio
```
> 3.0  : Excellent (very high risk-adjusted returns)
2.0-3.0: Very Good (strong performance)
1.0-2.0: Good (acceptable risk-adjusted returns)
0.5-1.0: Acceptable (moderate returns vs risk)
< 0.5  : Poor (high risk for returns)
```

### Coefficient of Variation (CoV)
```
< 0.10 : Very stable (low variance)
0.10-0.20: Stable (moderate variance)
0.20-0.30: Volatile (high variance)
> 0.30 : Very volatile (extreme variance)
```

### Success Rate
```
> 85%  : Excellent
70-85% : Good
50-70% : Acceptable
< 50%  : Poor
```

---

## 🔧 Troubleshooting

### Problem: "Using fallback" warnings
**Cause:** Insufficient historical data (n < 10)  
**Solution:** Run more episodes to build history before testing

### Problem: Thresholds seem too tight/loose
**Cause:** Recent data not representative of true distribution  
**Solution:** Increase lookback window or wait for data stabilization

### Problem: Circuit breaker triggers immediately
**Cause:** Baseline shifted down, threshold calculated from old data  
**Solution:** Check for regime change, may need to reset baseline

### Problem: Cascade detector too sensitive
**Cause:** Episode duration changed, velocity calculation off  
**Solution:** System will auto-adapt after sufficient new data

---

## ✅ Validation Checklist

Before production deployment:

- [ ] Run with `DEBUG=1` to verify calculations
- [ ] Compare calculated thresholds to historical performance
- [ ] Ensure sample sizes adequate (n ≥ 30 preferred)
- [ ] Test fallback scenarios (empty database)
- [ ] Verify SQL queries return expected results
- [ ] Backtest on historical episodes
- [ ] Monitor first few runs closely

---

## 📚 Statistical Background

### Why 1.96σ (95% CI)?
Industry standard for statistical significance (p < 0.05)

### Why 2.5σ and 3.0σ for Circuit Breaker?
- 2.5σ: 98.8% confidence (tight bounds, more sensitive)
- 3.0σ: 99.7% confidence (loose bounds, less false positives)

### Why Standard Error (σ/√n)?
Accounts for sample size - larger samples = tighter bounds

### Why 30-day and 7-day windows?
- 30 days: Sufficient for n ≥ 30 (statistical significance)
- 7 days: Recent performance, responsive to regime changes

---

## 🎓 Further Reading

- [Confidence Intervals](https://en.wikipedia.org/wiki/Confidence_interval)
- [Sharpe Ratio](https://en.wikipedia.org/wiki/Sharpe_ratio)
- [Standard Error](https://en.wikipedia.org/wiki/Standard_error)
- [Coefficient of Variation](https://en.wikipedia.org/wiki/Coefficient_of_variation)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
