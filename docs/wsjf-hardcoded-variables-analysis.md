# WSJF Analysis: Hardcoded Variables Risk Assessment

**Date:** 2026-01-10  
**Script:** `scripts/divergence-testing.sh`  
**Analysis:** Identify hardcoded variables with highest risk requiring dynamic validation

## WSJF Scoring Framework

**Business Value (BV):** 1-10 (higher = more critical to system reliability)  
**Time Criticality (TC):** 1-10 (higher = more urgent to fix)  
**Risk Reduction (RR):** 1-10 (higher = greater risk if not fixed)  
**Job Size (JS):** 1-10 (higher = more effort to implement)  

**WSJF Score = (BV + TC + RR) / JS**

---

## 🔴 CRITICAL PRIORITY (WSJF > 7.0)

### 1. CIRCUIT_BREAKER_THRESHOLD=0.7 (Line 19)
**Current Implementation:**
```bash
CIRCUIT_BREAKER_THRESHOLD="${CIRCUIT_BREAKER_THRESHOLD:-0.7}"
```

**WSJF Analysis:**
- **BV:** 10 - System safety mechanism, prevents catastrophic losses
- **TC:** 10 - Active production risk with market regime changes
- **RR:** 10 - Could halt profitable strategies OR allow degradation
- **JS:** 6 - Medium complexity (requires statistical analysis)
- **WSJF:** (10+10+10)/6 = **5.0**

**Issues:**
- ❌ 0.7 threshold assumes static reward distribution
- ❌ No adaptation to market regime changes
- ❌ Different strategies have different reward profiles
- ❌ Could prematurely halt exploration in bull markets
- ❌ Could allow degradation during regime shifts

**Dynamic Replacement:**
```sql
CIRCUIT_BREAKER_THRESHOLD=$(sqlite3 "$ROOT_DIR/agentdb.db" <<SQL
WITH recent_stats AS (
  SELECT 
    AVG(reward) as mean_reward,
    STDEV(reward) as stddev_reward,
    COUNT(*) as sample_size,
    MIN(reward) as min_reward,
    MAX(reward) as max_reward
  FROM episodes 
  WHERE circle='$circle' 
    AND success=1
    AND created_at > datetime('now', '-30 days')
),
regime_detection AS (
  SELECT 
    AVG(reward) as recent_mean,
    STDEV(reward) as recent_stddev
  FROM episodes
  WHERE circle='$circle'
    AND success=1
    AND created_at > datetime('now', '-7 days')
)
SELECT 
  CASE 
    -- Sufficient sample size: Use statistical approach
    WHEN rs.sample_size >= 30 THEN 
      -- Adaptive: 2.5 sigma below mean, but never below 5th percentile
      MAX(
        rs.mean_reward - (2.5 * rs.stddev_reward),
        rs.min_reward + ((rs.max_reward - rs.min_reward) * 0.05)
      )
    -- Small sample: Conservative approach
    WHEN rs.sample_size >= 10 THEN 
      rs.mean_reward - (3.0 * rs.stddev_reward)
    -- Fallback: Use recent performance
    ELSE 
      COALESCE(rd.recent_mean * 0.6, 0.5)
  END as threshold
FROM recent_stats rs
LEFT JOIN regime_detection rd;
SQL
)

# Ensure non-negative threshold
CIRCUIT_BREAKER_THRESHOLD=$(echo "if ($CIRCUIT_BREAKER_THRESHOLD < 0) 0.1 else $CIRCUIT_BREAKER_THRESHOLD" | bc)
```

---

### 2. Degradation Check: baseline_reward * 0.9 (Line 234)
**Current Implementation:**
```bash
elif (( final_reward < baseline_reward * 0.9 )); then
```

**WSJF Analysis:**
- **BV:** 10 - Determines data retention vs rollback
- **TC:** 9 - Affects learning quality immediately
- **RR:** 10 - Could discard valuable learning OR keep bad data
- **JS:** 5 - Moderate complexity (statistical significance test)
- **WSJF:** (10+9+10)/5 = **5.8** ⭐ HIGHEST

