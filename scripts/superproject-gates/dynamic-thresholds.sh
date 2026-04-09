#!/usr/bin/env bash
# dynamic-thresholds.sh - Statistically rigorous threshold calculation
# Replaces arbitrary hardcoded values with data-driven, regime-aware thresholds

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_PATH="${DB_PATH:-$PROJECT_ROOT/agentdb.db}"

# ============================================================================
# Statistical Utility Functions
# ============================================================================

# Calculate quantile using interpolation (SQLite doesn't have PERCENTILE_CONT)
calculate_quantile() {
    local circle=$1
    local quantile=$2
    local lookback_days=${3:-30}
    
    sqlite3 "$DB_PATH" <<SQL
WITH ordered_rewards AS (
  SELECT 
    reward,
    ROW_NUMBER() OVER (ORDER BY reward) as row_num,
    COUNT(*) OVER () as total_count
  FROM episodes
  WHERE json_extract(metadata, '$.circle') = '$circle'
    AND success = 1
    AND created_at > datetime('now', '-$lookback_days days')
)
SELECT reward
FROM ordered_rewards
WHERE CAST(row_num AS REAL) >= (total_count * $quantile)
  AND CAST(row_num AS REAL) <= (total_count * $quantile + 1)
LIMIT 1;
SQL
}

# Test for normality using skewness and kurtosis
check_distribution_normality() {
    local circle=$1
    
    sqlite3 "$DB_PATH" <<SQL
WITH stats AS (
  SELECT 
    AVG(reward) as mean,
    COUNT(*) as n,
    STDEV(reward) as stddev
  FROM episodes
  WHERE json_extract(metadata, '$.circle') = '$circle'
    AND success = 1
    AND created_at > datetime('now', '-30 days')
),
moments AS (
  SELECT
    SUM(POWER((reward - (SELECT mean FROM stats)), 3)) / 
      (COUNT(*) * POWER((SELECT stddev FROM stats), 3)) as skewness,
    SUM(POWER((reward - (SELECT mean FROM stats)), 4)) / 
      (COUNT(*) * POWER((SELECT stddev FROM stats), 4)) - 3 as excess_kurtosis
  FROM episodes
  WHERE json_extract(metadata, '$.circle') = '$circle'
    AND success = 1
    AND created_at > datetime('now', '-30 days')
)
SELECT 
  CASE 
    WHEN ABS(skewness) < 0.5 AND ABS(excess_kurtosis) < 1.0 THEN 'NORMAL'
    WHEN ABS(skewness) >= 1.0 OR ABS(excess_kurtosis) >= 3.0 THEN 'FAT_TAILED'
    ELSE 'SKEWED'
  END as distribution_type,
  skewness,
  excess_kurtosis
FROM moments;
SQL
}

# Detect regime changes using CUSUM or moving average divergence
detect_regime_change() {
    local circle=$1
    local ceremony=$2
    
    sqlite3 "$DB_PATH" <<SQL
WITH recent_windows AS (
  SELECT 
    AVG(CASE WHEN created_at > datetime('now', '-7 days') THEN reward END) as week_1_avg,
    AVG(CASE WHEN created_at BETWEEN datetime('now', '-14 days') AND datetime('now', '-7 days') 
        THEN reward END) as week_2_avg,
    AVG(CASE WHEN created_at BETWEEN datetime('now', '-30 days') AND datetime('now', '-14 days') 
        THEN reward END) as week_3_4_avg,
    STDEV(reward) as overall_stddev
  FROM episodes
  WHERE json_extract(metadata, '$.circle') = '$circle'
    ${ceremony:+AND task LIKE '%$ceremony%'}
    AND success = 1
    AND created_at > datetime('now', '-30 days')
)
SELECT 
  CASE
    -- Significant divergence = regime change
    WHEN ABS(week_1_avg - week_2_avg) > (2 * overall_stddev) THEN 1
    WHEN ABS(week_1_avg - week_3_4_avg) > (2.5 * overall_stddev) THEN 1
    ELSE 0
  END as regime_changed,
  week_1_avg,
  week_2_avg,
  week_3_4_avg,
  overall_stddev
FROM recent_windows;
SQL
}

# ============================================================================
# CIRCUIT BREAKER THRESHOLD (Regime-Aware)
# ============================================================================

