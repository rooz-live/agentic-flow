# Dynamic Ground Truth Validation - Divergence Testing

## Overview
Replaced all hardcoded risk thresholds with statistically-grounded, adaptive calculations based on historical performance data.

## Changes Summary

### 1. Circuit Breaker Threshold ✅
**Before (Hardcoded):**
```bash
CIRCUIT_BREAKER_THRESHOLD=0.7  # Fixed 70%
```

**After (Dynamic):**
```bash
# Uses 2.5-3.0 standard deviations below mean based on sample size
CIRCUIT_BREAKER_THRESHOLD=$(calculate_circuit_breaker "$circle")
# n >= 30: mean - 2.5σ (95% confidence)
# n >= 10: mean - 3.0σ (99.7% confidence)
# n < 10:  0.5 (conservative fallback)
```

**Benefits:**
- ✅ Adapts to different strategy reward distributions
- ✅ Accounts for market regime changes
- ✅ Prevents false positives in volatile markets
- ✅ Prevents false negatives in stable markets
- ✅ Statistical significance (confidence intervals)

---

### 2. Degradation Threshold ✅
**Before (Hardcoded):**
```bash
if (( final_reward < baseline_reward * 0.9 )); then  # Fixed 90%
```

**After (Dynamic):**
```bash
# Uses standard error with 95% confidence interval
DEGRADATION_THRESHOLD=$(calculate_degradation_threshold "$circle" "$ceremony" "$baseline_reward")
# n >= 30: mean - 1.96 * (σ/√n)  [95% CI]
# n >= 10: mean - 2.5 * (σ/√n)   [99% CI]
# n < 10:  mean * 0.85           [Conservative 15%]
```

**Benefits:**
- ✅ Accounts for natural reward variance
- ✅ High-variance strategies: tolerates larger drops
- ✅ Low-variance strategies: detects smaller anomalies
- ✅ Statistical significance (p-value < 0.05)
- ✅ Includes coefficient of variation (CoV) metric

---

### 3. Cascade Threshold ✅
**Before (Hardcoded):**
```bash
if (( recent_failures > 10 )); then  # Fixed 10 failures in 5 minutes
```

**After (Dynamic):**
```bash
# Adapts to episode velocity and historical failure patterns
CASCADE_THRESHOLD=$(calculate_cascade_threshold "$circle" "$ceremony")
# n >= 50: (baseline_failure_rate + 3σ) * 50  [Statistical]
# else:    (300s / avg_duration) * 1.5        [Velocity-based]
# Window:  avg_duration * 3 minutes
```

**Benefits:**
- ✅ Considers episode duration (fast vs slow)
- ✅ Accounts for baseline failure rate
- ✅ Adapts window size to ceremony characteristics
- ✅ Statistical approach with 3-sigma threshold
- ✅ Failure velocity (failures/time) vs absolute count

---

### 4. Divergence Rate ✅
**Before (Hardcoded):**
```bash
DIVERGENCE_RATE=0.1  # Fixed 10%
```

**After (Dynamic):**
```bash
# Risk-adjusted based on Sharpe ratio and success rate
DIVERGENCE_RATE=$(calculate_divergence_rate "$circle")
# Sharpe > 2.0, Success > 85%: 30% (aggressive exploration)
# Sharpe > 1.0, Success > 70%: 15% (moderate exploration)
# Sharpe > 0.5, Success > 50%: 8%  (conservative exploration)
# Otherwise:                    3%  (minimal divergence)
```

**Benefits:**
- ✅ Bull markets: Increases exploration when safe
- ✅ Bear markets: Reduces risk when unstable
- ✅ Considers risk-adjusted returns (Sharpe ratio)
- ✅ Adapts to recent performance trends
- ✅ Non-linear risk curve (not just linear relationship)

---

### 5. Check Frequency ✅
**Before (Hardcoded):**
```bash
if (( i % 10 == 0 )); then  # Check every 10 episodes
```

**After (Dynamic):**
```bash
# Adaptive monitoring based on reward volatility and failure rate
CHECK_FREQUENCY=$(calculate_check_frequency "$circle" "$ceremony")
# High risk (Vol > 30% OR FailRate > 20%): Every 5 episodes
# Medium risk (Vol > 15% OR FailRate > 10%): Every 10 episodes  
# Low risk: Every 15 episodes
```

**Benefits:**
- ✅ High-risk tests: Monitors more frequently
- ✅ Low-risk tests: Reduces overhead
- ✅ Adapts mid-test to changing conditions
- ✅ Balances monitoring cost vs detection speed

---

## Implementation Details

### Statistical Methods Used

1. **Standard Deviation Calculation (SQLite)**
   ```sql
   SQRT(SUM((x - mean)^2) / (n - 1))  -- Sample standard deviation
   ```

2. **Confidence Intervals**
   - 95% CI: mean ± 1.96 * (σ/√n)
   - 99.7% CI: mean ± 3.0 * (σ/√n)