**Issues:**
- ❌ 10% degradation threshold ignores variance
- ❌ Low-variance strategies: 10% = massive outlier
- ❌ High-variance strategies: 10% = normal noise
- ❌ No confidence intervals or statistical significance
- ❌ Doesn't account for natural learning curves

**Dynamic Replacement:**
```bash
# Calculate statistically significant degradation threshold
DEGRADATION_ANALYSIS=$(sqlite3 "$ROOT_DIR/agentdb.db" <<SQL
WITH baseline_stats AS (
  SELECT 
    AVG(reward) as mean_reward,
    STDEV(reward) as stddev_reward,
    COUNT(*) as n,
    -- Calculate coefficient of variation
    STDEV(reward) / NULLIF(AVG(reward), 0) as cv
  FROM episodes 
  WHERE circle='$circle' AND ceremony='$ceremony'
    AND success=1
    AND created_at < datetime('now', '-1 day')  -- Before test
),
recent_stats AS (
  SELECT 
    AVG(reward) as recent_mean,
    STDEV(reward) as recent_stddev,
    COUNT(*) as recent_n
  FROM episodes
  WHERE circle='$circle' AND ceremony='$ceremony'
    AND success=1
    AND created_at >= datetime('now', '-1 day')  -- During test
)
SELECT 
  -- Calculate 95% confidence interval threshold
  CASE
    -- Large sample: Use t-test approximation
    WHEN bs.n >= 30 AND rs.recent_n >= 30 THEN
      bs.mean_reward - (1.96 * bs.stddev_reward / SQRT(bs.n))
    -- Medium sample: More conservative
    WHEN bs.n >= 10 THEN
      bs.mean_reward - (2.5 * bs.stddev_reward / SQRT(bs.n))
    -- Small sample: Adaptive based on coefficient of variation
    ELSE
      CASE 
        WHEN bs.cv < 0.1 THEN bs.mean_reward * 0.95  -- Low variance: tight threshold
        WHEN bs.cv < 0.2 THEN bs.mean_reward * 0.90  -- Medium variance
        ELSE bs.mean_reward * 0.85  -- High variance: loose threshold
      END
  END as degradation_threshold,
  bs.cv as coeff_variation,
  bs.stddev_reward as baseline_stddev
FROM baseline_stats bs, recent_stats rs;
SQL
)

DEGRADATION_THRESHOLD=$(echo "$DEGRADATION_ANALYSIS" | cut -d'|' -f1)
COEFF_VARIATION=$(echo "$DEGRADATION_ANALYSIS" | cut -d'|' -f2)
BASELINE_STDDEV=$(echo "$DEGRADATION_ANALYSIS" | cut -d'|' -f3)

# Evaluate with statistical context
if (( $(echo "$final_reward < $DEGRADATION_THRESHOLD" | bc -l) )); then
    log_error "FAILURE: Statistically significant degradation detected"
    log_error "  Final reward: $final_reward"
    log_error "  Threshold (95% CI): $DEGRADATION_THRESHOLD"
    log_error "  Coefficient of Variation: $COEFF_VARIATION"
    log_warn "Rolling back to backup"
    mv "$BACKUP_DB" "$ROOT_DIR/agentdb.db"
fi
```

---

### 3. Cascade Failures: 10 failures in 5 minutes (Lines 133-136)
**Current Implementation:**
```bash
local recent_failures=$(sqlite3 "$ROOT_DIR/agentdb.db" \
    "SELECT COUNT(*) FROM episodes WHERE success = 0 AND created_at > datetime('now', '-5 minutes');")

if (( recent_failures > 10 )); then
```

**WSJF Analysis:**
- **BV:** 9 - Prevents system cascade failures
- **TC:** 10 - Active risk in high-velocity scenarios
- **RR:** 9 - Could miss cascades OR false alarm
- **JS:** 7 - Higher complexity (velocity-based calculation)
- **WSJF:** (9+10+9)/7 = **4.0**