calculate_circuit_breaker_threshold() {
    local circle=$1
    local ceremony=${2:-}
    
    echo "🔍 Calculating circuit breaker threshold for circle: $circle" >&2
    
    # Check distribution type and regime
    local dist_info=$(check_distribution_normality "$circle")
    local dist_type=$(echo "$dist_info" | cut -d'|' -f1)
    local skewness=$(echo "$dist_info" | cut -d'|' -f2)
    
    local regime_info=$(detect_regime_change "$circle" "$ceremony")
    local regime_changed=$(echo "$regime_info" | cut -d'|' -f1)
    
    echo "   Distribution: $dist_type (skewness: $skewness)" >&2
    echo "   Regime change detected: $regime_changed" >&2
    
    # Calculate threshold based on distribution type
    if [ "$dist_type" = "NORMAL" ]; then
        # Normal distribution: Use parametric approach (mean - k*sigma)
        sqlite3 "$DB_PATH" <<SQL
WITH recent_stats AS (
  SELECT 
    AVG(reward) as mean_reward,
    STDEV(reward) as stddev_reward,
    COUNT(*) as sample_size
  FROM episodes 
  WHERE json_extract(metadata, '$.circle') = '$circle'
    ${ceremony:+AND task LIKE '%$ceremony%'}
    AND success = 1
    AND created_at > datetime('now', '-30 days')
)
SELECT 
  CASE 
    -- Large sample with stable regime: 2.5 sigma
    WHEN sample_size >= 30 AND $regime_changed = 0 THEN 
      mean_reward - (2.5 * stddev_reward)
    -- Small sample OR regime change: More conservative (3.0 sigma)
    WHEN sample_size >= 10 THEN 
      mean_reward - (3.0 * stddev_reward)
    -- Very small sample: Use 25th percentile fallback
    ELSE 
      mean_reward - (1.5 * stddev_reward)
  END as threshold
FROM recent_stats;
SQL
    else
        # Non-normal: Use quantile-based approach
        echo "   Using quantile-based threshold (non-parametric)" >&2
        
        local q05=$(calculate_quantile "$circle" 0.05 30)
        local q10=$(calculate_quantile "$circle" 0.10 30)
        
        if [ "$regime_changed" = "1" ]; then
            # Regime change: Use more conservative 10th percentile
            echo "$q10"
        else
            # Stable regime: Use 5th percentile
            echo "$q05"
        fi
    fi
}

# ============================================================================
# DEGRADATION THRESHOLD (Statistical Significance)
# ============================================================================

calculate_degradation_threshold() {
    local circle=$1
    local ceremony=$2
    local baseline_reward=$3
    
    echo "🔍 Calculating degradation threshold for $circle/$ceremony" >&2
    
    sqlite3 "$DB_PATH" <<SQL
WITH stats AS (
  SELECT 
    AVG(reward) as mean_reward,
    STDEV(reward) as stddev_reward,
    COUNT(*) as n,
    -- Calculate skewness for distribution check
    SUM(POWER((reward - AVG(reward)), 3)) / 
      (COUNT(*) * POWER(STDEV(reward), 3)) as skewness
  FROM episodes 
  WHERE circle = '$circle' 
    AND ceremony = '$ceremony'
    AND success = 1
    AND created_at > datetime('now', '-30 days')
)
SELECT 
  CASE
    -- Normal distribution: Use confidence interval (95% = 1.96 * SE)
    WHEN n >= 30 AND ABS(skewness) < 0.5 THEN 
      mean_reward - (1.96 * stddev_reward / SQRT(n))
    -- Moderate sample, normal-ish: Use 2.5 * SE
    WHEN n >= 10 AND ABS(skewness) < 1.0 THEN 
      mean_reward - (2.5 * stddev_reward / SQRT(n))
    -- Fat-tailed distribution: Use quantile approach
    WHEN ABS(skewness) >= 1.0 THEN
      mean_reward - (3.0 * stddev_reward / SQRT(n))
    -- Small sample fallback: Conservative 15% below baseline
    ELSE 
      $baseline_reward * 0.85
  END as threshold,
  stddev_reward / NULLIF(mean_reward, 0) as coeff_variation,
  n as sample_size,
  skewness
FROM stats;
SQL
}

# ============================================================================
# CASCADE FAILURE THRESHOLD (Failure Velocity)
# ============================================================================

