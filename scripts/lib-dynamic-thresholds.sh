#!/usr/bin/env bash
# Dynamic Threshold Calculations Library
# Purpose: Replace hardcoded thresholds with statistically-grounded, adaptive values

# Set PROJECT_ROOT if not already set
if [[ -z "${PROJECT_ROOT:-}" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
fi

# Database path
DB_PATH="${DB_PATH:-${PROJECT_ROOT}/agentdb.db}"

# ═══════════════════════════════════════════
# 1. CIRCUIT BREAKER THRESHOLD
# ═══════════════════════════════════════════

calculate_circuit_breaker_threshold() {
  local circle=$1
  local confidence_level=${2:-0.95}  # 95% confidence by default
  
  local result
  result=$(sqlite3 "$DB_PATH" <<SQL
WITH recent_stats AS (
  SELECT 
    AVG(reward) as mean_reward,
    -- Use sample standard deviation (N-1 denominator)
    SQRT(SUM((reward - (SELECT AVG(reward) FROM episodes WHERE circle='$circle' AND success=1 AND created_at > datetime('now', '-30 days'))) * (reward - (SELECT AVG(reward) FROM episodes WHERE circle='$circle' AND success=1 AND created_at > datetime('now', '-30 days')))) / (COUNT(*) - 1)) as stddev_reward,
    COUNT(*) as sample_size,
    -- Regime detection: compare recent vs historical
    (SELECT AVG(reward) FROM episodes WHERE circle='$circle' AND success=1 AND created_at > datetime('now', '-90 days')) as historical_mean
  FROM episodes 
  WHERE circle='$circle' 
    AND success=1
    AND created_at > datetime('now', '-30 days')
)
SELECT 
  CASE 
    -- Sufficient sample: Use t-distribution critical value
    WHEN sample_size >= 30 THEN 
      mean_reward - (2.5 * stddev_reward)  -- ~99% confidence (2.5 sigma)
    -- Small sample: More conservative (higher t-value)
    WHEN sample_size >= 10 THEN 
      mean_reward - (3.0 * stddev_reward)  -- Account for t-distribution uncertainty
    -- Very small sample: Use historical baseline with safety margin
    WHEN sample_size >= 5 THEN
      historical_mean * 0.70
    -- No recent data: Ultra-conservative
    ELSE 0.50
  END as threshold,
  mean_reward,
  stddev_reward,
  sample_size,
  -- Regime shift detector: if recent << historical, increase safety
  CASE 
    WHEN mean_reward < historical_mean * 0.85 THEN 1
    ELSE 0
  END as regime_shift_detected
FROM recent_stats;
SQL
)
  
  # Parse results
  local threshold=$(echo "$result" | cut -d'|' -f1)
  local mean=$(echo "$result" | cut -d'|' -f2)
  local stddev=$(echo "$result" | cut -d'|' -f3)
  local n=$(echo "$result" | cut -d'|' -f4)
  local regime_shift=$(echo "$result" | cut -d'|' -f5)
  
  # Apply regime shift adjustment if detected
  if [[ "$regime_shift" == "1" ]]; then
    threshold=$(echo "scale=4; $threshold * 0.90" | bc)  # 10% more conservative
  fi
  
  # Floor at 0.3 (never accept <30% of historical performance)
  if (( $(echo "$threshold < 0.3" | bc -l) )); then
    threshold=0.3
  fi
  
  # Return as JSON for transparency
  cat <<JSON
{
  "threshold": $threshold,
  "mean_reward": ${mean:-0},
  "stddev_reward": ${stddev:-0},
  "sample_size": ${n:-0},
  "regime_shift": ${regime_shift:-0},
  "calculation": "mean - (${confidence_level} * sigma * critical_value)"
}
JSON
}

# ═══════════════════════════════════════════
# 2. DEGRADATION THRESHOLD
# ═══════════════════════════════════════════

calculate_degradation_threshold() {
  local circle=$1
  local ceremony=$2
  local alpha=${3:-0.05}  # Significance level (p < 0.05)
  
  local result
  result=$(sqlite3 "$DB_PATH" <<SQL
WITH stats AS (
  SELECT 
    AVG(reward) as mean_reward,
    SQRT(SUM((reward - (SELECT AVG(reward) FROM episodes WHERE circle='$circle' AND ceremony='$ceremony' AND success=1 AND created_at > datetime('now', '-30 days'))) * (reward - (SELECT AVG(reward) FROM episodes WHERE circle='$circle' AND ceremony='$ceremony' AND success=1 AND created_at > datetime('now', '-30 days')))) / (COUNT(*) - 1)) as stddev_reward,
    COUNT(*) as n,
    -- Coefficient of variation (risk-adjusted metric)
    CASE 
      WHEN AVG(reward) > 0 THEN 
        SQRT(SUM((reward - (SELECT AVG(reward) FROM episodes WHERE circle='$circle' AND ceremony='$ceremony' AND success=1 AND created_at > datetime('now', '-30 days'))) * (reward - (SELECT AVG(reward) FROM episodes WHERE circle='$circle' AND ceremony='$ceremony' AND success=1 AND created_at > datetime('now', '-30 days')))) / (COUNT(*) - 1)) / AVG(reward)
      ELSE 0
    END as coeff_variation,
    -- Quantile-based approach (robust to fat tails)
    (SELECT reward FROM episodes WHERE circle='$circle' AND ceremony='$ceremony' AND success=1 AND created_at > datetime('now', '-30 days') ORDER BY reward LIMIT 1 OFFSET (SELECT CAST(COUNT(*) * 0.05 AS INTEGER) FROM episodes WHERE circle='$circle' AND ceremony='$ceremony' AND success=1 AND created_at > datetime('now', '-30 days'))) as p05_quantile
  FROM episodes 
  WHERE circle='$circle' AND ceremony='$ceremony'
    AND success=1
    AND created_at > datetime('now', '-30 days')
)
SELECT 
  CASE
    -- Sufficient data: Use confidence interval approach
    WHEN n >= 30 THEN 
      -- 95% CI: mean - (1.96 * SE)
      mean_reward - (1.96 * stddev_reward / SQRT(n))
    -- Medium sample: Use t-distribution (conservative)
    WHEN n >= 10 THEN 
      -- t-critical value for df=9, α=0.05 ≈ 2.262
      mean_reward - (2.5 * stddev_reward / SQRT(n))
    -- Small sample: Use quantile if available, else conservative percentage
    WHEN n >= 5 THEN
      COALESCE(p05_quantile, mean_reward * 0.80)
    -- Fallback: Conservative 20% degradation tolerance
    ELSE mean_reward * 0.80
  END as threshold,
  mean_reward,
  stddev_reward,
  coeff_variation,
  n,
  -- Risk classification based on CV
  CASE
    WHEN coeff_variation > 0.30 THEN 'HIGH'
    WHEN coeff_variation > 0.15 THEN 'MEDIUM'
    ELSE 'LOW'
  END as volatility_class
FROM stats;
SQL
)
  
  # Parse results
  local threshold=$(echo "$result" | cut -d'|' -f1)
  local mean=$(echo "$result" | cut -d'|' -f2)
  local stddev=$(echo "$result" | cut -d'|' -f3)
  local cv=$(echo "$result" | cut -d'|' -f4)
  local n=$(echo "$result" | cut -d'|' -f5)
  local risk=$(echo "$result" | cut -d'|' -f6)
  
  # Adjust threshold based on volatility class
  if [[ "$risk" == "HIGH" ]]; then
    # High volatility: Use wider tolerance (1.5 sigma instead of 2)
    threshold=$(echo "scale=4; $mean - (1.5 * $stddev / sqrt($n))" | bc -l)
  elif [[ "$risk" == "LOW" ]]; then
    # Low volatility: Tighter tolerance (2.5 sigma)
    threshold=$(echo "scale=4; $mean - (2.5 * $stddev / sqrt($n))" | bc -l)
  fi
  
  cat <<JSON
{
  "threshold": ${threshold:-0},
  "mean_reward": ${mean:-0},
  "stddev_reward": ${stddev:-0},
  "coeff_variation": ${cv:-0},
  "sample_size": ${n:-0},
  "volatility_class": "${risk:-UNKNOWN}",
  "method": "confidence_interval_${alpha}"
}
JSON
}

# ═══════════════════════════════════════════
# 3. CASCADE FAILURE THRESHOLD
# ═══════════════════════════════════════════

calculate_cascade_threshold() {
  local circle=$1
  local ceremony=$2
  
  local result
  result=$(sqlite3 "$DB_PATH" <<SQL
WITH episode_stats AS (
  SELECT 
    -- Average episode duration in minutes
    AVG(CAST((julianday(completed_at) - julianday(created_at)) * 1440 AS REAL)) as avg_duration_min,
    -- Baseline failure rate
    AVG(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END) as baseline_failure_rate,
    -- Failure clustering: stddev of failures
    SQRT(SUM(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END * CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END - (SELECT AVG(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END) FROM episodes WHERE circle='$circle' AND ceremony='$ceremony' AND created_at > datetime('now', '-7 days')) * (SELECT AVG(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END) FROM episodes WHERE circle='$circle' AND ceremony='$ceremony' AND created_at > datetime('now', '-7 days'))) / (COUNT(*) - 1)) as failure_stddev,
    COUNT(*) as total_episodes,
    -- Velocity: episodes per hour
    COUNT(*) / NULLIF(CAST((julianday(MAX(created_at)) - julianday(MIN(created_at))) * 24 AS REAL), 0) as episodes_per_hour
  FROM episodes
  WHERE circle='$circle' AND ceremony='$ceremony'
    AND created_at > datetime('now', '-7 days')
)
SELECT 
  CASE 
    -- Statistical approach: 3-sigma above baseline (99.7% confidence)
    WHEN total_episodes >= 50 THEN
      CAST(ROUND((baseline_failure_rate + (3 * NULLIF(failure_stddev, 0))) * 100) AS INTEGER)
    -- Medium sample: 2.5-sigma with minimum floor
    WHEN total_episodes >= 20 THEN
      CAST(ROUND(MAX(5, (baseline_failure_rate + (2.5 * NULLIF(failure_stddev, 0))) * 100)) AS INTEGER)
    -- Small sample: Velocity-based with safety factor of 2x
    ELSE
      CAST(ROUND(MAX(5, (60.0 / NULLIF(avg_duration_min, 1)) * 2.0)) AS INTEGER)
  END as failure_count_threshold,
  -- Time window: min(3 * avg_duration, 30 minutes, 10 episodes worth of time)
  CAST(MIN(30, MAX(5, avg_duration_min * 3, 10 / NULLIF(episodes_per_hour, 0) * 60)) AS INTEGER) as window_minutes,
  baseline_failure_rate,
  failure_stddev,
  episodes_per_hour,
  total_episodes
FROM episode_stats;
SQL
)
  
  # Parse results
  local threshold=$(echo "$result" | cut -d'|' -f1)
  local window=$(echo "$result" | cut -d'|' -f2)
  local baseline_rate=$(echo "$result" | cut -d'|' -f3)
  local stddev=$(echo "$result" | cut -d'|' -f4)
  local velocity=$(echo "$result" | cut -d'|' -f5)
  local n=$(echo "$result" | cut -d'|' -f6)
  
  # Safety bounds
  threshold=${threshold:-5}
  window=${window:-5}
  
  # Floor: Never allow <3 failures (too sensitive)
  if [[ $threshold -lt 3 ]]; then
    threshold=3
  fi
  
  # Ceiling: Never allow >50 failures (too insensitive)
  if [[ $threshold -gt 50 ]]; then
    threshold=50
  fi
  
  cat <<JSON
{
  "failure_count_threshold": $threshold,
  "window_minutes": $window,
  "baseline_failure_rate": ${baseline_rate:-0},
  "failure_stddev": ${stddev:-0},
  "episodes_per_hour": ${velocity:-0},
  "sample_size": ${n:-0},
  "calculation": "baseline_rate + (3 * stddev)"
}
JSON
}

# ═══════════════════════════════════════════
# 4. DIVERGENCE RATE
# ═══════════════════════════════════════════

calculate_divergence_rate() {
  local circle=$1
  
  local result
  result=$(sqlite3 "$DB_PATH" <<SQL
WITH recent_perf AS (
  SELECT 
    -- Success rate
    AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) as success_rate,
    -- Reward statistics
    AVG(reward) as mean_reward,
    SQRT(SUM((reward - (SELECT AVG(reward) FROM episodes WHERE circle='$circle' AND created_at > datetime('now', '-7 days'))) * (reward - (SELECT AVG(reward) FROM episodes WHERE circle='$circle' AND created_at > datetime('now', '-7 days')))) / (COUNT(*) - 1)) as stddev_reward,
    -- Sharpe ratio (risk-adjusted return)
    CASE 
      WHEN SQRT(SUM((reward - (SELECT AVG(reward) FROM episodes WHERE circle='$circle' AND created_at > datetime('now', '-7 days'))) * (reward - (SELECT AVG(reward) FROM episodes WHERE circle='$circle' AND created_at > datetime('now', '-7 days')))) / (COUNT(*) - 1)) > 0 
      THEN AVG(reward) / SQRT(SUM((reward - (SELECT AVG(reward) FROM episodes WHERE circle='$circle' AND created_at > datetime('now', '-7 days'))) * (reward - (SELECT AVG(reward) FROM episodes WHERE circle='$circle' AND created_at > datetime('now', '-7 days')))) / (COUNT(*) - 1))
      ELSE 0
    END as sharpe_ratio,
    -- Learning velocity: skill acquisition rate
    (SELECT COUNT(DISTINCT name) FROM skills WHERE circle='$circle') as skills_learned,
    COUNT(*) as sample_size
  FROM episodes
  WHERE circle='$circle'
    AND created_at > datetime('now', '-7 days')
),
risk_score AS (
  SELECT 
    *,
    -- Composite risk score (0-1): higher = safer to diverge
    (
      (success_rate * 0.4) +  -- Success contributes 40%
      (CASE WHEN sharpe_ratio > 3 THEN 1.0
            WHEN sharpe_ratio > 2 THEN 0.8
            WHEN sharpe_ratio > 1 THEN 0.5
            WHEN sharpe_ratio > 0.5 THEN 0.3
            ELSE 0.1 END * 0.4) +  -- Sharpe contributes 40%
      (CASE WHEN skills_learned >= 10 THEN 1.0
            WHEN skills_learned >= 5 THEN 0.6
            WHEN skills_learned >= 2 THEN 0.3
            ELSE 0.1 END * 0.2)    -- Learning contributes 20%
    ) as composite_risk_score
  FROM recent_perf
)
SELECT 
  CASE
    -- Excellent performance: Aggressive exploration (Kelly Criterion inspired)
    WHEN composite_risk_score >= 0.80 AND sharpe_ratio >= 2.0 THEN 0.30
    -- Good performance: Moderate exploration
    WHEN composite_risk_score >= 0.65 AND sharpe_ratio >= 1.0 THEN 0.20
    -- Acceptable performance: Conservative exploration
    WHEN composite_risk_score >= 0.50 AND sharpe_ratio >= 0.5 THEN 0.12
    -- Marginal performance: Minimal exploration
    WHEN composite_risk_score >= 0.40 THEN 0.06
    -- Poor performance: No exploration (focus on exploitation)
    ELSE 0.03
  END as divergence_rate,
  composite_risk_score,
  success_rate,
  sharpe_ratio,
  stddev_reward / NULLIF(mean_reward, 0) as coeff_variation,
  skills_learned,
  sample_size
FROM risk_score
WHERE sample_size >= 10;
SQL
)
  
  # Parse results
  local rate=$(echo "$result" | cut -d'|' -f1)
  local risk_score=$(echo "$result" | cut -d'|' -f2)
  local success=$(echo "$result" | cut -d'|' -f3)
  local sharpe=$(echo "$result" | cut -d'|' -f4)
  local cv=$(echo "$result" | cut -d'|' -f5)
  local skills=$(echo "$result" | cut -d'|' -f6)
  local n=$(echo "$result" | cut -d'|' -f7)
  
  # Fallback if no data
  rate=${rate:-0.05}
  
  # Apply drawdown adjustment: reduce divergence if recent drawdown detected
  local recent_drawdown
  recent_drawdown=$(sqlite3 "$DB_PATH" \
    "SELECT CASE WHEN AVG(reward) < (SELECT AVG(reward) * 0.90 FROM episodes WHERE circle='$circle' AND created_at > datetime('now', '-30 days')) THEN 1 ELSE 0 END FROM episodes WHERE circle='$circle' AND created_at > datetime('now', '-3 days');")
  
  if [[ "$recent_drawdown" == "1" ]]; then
    rate=$(echo "scale=4; $rate * 0.50" | bc)  # Halve divergence during drawdown
  fi
  
  cat <<JSON
{
  "divergence_rate": ${rate:-0.05},
  "composite_risk_score": ${risk_score:-0},
  "success_rate": ${success:-0},
  "sharpe_ratio": ${sharpe:-0},
  "coeff_variation": ${cv:-0},
  "skills_learned": ${skills:-0},
  "sample_size": ${n:-0},
  "drawdown_adjustment": ${recent_drawdown:-0}
}
JSON
}

# ═══════════════════════════════════════════
# 5. CHECK FREQUENCY
# ═══════════════════════════════════════════

calculate_check_frequency() {
  local circle=$1
  local ceremony=$2
  
  local result
  result=$(sqlite3 "$DB_PATH" <<SQL
WITH risk_factors AS (
  SELECT 
    -- Reward volatility
    SQRT(SUM((reward - (SELECT AVG(reward) FROM episodes WHERE circle='$circle' AND ceremony='$ceremony' AND created_at > datetime('now', '-7 days'))) * (reward - (SELECT AVG(reward) FROM episodes WHERE circle='$circle' AND ceremony='$ceremony' AND created_at > datetime('now', '-7 days')))) / (COUNT(*) - 1)) / NULLIF(AVG(reward), 0) as reward_volatility,
    -- Failure rate
    AVG(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END) as failure_rate,
    -- Episode velocity
    COUNT(*) / NULLIF(CAST((julianday(MAX(created_at)) - julianday(MIN(created_at))) * 24 AS REAL), 0) as episodes_per_hour,
    -- Recent trend: accelerating failures?
    (SELECT COUNT(*) FROM episodes WHERE circle='$circle' AND ceremony='$ceremony' AND success=0 AND created_at > datetime('now', '-1 day')) as failures_last_day,
    (SELECT COUNT(*) FROM episodes WHERE circle='$circle' AND ceremony='$ceremony' AND success=0 AND created_at BETWEEN datetime('now', '-2 days') AND datetime('now', '-1 day')) as failures_prev_day
  FROM episodes
  WHERE circle='$circle' AND ceremony='$ceremony'
    AND created_at > datetime('now', '-7 days')
)
SELECT 
  CASE
    -- Critical: High volatility OR accelerating failures OR high failure rate
    WHEN reward_volatility > 0.40 OR failures_last_day > failures_prev_day * 2 OR failure_rate > 0.25 THEN 3
    -- High risk: Moderate volatility OR elevated failures
    WHEN reward_volatility > 0.25 OR failures_last_day > failures_prev_day * 1.5 OR failure_rate > 0.15 THEN 5
    -- Medium risk: Some volatility OR some failures
    WHEN reward_volatility > 0.15 OR failure_rate > 0.08 THEN 8
    -- Low risk: Stable performance
    WHEN reward_volatility > 0.10 OR failure_rate > 0.03 THEN 12
    -- Very low risk: Excellent stability
    ELSE 15
  END as check_every_n_episodes,
  reward_volatility,
  failure_rate,
  episodes_per_hour,
  failures_last_day,
  failures_prev_day
FROM risk_factors;
SQL
)
  
  # Parse results
  local frequency=$(echo "$result" | cut -d'|' -f1)
  local volatility=$(echo "$result" | cut -d'|' -f2)
  local failure_rate=$(echo "$result" | cut -d'|' -f3)
  local velocity=$(echo "$result" | cut -d'|' -f4)
  local recent_fails=$(echo "$result" | cut -d'|' -f5)
  local prev_fails=$(echo "$result" | cut -d'|' -f6)
  
  # Fallback
  frequency=${frequency:-10}
  
  # Time-based override: If episodes are slow, use time-based checking
  local avg_duration_min
  avg_duration_min=$(sqlite3 "$DB_PATH" \
    "SELECT AVG(CAST((julianday(completed_at) - julianday(created_at)) * 1440 AS REAL)) FROM episodes WHERE circle='$circle' AND ceremony='$ceremony' AND created_at > datetime('now', '-7 days');")
  
  # If episodes take >10 minutes each, switch to time-based: check every 30 minutes
  local check_mode="episode_count"
  local time_based_minutes=0
  if (( $(echo "$avg_duration_min > 10" | bc -l) )); then
    check_mode="time_based"
    time_based_minutes=30
  fi
  
  cat <<JSON
{
  "check_every_n_episodes": $frequency,
  "check_mode": "$check_mode",
  "time_based_minutes": $time_based_minutes,
  "reward_volatility": ${volatility:-0},
  "failure_rate": ${failure_rate:-0},
  "episodes_per_hour": ${velocity:-0},
  "failures_last_day": ${recent_fails:-0},
  "failures_prev_day": ${prev_fails:-0}
}
JSON
}

# ═══════════════════════════════════════════
# 6. HELPER: Get scalar value from JSON
# ═══════════════════════════════════════════

get_threshold_value() {
  local json=$1
  local key=$2
  echo "$json" | jq -r ".$key" 2>/dev/null || echo "0"
}

# ═══════════════════════════════════════════
# 7. SIMPLE WRAPPER FUNCTIONS (for easy usage)
# ═══════════════════════════════════════════

# Get circuit breaker threshold (returns just the threshold value)
get_circuit_breaker_threshold() {
  local circle=$1
  local ceremony=$2
  local json=$(calculate_circuit_breaker_threshold "$circle")
  echo "$json" | jq -r '.threshold' 2>/dev/null || echo "0.5"
}

# Get degradation threshold (returns just the threshold value)
get_degradation_threshold() {
  local circle=$1
  local ceremony=$2
  local current_reward=${3:-0}
  local json=$(calculate_degradation_threshold "$circle" "$ceremony")
  echo "$json" | jq -r '.threshold' 2>/dev/null || echo "0.8"
}

# Get cascade threshold (returns just the failure count threshold)
get_cascade_threshold() {
  local circle=$1
  local ceremony=$2
  local json=$(calculate_cascade_threshold "$circle" "$ceremony")
  echo "$json" | jq -r '.failure_count_threshold' 2>/dev/null || echo "10"
}

# Get divergence rate (returns just the rate value)
get_divergence_rate() {
  local circle=$1
  local ceremony=$2
  local json=$(calculate_divergence_rate "$circle")
  echo "$json" | jq -r '.divergence_rate' 2>/dev/null || echo "0.05"
}

# Get check frequency (returns just the frequency value)
get_check_frequency() {
  local circle=$1
  local ceremony=$2
  local json=$(calculate_check_frequency "$circle" "$ceremony")
  echo "$json" | jq -r '.check_every_n_episodes' 2>/dev/null || echo "10"
}

# Detect regime shift (returns regime status)
detect_regime_shift() {
  local circle=$1
  local ceremony=$2
  local json=$(calculate_circuit_breaker_threshold "$circle")
  local regime_shift=$(echo "$json" | jq -r '.regime_shift' 2>/dev/null || echo "0")
  
  if [[ "$regime_shift" == "1" ]]; then
    echo "Unstable"
  else
    # Check volatility for transitioning state
    local json2=$(calculate_degradation_threshold "$circle" "$ceremony")
    local volatility=$(echo "$json2" | jq -r '.volatility_class' 2>/dev/null || echo "LOW")
    
    if [[ "$volatility" == "HIGH" ]]; then
      echo "Transitioning"
    else
      echo "Stable"
    fi
  fi
}

# Get quantile threshold (returns 5th percentile by default)
get_quantile_threshold() {
  local circle=$1
  local ceremony=$2
  local quantile=${3:-0.05}
  
  local result
  result=$(sqlite3 "$DB_PATH" \
    "SELECT reward FROM episodes WHERE circle='$circle' AND ceremony='$ceremony' AND success=1 AND created_at > datetime('now', '-30 days') ORDER BY reward LIMIT 1 OFFSET (SELECT CAST(COUNT(*) * $quantile AS INTEGER) FROM episodes WHERE circle='$circle' AND ceremony='$ceremony' AND success=1 AND created_at > datetime('now', '-30 days'));" 2>/dev/null || echo "0")
  
  echo "${result:-0}"
}

# ═══════════════════════════════════════════
# 8. VALIDATION: Test all calculations
# ═══════════════════════════════════════════

validate_thresholds() {
  local circle=$1
  local ceremony=${2:-standup}
  
  echo "═══════════════════════════════════════════"
  echo "  Threshold Validation Report"
  echo "  Circle: $circle, Ceremony: $ceremony"
  echo "═══════════════════════════════════════════"
  echo ""
  
  echo "1️⃣ Circuit Breaker:"
  calculate_circuit_breaker_threshold "$circle" | jq .
  echo ""
  
  echo "2️⃣ Degradation Threshold:"
  calculate_degradation_threshold "$circle" "$ceremony" | jq .
  echo ""
  
  echo "3️⃣ Cascade Failure:"
  calculate_cascade_threshold "$circle" "$ceremony" | jq .
  echo ""
  
  echo "4️⃣ Divergence Rate:"
  calculate_divergence_rate "$circle" | jq .
  echo ""
  
  echo "5️⃣ Check Frequency:"
  calculate_check_frequency "$circle" "$ceremony" | jq .
  echo ""
}

# ═══════════════════════════════════════════
# 9. SELF-TEST: Run with synthetic data
# ═══════════════════════════════════════════

run_self_test() {
  local tmp_db
  tmp_db=$(mktemp /tmp/lib-dynamic-thresholds-test.XXXXXX.db)
  trap "rm -f '$tmp_db'" EXIT
  
  echo "=== lib-dynamic-thresholds.sh SELF-TEST ==="
  echo "Using temporary DB: $tmp_db"
  echo ""
  
  # Override DB_PATH for test
  DB_PATH="$tmp_db"
  
  # Create schema
  sqlite3 "$tmp_db" <<'SCHEMA'
CREATE TABLE IF NOT EXISTS episodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  circle TEXT NOT NULL,
  ceremony TEXT NOT NULL,
  reward REAL NOT NULL,
  success INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT DEFAULT (datetime('now', '+5 minutes'))
);
CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  circle TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
SCHEMA
  
  # Insert synthetic episodes: 40 episodes over 30 days for 'test-circle'/'standup'
  # Mix of success/failure with realistic reward distribution (mean ~0.75, stddev ~0.12)
  sqlite3 "$tmp_db" <<'SEED'
INSERT INTO episodes (circle, ceremony, reward, success, created_at, completed_at) VALUES
  ('test-circle', 'standup', 0.85, 1, datetime('now', '-28 days'), datetime('now', '-28 days', '+3 minutes')),
  ('test-circle', 'standup', 0.72, 1, datetime('now', '-27 days'), datetime('now', '-27 days', '+4 minutes')),
  ('test-circle', 'standup', 0.91, 1, datetime('now', '-26 days'), datetime('now', '-26 days', '+2 minutes')),
  ('test-circle', 'standup', 0.68, 1, datetime('now', '-25 days'), datetime('now', '-25 days', '+5 minutes')),
  ('test-circle', 'standup', 0.55, 0, datetime('now', '-24 days'), datetime('now', '-24 days', '+8 minutes')),
  ('test-circle', 'standup', 0.79, 1, datetime('now', '-23 days'), datetime('now', '-23 days', '+3 minutes')),
  ('test-circle', 'standup', 0.82, 1, datetime('now', '-22 days'), datetime('now', '-22 days', '+4 minutes')),
  ('test-circle', 'standup', 0.77, 1, datetime('now', '-21 days'), datetime('now', '-21 days', '+3 minutes')),
  ('test-circle', 'standup', 0.88, 1, datetime('now', '-20 days'), datetime('now', '-20 days', '+2 minutes')),
  ('test-circle', 'standup', 0.65, 1, datetime('now', '-19 days'), datetime('now', '-19 days', '+6 minutes')),
  ('test-circle', 'standup', 0.73, 1, datetime('now', '-18 days'), datetime('now', '-18 days', '+4 minutes')),
  ('test-circle', 'standup', 0.42, 0, datetime('now', '-17 days'), datetime('now', '-17 days', '+10 minutes')),
  ('test-circle', 'standup', 0.80, 1, datetime('now', '-16 days'), datetime('now', '-16 days', '+3 minutes')),
  ('test-circle', 'standup', 0.86, 1, datetime('now', '-15 days'), datetime('now', '-15 days', '+3 minutes')),
  ('test-circle', 'standup', 0.74, 1, datetime('now', '-14 days'), datetime('now', '-14 days', '+4 minutes')),
  ('test-circle', 'standup', 0.90, 1, datetime('now', '-13 days'), datetime('now', '-13 days', '+2 minutes')),
  ('test-circle', 'standup', 0.71, 1, datetime('now', '-12 days'), datetime('now', '-12 days', '+5 minutes')),
  ('test-circle', 'standup', 0.83, 1, datetime('now', '-11 days'), datetime('now', '-11 days', '+3 minutes')),
  ('test-circle', 'standup', 0.78, 1, datetime('now', '-10 days'), datetime('now', '-10 days', '+4 minutes')),
  ('test-circle', 'standup', 0.50, 0, datetime('now', '-9 days'), datetime('now', '-9 days', '+9 minutes')),
  ('test-circle', 'standup', 0.81, 1, datetime('now', '-8 days'), datetime('now', '-8 days', '+3 minutes')),
  ('test-circle', 'standup', 0.76, 1, datetime('now', '-7 days'), datetime('now', '-7 days', '+4 minutes')),
  ('test-circle', 'standup', 0.87, 1, datetime('now', '-6 days'), datetime('now', '-6 days', '+2 minutes')),
  ('test-circle', 'standup', 0.69, 1, datetime('now', '-5 days'), datetime('now', '-5 days', '+5 minutes')),
  ('test-circle', 'standup', 0.84, 1, datetime('now', '-4 days'), datetime('now', '-4 days', '+3 minutes')),
  ('test-circle', 'standup', 0.92, 1, datetime('now', '-3 days'), datetime('now', '-3 days', '+2 minutes')),
  ('test-circle', 'standup', 0.75, 1, datetime('now', '-2 days'), datetime('now', '-2 days', '+4 minutes')),
  ('test-circle', 'standup', 0.38, 0, datetime('now', '-1 day'), datetime('now', '-1 day', '+12 minutes')),
  ('test-circle', 'standup', 0.80, 1, datetime('now', '-12 hours'), datetime('now', '-12 hours', '+3 minutes')),
  ('test-circle', 'standup', 0.77, 1, datetime('now', '-6 hours'), datetime('now', '-6 hours', '+4 minutes')),
  -- Additional episodes for statistical power
  ('test-circle', 'standup', 0.79, 1, datetime('now', '-5 hours'), datetime('now', '-5 hours', '+3 minutes')),
  ('test-circle', 'standup', 0.85, 1, datetime('now', '-4 hours'), datetime('now', '-4 hours', '+3 minutes')),
  ('test-circle', 'standup', 0.73, 1, datetime('now', '-3 hours'), datetime('now', '-3 hours', '+4 minutes')),
  ('test-circle', 'standup', 0.81, 1, datetime('now', '-2 hours'), datetime('now', '-2 hours', '+3 minutes')),
  ('test-circle', 'standup', 0.88, 1, datetime('now', '-1 hour'), datetime('now', '-1 hour', '+2 minutes'));

INSERT INTO skills (circle, name) VALUES
  ('test-circle', 'validation'),
  ('test-circle', 'deployment'),
  ('test-circle', 'monitoring'),
  ('test-circle', 'testing'),
  ('test-circle', 'debugging');
SEED
  
  local errors=0
  
  # Test 1: Circuit breaker threshold
  echo "--- Test 1: Circuit Breaker Threshold ---"
  local cb_json
  cb_json=$(calculate_circuit_breaker_threshold "test-circle")
  local cb_threshold
  cb_threshold=$(echo "$cb_json" | jq -r '.threshold' 2>/dev/null)
  if [[ -n "$cb_threshold" && "$cb_threshold" != "null" ]]; then
    local in_range
    in_range=$(echo "$cb_threshold >= 0.3 && $cb_threshold <= 1.0" | bc -l 2>/dev/null || echo 0)
    if [[ "$in_range" == "1" ]]; then
      echo "PASS: threshold=$cb_threshold (in [0.3, 1.0])"
    else
      echo "FAIL: threshold=$cb_threshold out of range [0.3, 1.0]"
      errors=$((errors + 1))
    fi
  else
    echo "FAIL: Could not compute circuit breaker threshold"
    errors=$((errors + 1))
  fi
  echo "$cb_json" | jq . 2>/dev/null || echo "$cb_json"
  echo ""
  
  # Test 2: Degradation threshold
  echo "--- Test 2: Degradation Threshold ---"
  local deg_json
  deg_json=$(calculate_degradation_threshold "test-circle" "standup")
  local deg_threshold
  deg_threshold=$(echo "$deg_json" | jq -r '.threshold' 2>/dev/null)
  if [[ -n "$deg_threshold" && "$deg_threshold" != "null" && "$deg_threshold" != "0" ]]; then
    echo "PASS: threshold=$deg_threshold"
  else
    echo "FAIL: degradation threshold=$deg_threshold (expected non-zero)"
    errors=$((errors + 1))
  fi
  echo "$deg_json" | jq . 2>/dev/null || echo "$deg_json"
  echo ""
  
  # Test 3: Cascade failure threshold
  echo "--- Test 3: Cascade Failure Threshold ---"
  local cas_json
  cas_json=$(calculate_cascade_threshold "test-circle" "standup")
  local cas_count
  cas_count=$(echo "$cas_json" | jq -r '.failure_count_threshold' 2>/dev/null)
  if [[ -n "$cas_count" && "$cas_count" -ge 3 && "$cas_count" -le 50 ]] 2>/dev/null; then
    echo "PASS: failure_count_threshold=$cas_count (in [3, 50])"
  else
    echo "FAIL: failure_count_threshold=$cas_count out of range [3, 50]"
    errors=$((errors + 1))
  fi
  echo "$cas_json" | jq . 2>/dev/null || echo "$cas_json"
  echo ""
  
  # Test 4: Divergence rate
  echo "--- Test 4: Divergence Rate ---"
  local div_json
  div_json=$(calculate_divergence_rate "test-circle")
  local div_rate
  div_rate=$(echo "$div_json" | jq -r '.divergence_rate' 2>/dev/null)
  if [[ -n "$div_rate" && "$div_rate" != "null" ]]; then
    local div_ok
    div_ok=$(echo "$div_rate >= 0.03 && $div_rate <= 0.30" | bc -l 2>/dev/null || echo 0)
    if [[ "$div_ok" == "1" ]]; then
      echo "PASS: divergence_rate=$div_rate (in [0.03, 0.30])"
    else
      echo "FAIL: divergence_rate=$div_rate out of range [0.03, 0.30]"
      errors=$((errors + 1))
    fi
  else
    echo "FAIL: Could not compute divergence rate"
    errors=$((errors + 1))
  fi
  echo "$div_json" | jq . 2>/dev/null || echo "$div_json"
  echo ""
  
  # Test 5: Check frequency
  echo "--- Test 5: Check Frequency ---"
  local freq_json
  freq_json=$(calculate_check_frequency "test-circle" "standup")
  local freq_val
  freq_val=$(echo "$freq_json" | jq -r '.check_every_n_episodes' 2>/dev/null)
  if [[ -n "$freq_val" && "$freq_val" -ge 3 && "$freq_val" -le 15 ]] 2>/dev/null; then
    echo "PASS: check_every_n_episodes=$freq_val (in [3, 15])"
  else
    echo "FAIL: check_every_n_episodes=$freq_val out of range [3, 15]"
    errors=$((errors + 1))
  fi
  echo "$freq_json" | jq . 2>/dev/null || echo "$freq_json"
  echo ""
  
  # Summary
  echo "==========================="
  if [[ $errors -gt 0 ]]; then
    echo "SELF-TEST: $errors FAILURE(S) out of 5 tests"
    return 1
  else
    echo "SELF-TEST: ALL 5 TESTS PASSED"
    return 0
  fi
}

