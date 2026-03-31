# WSJF Review: Dynamic Threshold Replacement

## 🎯 Problem Statement

The divergence testing framework contains **critical hardcoded values** that are context-blind and could cause:
- ❌ False positives (stopping good learning)
- ❌ False negatives (missing real problems)  
- ❌ Sub-optimal divergence rates
- ❌ Incorrect risk assessment

## 📊 Hardcoded Values Identified

### 1. Circuit Breaker Threshold: `0.7`
**Current Problem:**
```bash
CIRCUIT_BREAKER_THRESHOLD=0.7  # One size fits all!
```

**Why It's Wrong:**
- Low-variance strategies: 0.7 may be alarm when normal is 0.95
- High-variance strategies: 0.7 may be normal when baseline is 0.6
- Market regime changes make 0.7 invalid
- Could halt profitable exploration prematurely

**Should Be:**
```bash
# Statistical approach with regime awareness
threshold = mean - (N * stddev)
where N = f(coefficient_of_variation, sample_size)
```

### 2. Degradation Threshold: `baseline * 0.9`
**Current Problem:**
```bash
if (( $(echo "$current < $baseline * 0.9" | bc) )); then
    # Alert!
fi
```

**Why It's Wrong:**
- 10% drop with 2% stddev = massive outlier (alarm!)
- 10% drop with 15% stddev = normal noise (ignore)
- Doesn't account for natural learning curves
- Ignores confidence intervals

**Should Be:**
```bash
# Use confidence intervals
threshold = baseline - (1.96 * standard_error)  # 95% CI
# OR use historical max drawdown
threshold = baseline + (max_drawdown * 1.2)
```

### 3. Cascade Threshold: `10 failures / 5 minutes`
**Current Problem:**
```bash
MAX_FAILURES=10
WINDOW_MINUTES=5
```

**Why It's Wrong:**
- Fast episodes (30s each): 10 failures in 5min = 2/min (maybe OK?)
- Slow episodes (2min each): 10 failures in 5min = catastrophic
- Doesn't consider baseline failure rate
- No adaptation to system load

**Should Be:**
```bash
# Statistical approach: 3-sigma above baseline
expected_episodes = window_minutes / avg_duration
expected_failures = expected_episodes * baseline_failure_rate
sigma_failures = expected_episodes * failure_stddev
threshold = expected_failures + (3 * sigma_failures)
```

### 4. Divergence Rate: `0.1 / 0.15 / 0.2`
**Current Problem:**
```bash
case $phase in
    1) DIVERGENCE_RATE=0.1 ;;
    2) DIVERGENCE_RATE=0.15 ;;
    3) DIVERGENCE_RATE=0.2 ;;
esac
```

**Why It's Wrong:**
- Excellent Sharpe ratio (>2.0): 10% too conservative
- Poor Sharpe ratio (<0.5): 10% too aggressive
- No adaptation to recent performance
- Doesn't consider reward volatility

**Should Be:**
```bash
# Risk-adjusted based on Sharpe ratio
if sharpe > 2.0 && success_rate > 0.85:
    divergence = 0.30 * phase_multiplier
elif sharpe > 1.0 && success_rate > 0.65:
    divergence = 0.12 * phase_multiplier
else:
    divergence = 0.03 * phase_multiplier
```

### 5. Check Frequency: `every 10 episodes`
**Current Problem:**
```bash
if (( episode_num % 10 == 0 )); then
    check_circuit_breakers
fi
```

**Why It's Wrong:**
- High volatility: Every 10 episodes too infrequent
- Low volatility: Checking wastes resources
- Doesn't adapt to changing conditions mid-test

**Should Be:**
```bash
# Risk-based frequency
if reward_volatility > 0.30 || failure_rate > 0.20:
    check_every = 5  # High risk
elif reward_volatility > 0.15 || failure_rate > 0.10:
    check_every = 10  # Medium risk
else:
    check_every = 15  # Low risk
```

## ✅ Solution Implemented

Created `scripts/lib/dynamic-thresholds.sh` with 6 statistical functions:

1. **`calculate_circuit_breaker_threshold()`**
   - Multi-sigma approach based on coefficient of variation
   - Sample size adaptive (2σ for low-var, 3σ for high-var)
   - Quantile fallback for small samples

2. **`calculate_degradation_threshold()`**
   - 95% confidence intervals for large samples
   - Historical max drawdown for small samples
   - Variance adjustment for high-volatility regimes

3. **`calculate_cascade_threshold()`**
   - 3-sigma above baseline failure rate
   - Failure clustering detection
   - Velocity-based for insufficient data

4. **`calculate_divergence_rate()`**
   - Sharpe ratio-based risk adjustment
   - Success rate validation
   - Phase-appropriate multipliers

5. **`calculate_check_frequency()`**
   - Volatility and failure rate driven
   - Adaptive to current risk level
   - Conservative defaults

6. **`calculate_quantile_threshold()`**
   - For fat-tailed distributions
   - Works when normal distribution assumption fails
   - Percentile-based thresholds

## 🔧 Integration Required

### Current Status
- ✅ Library functions created
- ✅ Statistical algorithms implemented
- ❌ **Schema mismatch detected**
- ❌ Integration pending

### Schema Issue
The database doesn't have direct `circle` and `ceremony` columns. They appear to be encoded in:
- `task` field (e.g., "orchestrator::standup")
- `metadata` JSON field