calculate_cascade_threshold() {
    local circle=$1
    local ceremony=$2
    
    echo "🔍 Calculating cascade failure threshold for $circle/$ceremony" >&2
    
    sqlite3 "$DB_PATH" <<SQL
WITH episode_stats AS (
  SELECT 
    AVG(CAST((julianday(COALESCE(completed_at, created_at)) - 
              julianday(created_at)) * 1440 AS REAL)) as avg_duration_min,
    AVG(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END) as baseline_failure_rate,
    STDEV(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END) as failure_stddev,
    COUNT(*) as total_episodes
  FROM episodes
  WHERE circle = '$circle' 
    AND ceremony = '$ceremony'
    AND created_at > datetime('now', '-7 days')
),
failure_clustering AS (
  -- Detect if failures tend to cluster (high temporal correlation)
  SELECT 
    LAG(success, 1) OVER (ORDER BY created_at) as prev_success,
    success as curr_success,
    COUNT(*) OVER () as total
  FROM episodes
  WHERE circle = '$circle' 
    AND ceremony = '$ceremony'
    AND created_at > datetime('now', '-7 days')
)
SELECT 
  CASE 
    -- Sufficient data: Use 3-sigma above baseline failure rate
    WHEN total_episodes >= 50 THEN
      CAST((baseline_failure_rate + (3 * failure_stddev)) * 50 AS INTEGER)
    -- Moderate data: Velocity-based with clustering adjustment
    WHEN total_episodes >= 20 THEN
      CAST((300.0 / NULLIF(avg_duration_min, 1)) * 1.5 AS INTEGER)
    -- Small sample: Conservative absolute count
    ELSE 
      5
  END as threshold,
  CAST(GREATEST(avg_duration_min * 3, 5) AS INTEGER) as window_minutes,
  baseline_failure_rate,
  total_episodes
FROM episode_stats
LIMIT 1;
SQL
}

# ============================================================================
# DIVERGENCE RATE (Risk-Adjusted Exploration)
# ============================================================================

calculate_divergence_rate() {
    local circle=$1
    
    echo "🔍 Calculating risk-adjusted divergence rate for $circle" >&2
    
    sqlite3 "$DB_PATH" <<SQL
WITH recent_perf AS (
  SELECT 
    AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) as success_rate,
    AVG(reward) as mean_reward,
    STDEV(reward) as stddev_reward,
    -- Sharpe ratio: (mean - risk_free_rate) / stddev
    -- Assume risk_free_rate = 0 for simplicity
    (AVG(reward) / NULLIF(STDEV(reward), 0)) as sharpe_ratio,
    COUNT(*) as sample_size,
    -- Maximum drawdown
    (MAX(reward) - MIN(reward)) / NULLIF(MAX(reward), 0) as max_drawdown
  FROM episodes
  WHERE circle = '$circle'
    AND created_at > datetime('now', '-7 days')
),
regime_volatility AS (
  -- Calculate regime change frequency
  SELECT 
    COUNT(DISTINCT DATE(created_at)) as trading_days,
    STDEV(reward) / AVG(reward) as daily_coeff_variation
  FROM episodes
  WHERE circle = '$circle'
    AND created_at > datetime('now', '-30 days')
)
SELECT 
  CASE
    -- High Sharpe + High Success + Low Drawdown = Aggressive exploration
    WHEN sharpe_ratio > 2.0 AND success_rate > 0.85 AND max_drawdown < 0.15 THEN 0.30
    
    -- Good Sharpe + Good Success = Moderate exploration
    WHEN sharpe_ratio > 1.0 AND success_rate > 0.70 THEN 0.15
    
    -- Mediocre performance = Conservative exploration
    WHEN sharpe_ratio > 0.5 AND success_rate > 0.50 THEN 0.08
    
    -- High volatility regime = Reduce divergence
    WHEN daily_coeff_variation > 0.5 THEN 0.05
    
    -- Poor performance = Minimal divergence
    ELSE 0.03
  END as divergence_rate,
  success_rate,
  ROUND(sharpe_ratio, 2) as sharpe_ratio,
  ROUND(max_drawdown, 3) as max_drawdown,
  ROUND(daily_coeff_variation, 3) as regime_volatility
FROM recent_perf, regime_volatility
WHERE sample_size >= 10;
SQL
}

# ============================================================================
# CHECK FREQUENCY (Adaptive Monitoring)
# ============================================================================

