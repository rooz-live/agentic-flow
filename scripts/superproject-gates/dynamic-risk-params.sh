#!/usr/bin/env bash
# Dynamic Risk Parameters with Statistical Ground-Truth Validation
# Replaces hardcoded thresholds with adaptive, data-driven parameters

set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
DB_PATH="${DB_PATH:-$ROOT_DIR/agentdb.db}"

# ═══════════════════════════════════════════════════════════════════════════
# 1. CIRCUIT BREAKER THRESHOLD (Replaces: baseline_reward * 0.8)
# ═══════════════════════════════════════════════════════════════════════════

get_circuit_breaker_threshold() {
    local circle="$1"
    local lookback_days="${2:-30}"
    
    sqlite3 "$DB_PATH" <<SQL
WITH recent_stats AS (
  SELECT 
    AVG(reward) as mean_reward,
    -- Use sample stddev (N-1 denominator)
    SQRT(AVG(reward * reward) - AVG(reward) * AVG(reward)) * SQRT(COUNT(*) / (COUNT(*) - 1.0)) as stddev_reward,
    COUNT(*) as sample_size,
    -- Coefficient of variation for regime detection
    (SQRT(AVG(reward * reward) - AVG(reward) * AVG(reward)) / AVG(reward)) as cv
  FROM episodes 
  WHERE circle='$circle' 
    AND success=1
    AND created_at > datetime('now', '-$lookback_days days')
),
regime_adjusted AS (
  SELECT 
    mean_reward,
    stddev_reward,
    sample_size,
    cv,
    CASE 
      -- High stability (low CV): Use 2.5 sigma (99% confidence)
      WHEN cv < 0.15 AND sample_size >= 30 THEN mean_reward - (2.5 * stddev_reward)
      -- Medium stability: Use 2.0 sigma (95% confidence)
      WHEN cv < 0.30 AND sample_size >= 30 THEN mean_reward - (2.0 * stddev_reward)
      -- Low stability (high CV): Use 3.0 sigma to avoid false alarms
      WHEN cv >= 0.30 AND sample_size >= 30 THEN mean_reward - (3.0 * stddev_reward)
      -- Small sample: Conservative with wider tolerance
      WHEN sample_size >= 10 THEN mean_reward - (3.0 * stddev_reward)
      -- Very small sample: Use fixed 50% threshold
      ELSE 0.5
    END as threshold,
    mean_reward,
    stddev_reward,
    cv
  FROM recent_stats
)
SELECT 
  printf('%.4f', threshold) || '|' || 
  printf('%.4f', mean_reward) || '|' || 
  printf('%.4f', stddev_reward) || '|' ||
  printf('%.4f', cv) || '|' ||
  sample_size
FROM regime_adjusted;
SQL
}

# ═══════════════════════════════════════════════════════════════════════════
# 2. DEGRADATION THRESHOLD (Replaces: baseline_reward * 0.9)
# ═══════════════════════════════════════════════════════════════════════════

get_degradation_threshold() {
    local circle="$1"
    local ceremony="$2"
    local confidence_level="${3:-0.95}"  # 95% confidence by default
    
    # Z-scores for confidence levels
    local z_score
    case "$confidence_level" in
        0.90) z_score=1.645 ;;
        0.95) z_score=1.96 ;;
        0.99) z_score=2.576 ;;
        *) z_score=1.96 ;;
    esac
    
    sqlite3 "$DB_PATH" <<SQL
WITH stats AS (
  SELECT 
    AVG(reward) as mean_reward,
    SQRT(AVG(reward * reward) - AVG(reward) * AVG(reward)) * SQRT(COUNT(*) / (COUNT(*) - 1.0)) as stddev_reward,
    COUNT(*) as n,
    -- Skewness for distribution check
    (AVG(POWER(reward - (SELECT AVG(reward) FROM episodes WHERE circle='$circle' AND ceremony='$ceremony'), 3)) / 
     POWER(SQRT(AVG(reward * reward) - AVG(reward) * AVG(reward)), 3)) as skewness
  FROM episodes 
  WHERE circle='$circle' AND ceremony='$ceremony'
    AND success=1
    AND created_at > datetime('now', '-30 days')
),
threshold_calc AS (
  SELECT 
    mean_reward,
    stddev_reward,
    n,
    skewness,
    stddev_reward / SQRT(n) as std_error,
    CASE
      -- Large sample with normal distribution: Use confidence interval
      WHEN n >= 30 AND ABS(skewness) < 0.5 THEN 
        mean_reward - ($z_score * stddev_reward / SQRT(n))
      -- Large sample but skewed: Use quantile-based approach (approximation)
      WHEN n >= 30 THEN
        mean_reward - (2.5 * stddev_reward / SQRT(n))
      -- Medium sample: More conservative
      WHEN n >= 10 THEN 
        mean_reward - (3.0 * stddev_reward / SQRT(n))
      -- Small sample: Use fixed 15% drop
      ELSE mean_reward * 0.85
    END as threshold
  FROM stats
)
SELECT 
  printf('%.4f', threshold) || '|' || 
  printf('%.4f', mean_reward) || '|' || 
  printf('%.4f', stddev_reward) || '|' ||
  printf('%.4f', std_error) || '|' ||
  printf('%.4f', skewness) || '|' ||
  n