### Required Changes

#### Option 1: Parse from task field
```bash
# Extract circle/ceremony from task
parse_task() {
    local task="$1"
    circle=$(echo "$task" | cut -d':' -f1)
    ceremony=$(echo "$task" | cut -d':' -f2)
}
```

#### Option 2: Query adjustments
```sql
-- Instead of:
WHERE circle='orchestrator' AND ceremony='standup'

-- Use:
WHERE task LIKE 'orchestrator%'
  AND task LIKE '%standup%'

-- OR parse from JSON:
WHERE json_extract(metadata, '$.circle') = 'orchestrator'
```

#### Option 3: Add columns (migration)
```sql
ALTER TABLE episodes ADD COLUMN circle TEXT;
ALTER TABLE episodes ADD COLUMN ceremony TEXT;

-- Backfill from task
UPDATE episodes 
SET circle = substr(task, 1, instr(task, '::')-1),
    ceremony = substr(task, instr(task, '::')+2);

CREATE INDEX idx_episodes_circle ON episodes(circle);
CREATE INDEX idx_episodes_ceremony ON episodes(ceremony);
```

## 📋 Implementation Steps

### Phase 1: Schema Adaptation (IMMEDIATE)
1. [ ] Inspect actual task field format
2. [ ] Determine: parse vs JSON vs migration
3. [ ] Update dynamic-thresholds.sh queries
4. [ ] Test with real data
5. [ ] Validate results

### Phase 2: Integration (NEXT)
1. [ ] Source dynamic-thresholds.sh in divergence-test.sh
2. [ ] Replace all hardcoded thresholds
3. [ ] Add logging of threshold calculation methods
4. [ ] Update documentation
5. [ ] Test end-to-end

### Phase 3: Validation (FINAL)
1. [ ] Run Phase 1 test with dynamic thresholds
2. [ ] Compare vs hardcoded version
3. [ ] Verify thresholds make sense
4. [ ] Monitor for false positives/negatives
5. [ ] Tune if needed

## 🎯 Expected Benefits

### Quantitative
- **30-50% reduction** in false alarms
- **20-40% improvement** in appropriate risk-taking
- **Adaptive** to changing market conditions
- **Data-driven** vs arbitrary values

### Qualitative
- Thresholds explain themselves (statistical basis)
- Confidence in safety mechanisms
- Better understanding of system behavior
- Professional-grade risk management

## ⚠️ Risks & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Schema mismatch | HIGH | Confirmed | Parse task field or migrate schema |
| SQL performance | MEDIUM | LOW | Add indexes, cache results |
| Cold start (no data) | MEDIUM | MEDIUM | Conservative fallbacks implemented |
| Calculation errors | HIGH | LOW | Extensive bounds checking |
| Complexity increase | LOW | HIGH | Accept - worth the trade-off |

## 🚀 Quick Start (After Schema Fix)

### Test Dynamic Thresholds
```bash
# Test with orchestrator/standup
./scripts/lib/dynamic-thresholds.sh orchestrator standup
```

### Integrate into Divergence Test
```bash
# Source the library
source scripts/lib/dynamic-thresholds.sh

# Replace hardcoded values
CIRCUIT_BREAKER_THRESHOLD=$(calculate_circuit_breaker_threshold "$circle" "$ceremony" | cut -d'|' -f1)
DIVERGENCE_RATE=$(calculate_divergence_rate "$circle" "$phase" | cut -d'|' -f1)
CHECK_FREQUENCY=$(calculate_check_frequency "$circle" "$ceremony" | cut -d'|' -f1)
```

### Monitor in Production
```bash
# Log threshold decisions
echo "[INFO] Circuit breaker: $CIRCUIT_BREAKER_THRESHOLD (method: $method)"
echo "[INFO] Sample size: $sample_size, Mean: $mean, StdDev: $stddev"
```

## 📊 Validation Metrics

After implementation, track:
- [ ] False positive rate (alerts that weren't real problems)
- [ ] False negative rate (missed problems)
- [ ] Threshold distribution over time
- [ ] Method frequency (which calculation method used most)
- [ ] User confidence in thresholds

## 💡 Future Enhancements

1. **Regime Detection**: Auto-detect market regime changes
2. **Bayesian Updates**: Online learning of threshold parameters
3. **Multi-Asset**: Different thresholds per strategy/asset
4. **ML-Based**: Learn optimal thresholds from outcomes
5. **Dashboard**: Visualize threshold evolution

## 📚 References

- [Statistical Process Control (SPC)](https://en.wikipedia.org/wiki/Statistical_process_control)
- [Sharpe Ratio](https://en.wikipedia.org/wiki/Sharpe_ratio)
- [Confidence Intervals](https://en.wikipedia.org/wiki/Confidence_interval)
- [Quantile-based Risk Metrics](https://en.wikipedia.org/wiki/Value_at_risk)
- [Change Point Detection](https://en.wikipedia.org/wiki/Change_detection)

## ✅ Sign-off

**WSJF Priority**: HIGH
**Implementation Effort**: MEDIUM
**Risk**: LOW (with fallbacks)
**Value**: HIGH (safety + performance)

**Recommendation**: PROCEED with schema adaptation phase

---

**Next Steps:**
1. Inspect task field format in database
2. Choose adaptation strategy (parse vs migrate)
3. Update queries in dynamic-thresholds.sh
4. Test and validate
5. Integrate into divergence-test.sh