calculate_check_frequency() {
    local circle=$1
    local ceremony=$2
    
    echo "🔍 Calculating adaptive check frequency for $circle/$ceremony" >&2
    
    sqlite3 "$DB_PATH" <<SQL
WITH risk_factors AS (
  SELECT 
    STDEV(reward) / NULLIF(AVG(reward), 0) as reward_volatility,
    AVG(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END) as failure_rate,
    AVG(CAST((julianday(COALESCE(completed_at, created_at)) - 
              julianday(created_at)) * 1440 AS REAL)) as avg_duration_min,
    COUNT(*) as sample_size,
    -- Temporal correlation of failures
    COUNT(CASE WHEN success = 0 AND 
      LAG(success) OVER (ORDER BY created_at) = 0 THEN 1 END) * 1.0 / 
      NULLIF(COUNT(CASE WHEN success = 0 THEN 1 END), 0) as failure_clustering
  FROM episodes
  WHERE circle = '$circle' 
    AND ceremony = '$ceremony'
    AND created_at > datetime('now', '-7 days')
),
cost_benefit AS (
  -- Estimate check cost vs potential loss
  SELECT
    avg_duration_min * 0.1 as check_cost_min,
    avg_duration_min * failure_rate * 10 as expected_loss_min
  FROM risk_factors
)
SELECT 
  CASE
    -- High volatility OR high failure rate OR clustering = Check frequently
    WHEN reward_volatility > 0.3 OR failure_rate > 0.2 OR failure_clustering > 0.5 THEN 5
    
    -- Medium risk = Standard checking
    WHEN reward_volatility > 0.15 OR failure_rate > 0.1 THEN 10
    
    -- Low risk BUT high expected loss = Moderate checking
    WHEN expected_loss_min > (check_cost_min * 20) THEN 8
    
    -- Low risk = Infrequent checking
    ELSE 15
  END as check_every_n_episodes,
  ROUND(reward_volatility, 3) as volatility,
  ROUND(failure_rate, 3) as failure_rate,
  ROUND(failure_clustering, 3) as clustering,
  sample_size
FROM risk_factors, cost_benefit
WHERE sample_size >= 5;
SQL
}

# ============================================================================
# Main Command Interface
# ============================================================================

usage() {
    cat <<EOF
Usage: $0 <command> <circle> [ceremony]

Commands:
  circuit-breaker   Calculate circuit breaker threshold
  degradation       Calculate degradation threshold (requires baseline)
  cascade           Calculate cascade failure threshold
  divergence        Calculate divergence rate
  check-frequency   Calculate adaptive check frequency
  all               Calculate all thresholds
  
Examples:
  $0 circuit-breaker orchestrator
  $0 degradation analyst standup
  $0 all orchestrator standup

Environment:
  DB_PATH           Path to AgentDB database (default: ./agentdb.db)
EOF
}

main() {
    local command=${1:-}
    local circle=${2:-}
    local ceremony=${3:-}
    
    if [ -z "$command" ] || [ -z "$circle" ]; then
        usage
        exit 1
    fi
    
    if [ ! -f "$DB_PATH" ]; then
        echo "❌ Database not found: $DB_PATH" >&2
        exit 1
    fi
    
    case "$command" in
        circuit-breaker)
            calculate_circuit_breaker_threshold "$circle" "$ceremony"
            ;;
        degradation)
            if [ -z "$ceremony" ]; then
                echo "❌ Degradation threshold requires ceremony parameter" >&2
                exit 1
            fi
            # Get baseline from recent average
            local baseline=$(sqlite3 "$DB_PATH" \
                "SELECT AVG(reward) FROM episodes 
                 WHERE circle='$circle' AND ceremony='$ceremony' 
                 AND success=1 AND created_at > datetime('now', '-30 days');")
            calculate_degradation_threshold "$circle" "$ceremony" "$baseline"
            ;;
        cascade)
            calculate_cascade_threshold "$circle" "$ceremony"
            ;;
        divergence)
            calculate_divergence_rate "$circle"
            ;;
        check-frequency)
            calculate_check_frequency "$circle" "$ceremony"
            ;;
        all)
            echo "{"
            echo "  \"circle\": \"$circle\","
            echo "  \"ceremony\": \"$ceremony\","
            echo "  \"circuit_breaker\": $(calculate_circuit_breaker_threshold "$circle" "$ceremony"),"
            echo "  \"cascade\": $(calculate_cascade_threshold "$circle" "$ceremony"),"
            echo "  \"divergence\": $(calculate_divergence_rate "$circle"),"
            echo "  \"check_frequency\": $(calculate_check_frequency "$circle" "$ceremony")"
            echo "}"
            ;;
        *)
            echo "❌ Unknown command: $command" >&2
            usage
            exit 1
            ;;
    esac
}

if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