**Issues:**
- ❌ Absolute count meaningless without baseline
- ❌ Fast episodes: 10 failures in 5 min might be acceptable
- ❌ Slow episodes: 10 failures = catastrophic
- ❌ Doesn't consider failure rate or velocity
- ❌ No adaptation to system load

**Dynamic Replacement:**
```bash
# Calculate dynamic cascade threshold based on failure velocity and baseline
CASCADE_CONFIG=$(sqlite3 "$ROOT_DIR/agentdb.db" <<SQL
WITH historical_stats AS (
  SELECT 
    -- Average episode duration in minutes
    AVG(CAST((julianday(completed_at) - julianday(created_at)) * 1440 AS REAL)) as avg_duration_min,
    -- Baseline failure rate (failures per 100 episodes)
    AVG(CASE WHEN success = 0 THEN 100.0 ELSE 0.0 END) as baseline_failure_rate,
    -- Standard deviation of failure rate
    STDEV(CASE WHEN success = 0 THEN 100.0 ELSE 0.0 END) as failure_rate_stddev,
    -- Total episodes for confidence
    COUNT(*) as total_episodes
  FROM episodes
  WHERE circle='$circle' AND ceremony='$ceremony'
    AND created_at > datetime('now', '-30 days')
    AND created_at < datetime('now', '-1 hour')  -- Exclude very recent
)
SELECT 
  CASE 
    -- Statistical approach: 3-sigma above baseline
    WHEN total_episodes >= 50 THEN
      CAST(
        ((baseline_failure_rate + (3 * failure_rate_stddev)) / 100.0) * 
        (300.0 / NULLIF(avg_duration_min, 0))  -- Scale to 5-min window
        AS INTEGER
      )
    -- Velocity-based with safety factor
    WHEN total_episodes >= 10 THEN
      CAST((300.0 / NULLIF(avg_duration_min, 1)) * 2.0 AS INTEGER)
    -- Conservative fallback
    ELSE 5
  END as failure_threshold,
  -- Adaptive window based on episode velocity
  CAST(
    GREATEST(5, avg_duration_min * 3)  -- At least 5 min, or 3x avg duration
    AS INTEGER
  ) as window_minutes,
  baseline_failure_rate,
  total_episodes
FROM historical_stats;
SQL
)

CASCADE_THRESHOLD=$(echo "$CASCADE_CONFIG" | cut -d'|' -f1)
CASCADE_WINDOW=$(echo "$CASCADE_CONFIG" | cut -d'|' -f2)
BASELINE_FAILURE_RATE=$(echo "$CASCADE_CONFIG" | cut -d'|' -f3)

# Ensure minimum thresholds
CASCADE_THRESHOLD=${CASCADE_THRESHOLD:-5}
CASCADE_WINDOW=${CASCADE_WINDOW:-5}

# Use dynamic window
check_cascade_failures() {
    local recent_failures=$(sqlite3 "$ROOT_DIR/agentdb.db" \
        "SELECT COUNT(*) FROM episodes WHERE success = 0 AND created_at > datetime('now', '-$CASCADE_WINDOW minutes');" \
        2>/dev/null || echo "0")
    
    if (( recent_failures > CASCADE_THRESHOLD )); then
        log_error "CASCADE DETECTED: $recent_failures failures in last $CASCADE_WINDOW minutes"
        log_error "  Threshold: $CASCADE_THRESHOLD (baseline rate: ${BASELINE_FAILURE_RATE}%)"
        return 1
    fi
    
    return 0
}
```

---

## 🟡 HIGH PRIORITY (WSJF 4.0-7.0)

### 4. DIVERGENCE_RATE=0.1 (Line 18)
**Current Implementation:**
```bash
DIVERGENCE_RATE="${DIVERGENCE_RATE:-0.1}"  # 10% default
```

**WSJF Analysis:**
- **BV:** 8 - Affects exploration/exploitation balance
- **TC:** 7 - Important but not immediately critical
- **RR:** 8 - Suboptimal learning speed
- **JS:** 6 - Requires risk-adjusted calculation
- **WSJF:** (8+7+8)/6 = **3.8**