# ═══════════════════════════════════════════
# CLI ENTRY POINT (when run directly)
# ═══════════════════════════════════════════

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  case "${1:-}" in
    --self-test)
      run_self_test
      exit $?
      ;;
    --validate)
      circle="${2:-test-circle}"
      ceremony="${3:-standup}"
      validate_thresholds "$circle" "$ceremony"
      ;;
    --help|-h)
      echo "Usage: lib-dynamic-thresholds.sh [COMMAND]"
      echo ""
      echo "Commands:"
      echo "  --self-test     Run self-test with synthetic data (no DB required)"
      echo "  --validate CIRCLE [CEREMONY]  Run validation report against live DB"
      echo "  --help          Show this help"
      echo ""
      echo "As a library (source this file):"
      echo "  calculate_circuit_breaker_threshold CIRCLE"
      echo "  calculate_degradation_threshold CIRCLE CEREMONY"
      echo "  calculate_cascade_threshold CIRCLE CEREMONY"
      echo "  calculate_divergence_rate CIRCLE"
      echo "  calculate_check_frequency CIRCLE CEREMONY"
      ;;
    *)
      echo "lib-dynamic-thresholds.sh: Use --self-test, --validate, or --help"
      echo "Or source this file to use as a library."
      ;;
  esac
fi