FROM threshold_calc;
SQL
}

# ═══════════════════════════════════════════════════════════════════════════
# 3. CASCADE FAILURE THRESHOLD (Replaces: 10 failures in 5 minutes)
# ═══════════════════════════════════════════════════════════════════════════

get_cascade_threshold() {
    local circle="$1"
    local ceremony="$2"
    
    sqlite3 "$DB_PATH" <<SQL
WITH episode_stats AS (
  SELECT 
    -- Average episode duration in minutes
    AVG(CAST((julianday(COALESCE(completed_at, created_at)) - julianday(created_at)) * 1440 AS REAL)) as avg_duration_min,
    -- Baseline failure rate
    AVG(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END) as baseline_failure_rate,
    -- Failure rate standard deviation
    SQRT(AVG(POWER(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END - 
        (SELECT AVG(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END) 
         FROM episodes 
         WHERE circle='$circle' AND ceremony='$ceremony'), 2))) as failure_stddev,
    COUNT(*) as total_episodes,
    -- Episode velocity (episodes per hour)
    COUNT(*) / NULLIF((MAX(julianday(created_at)) - MIN(julianday(created_at))) * 24, 0) as velocity_per_hour
  FROM episodes
  WHERE circle='$circle' AND ceremony='$ceremony'
    AND created_at > datetime('now', '-7 days')
),
cascade_calc AS (
  SELECT 
    avg_duration_min,
    baseline_failure_rate,
    failure_stddev,
    total_episodes,
    velocity_per_hour,
    CASE 
      -- Sufficient data: Use statistical approach (3-sigma above baseline)
      WHEN total_episodes >= 50 THEN
        CAST(GREATEST(
          (baseline_failure_rate + (3 * failure_stddev)) * 50,
          5  -- Minimum threshold
        ) AS INTEGER)
      -- Moderate data: Velocity-based with 2x safety factor
      WHEN total_episodes >= 20 AND avg_duration_min > 0 THEN
        CAST(GREATEST(
          (60.0 / avg_duration_min) * 2.0,  -- 2x failures per hour
          5
        ) AS INTEGER)
      -- Limited data: Conservative fixed threshold
      ELSE 5
    END as failure_threshold,
    CASE
      -- Use 3x average episode duration as window
      WHEN avg_duration_min > 0 THEN CAST(avg_duration_min * 3 AS INTEGER)
      ELSE 5
    END as window_minutes
  FROM episode_stats
)
SELECT 
  failure_threshold || '|' ||
  window_minutes || '|' ||
  printf('%.4f', baseline_failure_rate) || '|' ||
  printf('%.4f', failure_stddev) || '|' ||
  printf('%.2f', velocity_per_hour) || '|' ||
  total_episodes
FROM cascade_calc;
SQL
}

# ═══════════════════════════════════════════════════════════════════════════
# 4. DIVERGENCE RATE (Replaces: 0.05 + (0.25 * stability))
# ═══════════════════════════════════════════════════════════════════════════

get_divergence_rate() {
    local circle="$1"
    
    sqlite3 "$DB_PATH" <<SQL
WITH recent_perf AS (
  SELECT 
    AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) as success_rate,
    AVG(reward) as mean_reward,
    SQRT(AVG(reward * reward) - AVG(reward) * AVG(reward)) as stddev_reward,
    COUNT(*) as sample_size
  FROM episodes
  WHERE circle='$circle'
    AND created_at > datetime('now', '-7 days')
),
risk_metrics AS (
  SELECT 
    success_rate,
    mean_reward,
    stddev_reward,
    sample_size,
    -- Sharpe ratio (assuming risk-free rate = 0)
    CASE WHEN stddev_reward > 0 THEN mean_reward / stddev_reward ELSE 0 END as sharpe_ratio,
    -- Coefficient of variation
    CASE WHEN mean_reward > 0 THEN stddev_reward / mean_reward ELSE 1.0 END as cv
  FROM recent_perf
),
divergence_calc AS (
  SELECT 
    success_rate,
    sharpe_ratio,
    cv,
    CASE
      -- Exceptional performance: Aggressive exploration (30%)
      WHEN sharpe_ratio > 2.0 AND success_rate > 0.85 AND sample_size >= 20 THEN 0.30
      -- Strong performance: Moderate-high exploration (20%)
      WHEN sharpe_ratio > 1.5 AND success_rate > 0.75 AND sample_size >= 20 THEN 0.20
      -- Good performance: Moderate exploration (15%)
      WHEN sharpe_ratio > 1.0 AND success_rate > 0.70 AND sample_size >= 15 THEN 0.15
      -- Acceptable performance: Conservative exploration (10%)
      WHEN sharpe_ratio > 0.5 AND success_rate > 0.60 AND sample_size >= 10 THEN 0.10
      -- Weak performance: Minimal exploration (5%)
      WHEN sample_size >= 10 THEN 0.05
      -- Insufficient data: Very conservative (3%)
      ELSE 0.03
    END as divergence_rate
  FROM risk_metrics
)
SELECT 
  printf('%.4f', divergence_rate) || '|' ||
  printf('%.4f', success_rate) || '|' ||
  printf('%.4f', sharpe_ratio) || '|' ||
  printf('%.4f', cv)