**Issues:**
- ❌ 10% divergence doesn't adapt to performance
- ❌ Bull market: Too conservative
- ❌ Bear market: Too aggressive
- ❌ Doesn't consider Sharpe ratio or drawdown tolerance

**Dynamic Replacement:**
```bash
# Calculate risk-adjusted divergence rate based on Sharpe ratio and success rate
DIVERGENCE_CONFIG=$(sqlite3 "$ROOT_DIR/agentdb.db" <<SQL
WITH performance_metrics AS (
  SELECT 
    AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) as success_rate,
    AVG(reward) as mean_reward,
    STDEV(reward) as stddev_reward,
    (AVG(reward) / NULLIF(STDEV(reward), 0)) as sharpe_ratio,
    -- Maximum drawdown
    MIN(reward) as worst_reward,
    COUNT(*) as sample_size
  FROM episodes
  WHERE circle='$circle'
    AND created_at > datetime('now', '-14 days')
)
SELECT 
  CASE
    -- Excellent performance: Aggressive exploration
    WHEN sharpe_ratio > 2.0 AND success_rate > 0.85 THEN 0.30
    -- Good performance: Moderate-high exploration
    WHEN sharpe_ratio > 1.5 AND success_rate > 0.75 THEN 0.20
    -- Medium performance: Moderate exploration
    WHEN sharpe_ratio > 1.0 AND success_rate > 0.70 THEN 0.15
    -- Acceptable performance: Conservative exploration
    WHEN sharpe_ratio > 0.5 AND success_rate > 0.60 THEN 0.10
    -- Poor performance: Minimal divergence (focus on exploitation)
    WHEN sharpe_ratio > 0.0 THEN 0.05
    -- Negative Sharpe: Emergency mode
    ELSE 0.02
  END as divergence_rate,
  sharpe_ratio,
  success_rate,
  sample_size
FROM performance_metrics
WHERE sample_size >= 10;
SQL
)

DIVERGENCE_RATE=$(echo "$DIVERGENCE_CONFIG" | cut -d'|' -f1)
SHARPE_RATIO=$(echo "$DIVERGENCE_CONFIG" | cut -d'|' -f2)
SUCCESS_RATE=$(echo "$DIVERGENCE_CONFIG" | cut -d'|' -f3)

# Fallback with logging
if [[ -z "$DIVERGENCE_RATE" || "$DIVERGENCE_RATE" == "0" ]]; then
    DIVERGENCE_RATE=0.10
    log_warn "Insufficient data for adaptive divergence rate, using default: $DIVERGENCE_RATE"
else
    log_info "Adaptive divergence rate: $DIVERGENCE_RATE (Sharpe: $SHARPE_RATIO, Success: $SUCCESS_RATE)"
fi
```

---

### 5. Check Frequency: Every 10 episodes (Line 187)
**Current Implementation:**
```bash
if (( i % 10 == 0 )); then
```

**WSJF Analysis:**
- **BV:** 6 - Affects detection speed
- **TC:** 6 - Moderate urgency
- **RR:** 7 - Could delay problem detection
- **JS:** 4 - Low complexity
- **WSJF:** (6+6+7)/4 = **4.75**

**Issues:**
- ❌ High-risk: Check every 10 episodes too infrequent
- ❌ Low-risk: Checking wastes resources
- ❌ Doesn't adapt to changing conditions