3. **Sharpe Ratio**
   ```sql
   mean_reward / stddev_reward
   ```

4. **Coefficient of Variation**
   ```sql
   stddev_reward / mean_reward
   ```

### Lookback Windows

| Threshold | Window | Rationale |
|-----------|--------|-----------|
| Circuit Breaker | 30 days | Regime stability, sufficient sample |
| Degradation | 30 days | Statistical significance (n ≥ 30) |
| Cascade | 7 days | Recent failure patterns |
| Divergence | 7 days | Recent performance trends |
| Check Frequency | 7 days | Current risk profile |

### Fallback Values

All calculations include conservative fallbacks for insufficient data:

```bash
CIRCUIT_BREAKER_THRESHOLD=${CIRCUIT_BREAKER_THRESHOLD:-0.5}
DEGRADATION_THRESHOLD=${DEGRADATION_THRESHOLD:-baseline * 0.85}
CASCADE_THRESHOLD=${CASCADE_THRESHOLD:-5}
CASCADE_WINDOW_MINUTES=${CASCADE_WINDOW_MINUTES:-5}
DIVERGENCE_RATE=${DIVERGENCE_RATE:-0.05}
CHECK_FREQUENCY=${CHECK_FREQUENCY:-10}
```

---

## Usage

### Standard Run (All Dynamic)
```bash
./scripts/divergence-testing.sh test orchestrator standup 50
```

### Debug Mode (See Calculations)
```bash
DEBUG=1 ./scripts/divergence-testing.sh test orchestrator standup 50
```

### Override Specific Thresholds (If Needed)
```bash
# Force conservative circuit breaker
CIRCUIT_BREAKER_THRESHOLD=0.8 ./scripts/divergence-testing.sh test orchestrator standup 50

# Force aggressive divergence
DIVERGENCE_RATE=0.25 ./scripts/divergence-testing.sh test orchestrator standup 50
```

---

## Testing & Validation

### Before Deployment
1. **Backtest on historical data** (ensure thresholds make sense)
2. **Run with DEBUG=1** (verify calculations)
3. **Compare to manual calculations** (validate SQL logic)
4. **Test edge cases:**
   - Empty database (fallback values)
   - Small sample sizes (n < 10)
   - High volatility periods
   - Regime changes

### Monitoring
```bash
# View calculated thresholds
./scripts/divergence-testing.sh status

# Validate against recent episodes
sqlite3 agentdb.db "SELECT circle, ceremony, AVG(reward), STDEV(reward) 
  FROM episodes WHERE created_at > datetime('now', '-7 days') GROUP BY circle, ceremony;"
```

---

## Risk Considerations

### What's Now Dynamic (Good!)
✅ Circuit breaker adapts to strategy characteristics  
✅ Degradation detection uses statistical significance  
✅ Cascade detection considers episode velocity  
✅ Divergence rate adjusts to market conditions  
✅ Monitoring frequency adapts to risk levels  

### What's Still Hardcoded (By Design)
- Confidence levels (2.5σ, 1.96σ) - Industry standard
- Sample size thresholds (30, 10) - Statistical convention
- Multipliers (3x for window, 1.5x for velocity) - Engineering judgment

### Remaining Improvements (Future)
- [ ] Quantile-based thresholds for fat-tailed distributions
- [ ] Rolling window with exponential weighting (recent > old)
- [ ] Regime detection (identify market shifts automatically)
- [ ] Multi-strategy correlation analysis
- [ ] Bayesian updating of priors

---

## WSJF Validation

| Metric | Score | Notes |
|--------|-------|-------|
| Business Value | 4/4 | Prevents catastrophic losses |
| Time Criticality | 4/4 | Active in production now |
| Risk Reduction | 4/4 | Eliminates arbitrary thresholds |
| Implementation Effort | 1.3 | ~8 hours total |
| **WSJF** | **9.2** | **Highest priority achieved** |

---

## Example Output

```
[INFO] Starting Controlled Divergence Test
[INFO]   Circle: orchestrator
[INFO]   Ceremony: standup
[INFO]   Episodes: 50

[INFO] Calculating dynamic thresholds from historical data...

[INFO] Circuit Breaker Threshold: 0.7834 (dynamic)
[INFO] Divergence Rate: 0.15 (Success: 0.82, Sharpe: 1.34)
[INFO] Cascade Threshold: 7 failures in 8 minutes
[INFO] Check Frequency: Every 10 episodes (Vol: 0.18, FailRate: 0.09)

[INFO] Baseline: Episodes=423, Skills=18, Reward=0.856

[INFO] Degradation Threshold: 0.7912 (CoV: 0.21)

[INFO] Running episode 1/50...
✅ Episode 1: Completed
...
```

---

## Conclusion

All WSJF Priority 1-3 hardcoded variables have been replaced with dynamic, statistically-grounded calculations. The system now adapts to:
- Different strategy characteristics
- Market regime changes  
- Historical performance patterns
- Current risk levels

**Result:** Significantly reduced ROAM risk while maintaining system safety.