FROM divergence_calc;
SQL
}

# ═══════════════════════════════════════════════════════════════════════════
# 5. CHECK FREQUENCY (Replaces: 20 / (1 + risk))
# ═══════════════════════════════════════════════════════════════════════════

get_check_frequency() {
    local circle="$1"
    local ceremony="$2"
    
    sqlite3 "$DB_PATH" <<SQL
WITH risk_factors AS (
  SELECT 
    -- Reward volatility (coefficient of variation)
    (SQRT(AVG(reward * reward) - AVG(reward) * AVG(reward)) / NULLIF(AVG(reward), 0)) as reward_volatility,
    -- Failure rate
    AVG(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END) as failure_rate,
    -- Average episode duration
    AVG(CAST((julianday(COALESCE(completed_at, created_at)) - julianday(created_at)) * 1440 AS REAL)) as avg_duration_min,
    COUNT(*) as sample_size
  FROM episodes
  WHERE circle='$circle' AND ceremony='$ceremony'
    AND created_at > datetime('now', '-7 days')
),
frequency_calc AS (
  SELECT 
    reward_volatility,
    failure_rate,
    avg_duration_min,
    sample_size,
    CASE
      -- Critical risk: Check every 3 episodes
      WHEN (reward_volatility > 0.4 OR failure_rate > 0.3) AND sample_size >= 10 THEN 3
      -- High risk: Check every 5 episodes
      WHEN (reward_volatility > 0.3 OR failure_rate > 0.2) AND sample_size >= 10 THEN 5
      -- Medium risk: Check every 10 episodes
      WHEN (reward_volatility > 0.15 OR failure_rate > 0.1) AND sample_size >= 10 THEN 10
      -- Low risk: Check every 15 episodes
      WHEN sample_size >= 10 THEN 15
      -- Insufficient data: Check frequently until stable (5 episodes)
      ELSE 5
    END as check_every_n_episodes
  FROM risk_factors
)
SELECT 
  check_every_n_episodes || '|' ||
  printf('%.4f', reward_volatility) || '|' ||
  printf('%.4f', failure_rate) || '|' ||
  printf('%.2f', avg_duration_min) || '|' ||
  sample_size
FROM frequency_calc;
SQL
}

# ═══════════════════════════════════════════════════════════════════════════
# 6. QUANTILE-BASED DEGRADATION (Fat-tailed distributions)
# ═══════════════════════════════════════════════════════════════════════════

get_quantile_degradation_threshold() {
    local circle="$1"
    local ceremony="$2"
    local quantile="${3:-0.05}"  # 5th percentile by default
    
    sqlite3 "$DB_PATH" <<SQL
WITH rewards_sorted AS (
  SELECT 
    reward,
    ROW_NUMBER() OVER (ORDER BY reward) as row_num,
    COUNT(*) OVER () as total_count
  FROM episodes
  WHERE circle='$circle' AND ceremony='$ceremony'
    AND success=1
    AND created_at > datetime('now', '-30 days')
),
quantile_calc AS (
  SELECT 
    reward as quantile_threshold,
    total_count
  FROM rewards_sorted
  WHERE CAST(row_num AS REAL) / total_count >= $quantile
  ORDER BY row_num
  LIMIT 1
)
SELECT 
  printf('%.4f', quantile_threshold) || '|' ||
  total_count
FROM quantile_calc;
SQL
}

# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

# Extract first field from pipe-separated output
extract_value() {
    echo "$1" | cut -d'|' -f1
}

# Get all fields as bash array
parse_fields() {
    local input="$1"
    IFS='|' read -ra FIELDS <<< "$input"
    echo "${FIELDS[@]}"
}

# Export functions for use in other scripts
export -f get_circuit_breaker_threshold
export -f get_degradation_threshold
export -f get_cascade_threshold
export -f get_divergence_rate
export -f get_check_frequency
export -f get_quantile_degradation_threshold
export -f extract_value
export -f parse_fields