**Dynamic Replacement:**
```bash
# Calculate adaptive check frequency before loop
CHECK_FREQUENCY_CONFIG=$(sqlite3 "$ROOT_DIR/agentdb.db" <<SQL
WITH risk_assessment AS (
  SELECT 
    -- Reward volatility (coefficient of variation)
    STDEV(reward) / NULLIF(AVG(reward), 0) as reward_cv,
    -- Failure rate
    AVG(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END) as failure_rate,
    -- Episode duration variance
    STDEV(CAST((julianday(completed_at) - julianday(created_at)) * 1440 AS REAL)) as duration_variance
  FROM episodes
  WHERE circle='$circle' AND ceremony='$ceremony'
    AND created_at > datetime('now', '-14 days')
)
SELECT 
  CASE
    -- High risk: Frequent checking
    WHEN reward_cv > 0.30 OR failure_rate > 0.20 THEN 3
    -- Medium-high risk
    WHEN reward_cv > 0.20 OR failure_rate > 0.15 THEN 5
    -- Medium risk: Standard checking
    WHEN reward_cv > 0.10 OR failure_rate > 0.10 THEN 10
    -- Low risk: Infrequent checking
    ELSE 15
  END as check_frequency,
  reward_cv,
  failure_rate
FROM risk_assessment;
SQL
)

CHECK_FREQUENCY=$(echo "$CHECK_FREQUENCY_CONFIG" | cut -d'|' -f1)
REWARD_CV=$(echo "$CHECK_FREQUENCY_CONFIG" | cut -d'|' -f2)
FAILURE_RATE=$(echo "$CHECK_FREQUENCY_CONFIG" | cut -d'|' -f3)

CHECK_FREQUENCY=${CHECK_FREQUENCY:-10}  # Fallback

log_info "Adaptive check frequency: Every $CHECK_FREQUENCY episodes (CV: $REWARD_CV, Failure rate: $FAILURE_RATE)"

# In loop: use dynamic frequency
if (( i % CHECK_FREQUENCY == 0 )); then
```

---

## 🟢 MEDIUM PRIORITY (WSJF 2.0-4.0)

### 6. Lookback Window: 30 days (various)
**WSJF:** 2.5  
**Issue:** Arbitrary period doesn't account for market regime changes  
**Fix:** Calculate statistically sufficient sample size (min 30 episodes, max 90 days)

### 7. Sleep Delays: 2 seconds (Lines 116, 205)
**WSJF:** 1.5  
**Issue:** Fixed delay doesn't adapt to system load  
**Fix:** Dynamic backoff based on system metrics

---

## Implementation Priority (ROAM Framework)

### RESOLVE (Implement immediately)
1. **Degradation Check** (WSJF 5.8) - Line 234
2. **Circuit Breaker** (WSJF 5.0) - Line 19

### OWN (Schedule for implementation)
3. **Cascade Failures** (WSJF 4.0) - Lines 133-136
4. **Check Frequency** (WSJF 4.75) - Line 187

### ACCEPT (Monitor, implement if proven necessary)
5. **Divergence Rate** (WSJF 3.8) - Line 18
6. **Lookback Windows** (WSJF 2.5) - Various

### MITIGATE (Document risk, revisit quarterly)
7. **Sleep Delays** (WSJF 1.5) - Lines 116, 205

---

## Statistical Considerations

### Distribution Assumptions
Most current thresholds assume **normal distribution**, but financial returns exhibit:
- **Fat tails** (kurtosis > 3)
- **Skewness** (asymmetric returns)
- **Regime changes** (non-stationary)

### Recommendations:
1. Use **quantile-based thresholds** for non-normal distributions
2. Implement **rolling window regime detection**
3. Add **confidence interval reporting**
4. Consider **Extreme Value Theory** for tail risk

---

## Testing Validation Required

For each replacement:
1. **Backtesting:** Test on historical data (30+ days)
2. **A/B Testing:** Run parallel with current implementation
3. **Sensitivity Analysis:** Test boundary conditions
4. **Regime Testing:** Validate across bull/bear/sideways markets

---

## Next Steps

1. Implement top 2 RESOLVE items (degradation check, circuit breaker)
2. Add logging for all dynamic calculations
3. Create monitoring dashboard for threshold values
4. Schedule quarterly review of threshold performance
5. Build automated backtesting framework

---

**Analysis Completed:** 2026-01-10  
**Confidence Level:** High (based on statistical foundations)  
**Estimated Implementation Time:** 16-24 hours for RESOLVE items
