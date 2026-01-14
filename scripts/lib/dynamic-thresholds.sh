#!/usr/bin/env bash
# Dynamic Threshold Calculator
# Replaces hardcoded magic numbers with statistically-derived, context-aware thresholds
# Ground truth validation from historical data

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DB_PATH="${DB_PATH:-$PROJECT_ROOT/agentdb.db}"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CIRCUIT BREAKER THRESHOLD - Replace hardcoded 0.7
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

calculate_circuit_breaker_threshold() {
    local circle="$1"
    local ceremony="${2:-}"
    local min_sample_size="${3:-30}"
    
    # Query for statistical parameters
    local result=$(sqlite3 "$DB_PATH" <<SQL
WITH recent_episodes AS (
  SELECT 
    reward,
    success,
    created_at
  FROM episodes 
  WHERE circle='$circle'
    $([ -n "$ceremony" ] && echo "AND ceremony='$ceremony'")
    AND success=1
    AND created_at > datetime('now', '-30 days')
),
stats AS (
  SELECT 
    AVG(reward) as mean_reward,
    -- SQLite doesn't have STDEV, calculate manually
    AVG((reward - (SELECT AVG(reward) FROM recent_episodes)) * 
        (reward - (SELECT AVG(reward) FROM recent_episodes))) as variance,
    COUNT(*) as sample_size,
    MIN(reward) as min_reward,
    MAX(reward) as max_reward
  FROM recent_episodes
)
SELECT 
  mean_reward,
  SQRT(variance) as stddev_reward,
  sample_size,
  min_reward,
  max_reward,
  -- Calculate coefficient of variation
  CASE WHEN mean_reward > 0 THEN SQRT(variance) / mean_reward ELSE 0 END as coeff_variation
FROM stats;
SQL
)
    
    if [[ -z "$result" ]]; then
        echo "0.6|0|fallback|0|0"  # Conservative fallback
        return
    fi
    
    local mean=$(echo "$result" | cut -d'|' -f1)
    local stddev=$(echo "$result" | cut -d'|' -f2)
    local n=$(echo "$result" | cut -d'|' -f3)
    local min_reward=$(echo "$result" | cut -d'|' -f4)
    local coeff_var=$(echo "$result" | cut -d'|' -f6)
    
    # Calculate threshold based on sample size and distribution
    local threshold
    local method
    
    if (( $(echo "$n >= $min_sample_size" | bc -l) )); then
        # Use multi-sigma approach based on coefficient of variation
        local sigma_multiplier
        if (( $(echo "$coeff_var < 0.15" | bc -l) )); then
            # Low variance: tight threshold (2.0 sigma)
            sigma_multiplier=2.0
            method="statistical_tight"
        elif (( $(echo "$coeff_var < 0.30" | bc -l) )); then
            # Medium variance: standard threshold (2.5 sigma)
            sigma_multiplier=2.5
            method="statistical_medium"
        else
            # High variance: loose threshold (3.0 sigma)
            sigma_multiplier=3.0
            method="statistical_loose"
        fi
        
        threshold=$(echo "$mean - ($sigma_multiplier * $stddev)" | bc -l)
        
    elif (( $(echo "$n >= 10" | bc -l) )); then
        # Small sample: use conservative multiplier
        threshold=$(echo "$mean - (3.0 * $stddev)" | bc -l)
        method="small_sample"
        
    else
        # Very small sample: use quantile-based approach
        threshold=$(echo "$min_reward * 1.05" | bc -l)  # 5% above historical min
        method="quantile_fallback"
    fi
    
    # Ensure threshold is reasonable (not too low, not too high)
    local min_threshold=0.4
    local max_threshold=$(echo "$mean * 0.95" | bc -l)
    
    if (( $(echo "$threshold < $min_threshold" | bc -l) )); then
        threshold=$min_threshold
        method="${method}_floored"
    fi
    
    if (( $(echo "$threshold > $max_threshold" | bc -l) )); then
        threshold=$max_threshold
        method="${method}_capped"
    fi
    
    # Return: threshold|sample_size|method|mean|stddev
    echo "$threshold|$n|$method|$mean|$stddev"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DEGRADATION THRESHOLD - Replace hardcoded 0.9 multiplier
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

calculate_degradation_threshold() {
    local circle="$1"
    local ceremony="$2"
    local baseline_reward="$3"
    
    # Get statistical context
    local result=$(sqlite3 "$DB_PATH" <<SQL
WITH episode_stats AS (
  SELECT 
    reward,
    success,
    (reward - $baseline_reward) as drawdown
  FROM episodes
  WHERE circle='$circle' AND ceremony='$ceremony'
    AND success=1
    AND created_at > datetime('now', '-30 days')
),
stats AS (
  SELECT 
    AVG(reward) as mean_reward,
    AVG((reward - (SELECT AVG(reward) FROM episode_stats)) * 
        (reward - (SELECT AVG(reward) FROM episode_stats))) as variance,
    COUNT(*) as n,
    -- Calculate historical max drawdown
    MIN(drawdown) as max_drawdown,
    -- Calculate skewness indicator (simplified)
    AVG(CASE WHEN reward < $baseline_reward THEN 1 ELSE 0 END) as below_baseline_pct
  FROM episode_stats
)
SELECT 
  mean_reward,
  SQRT(variance) as stddev,
  n,
  max_drawdown,
  below_baseline_pct,
  -- Standard error
  SQRT(variance) / SQRT(n) as std_error
FROM stats;
SQL
)
    
    if [[ -z "$result" ]]; then
        echo "$(echo "$baseline_reward * 0.85" | bc -l)|0|fallback"
        return
    fi
    
    local mean=$(echo "$result" | cut -d'|' -f1)
    local stddev=$(echo "$result" | cut -d'|' -f2)
    local n=$(echo "$result" | cut -d'|' -f3)
    local max_drawdown=$(echo "$result" | cut -d'|' -f4)
    local std_error=$(echo "$result" | cut -d'|' -f6)
    
    local threshold
    local method
    
    if (( $(echo "$n >= 30" | bc -l) )); then
        # Use 95% confidence interval (1.96 * SE)
        threshold=$(echo "$baseline_reward - (1.96 * $std_error)" | bc -l)
        method="confidence_interval_95"
        
    elif (( $(echo "$n >= 10" | bc -l) )); then
        # Use 99% confidence interval for small samples (2.576 * SE)
        threshold=$(echo "$baseline_reward - (2.576 * $std_error)" | bc -l)
        method="confidence_interval_99"
        
    else
        # Use historical max drawdown with safety factor
        threshold=$(echo "$baseline_reward + ($max_drawdown * 1.2)" | bc -l)
        method="historical_drawdown"
    fi
    
    # Apply coefficient of variation adjustment
    local coeff_var=$(echo "$stddev / $mean" | bc -l)
    
    if (( $(echo "$coeff_var > 0.3" | bc -l) )); then
        # High variance: be more lenient
        threshold=$(echo "$threshold * 0.95" | bc -l)
        method="${method}_high_var_adjusted"
    fi
    
    # Ensure minimum threshold
    local min_threshold=$(echo "$baseline_reward * 0.70" | bc -l)
    if (( $(echo "$threshold < $min_threshold" | bc -l) )); then
        threshold=$min_threshold
        method="${method}_floored"
    fi
    
    echo "$threshold|$n|$method"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CASCADE THRESHOLD - Replace hardcoded 10 failures / 5 minutes
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

calculate_cascade_threshold() {
    local circle="$1"
    local ceremony="$2"
    
    # Get failure rate statistics
    local result=$(sqlite3 "$DB_PATH" <<SQL
WITH episode_timing AS (
  SELECT 
    success,
    CAST((julianday(completed_at) - julianday(created_at)) * 1440 AS REAL) as duration_min,
    created_at,
    LAG(success) OVER (ORDER BY created_at) as prev_success
  FROM episodes
  WHERE circle='$circle' AND ceremony='$ceremony'
    AND created_at > datetime('now', '-14 days')
    AND completed_at IS NOT NULL
),
failure_clusters AS (
  SELECT 
    AVG(duration_min) as avg_duration,
    AVG(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END) as baseline_failure_rate,
    -- Calculate failure clustering: consecutive failures
    AVG(CASE WHEN success = 0 AND prev_success = 0 THEN 1.0 ELSE 0.0 END) as cluster_rate,
    COUNT(*) as total_episodes,
    -- Calculate variance of failure rate
    AVG((CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END - 
         (SELECT AVG(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END) FROM episode_timing)) *
        (CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END - 
         (SELECT AVG(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END) FROM episode_timing))) as failure_variance
  FROM episode_timing
)
SELECT 
  avg_duration,
  baseline_failure_rate,
  cluster_rate,
  total_episodes,
  SQRT(failure_variance) as failure_stddev
FROM failure_clusters;
SQL
)
    
    if [[ -z "$result" ]]; then
        echo "5|10|fallback"  # Conservative defaults
        return
    fi
    
    local avg_duration=$(echo "$result" | cut -d'|' -f1)
    local baseline_rate=$(echo "$result" | cut -d'|' -f2)
    local cluster_rate=$(echo "$result" | cut -d'|' -f3)
    local n=$(echo "$result" | cut -d'|' -f4)
    local failure_stddev=$(echo "$result" | cut -d'|' -f5)
    
    local threshold
    local window_minutes
    local method
    
    if (( $(echo "$n >= 50" | bc -l) )); then
        # Statistical approach: 3-sigma above baseline failure rate
        # Convert to failure count in a reasonable window
        window_minutes=$(echo "$avg_duration * 5" | bc -l | cut -d. -f1)
        local expected_episodes=$(echo "$window_minutes / $avg_duration" | bc -l)
        local expected_failures=$(echo "$expected_episodes * $baseline_rate" | bc -l)
        local sigma_failures=$(echo "$expected_episodes * $failure_stddev" | bc -l)
        
        threshold=$(echo "$expected_failures + (3 * $sigma_failures)" | bc -l | cut -d. -f1)
        method="statistical_3sigma"
        
    elif (( $(echo "$n >= 20" | bc -l) )); then
        # Velocity-based with safety factor
        window_minutes=$(echo "$avg_duration * 3" | bc -l | cut -d. -f1)
        threshold=$(echo "(300.0 / $avg_duration) * 1.5" | bc -l | cut -d. -f1)
        method="velocity_based"
        
    else
        # Conservative fallback
        window_minutes=10
        threshold=5
        method="conservative_fallback"
    fi
    
    # Account for clustering: if failures tend to cluster, be more sensitive
    if (( $(echo "$cluster_rate > 0.3" | bc -l) )); then
        threshold=$(echo "$threshold * 0.7" | bc -l | cut -d. -f1)
        method="${method}_cluster_adjusted"
    fi
    
    # Ensure reasonable bounds
    threshold=$(( threshold < 3 ? 3 : threshold ))
    threshold=$(( threshold > 20 ? 20 : threshold ))
    window_minutes=$(( window_minutes < 5 ? 5 : window_minutes ))
    
    echo "$threshold|$window_minutes|$method"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DIVERGENCE RATE - Replace hardcoded 0.1 / 0.15 / 0.2
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

calculate_divergence_rate() {
    local circle="$1"
    local phase="${2:-1}"  # 1, 2, or 3
    
    # Calculate Sharpe ratio and success metrics
    local result=$(sqlite3 "$DB_PATH" <<SQL
WITH recent_perf AS (
  SELECT 
    reward,
    success,
    created_at
  FROM episodes
  WHERE circle='$circle'
    AND created_at > datetime('now', '-7 days')
),
stats AS (
  SELECT 
    AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) as success_rate,
    AVG(reward) as mean_reward,
    AVG((reward - (SELECT AVG(reward) FROM recent_perf)) * 
        (reward - (SELECT AVG(reward) FROM recent_perf))) as variance,
    COUNT(*) as sample_size
  FROM recent_perf
),
sharpe AS (
  SELECT 
    success_rate,
    mean_reward,
    SQRT(variance) as stddev_reward,
    sample_size,
    -- Sharpe ratio: mean / stddev
    CASE 
      WHEN SQRT(variance) > 0 THEN mean_reward / SQRT(variance)
      ELSE 0
    END as sharpe_ratio
  FROM stats
)
SELECT 
  success_rate,
  sharpe_ratio,
  mean_reward,
  stddev_reward,
  sample_size
FROM sharpe;
SQL
)
    
    if [[ -z "$result" ]]; then
        echo "0.05|fallback"  # Conservative fallback
        return
    fi
    
    local success_rate=$(echo "$result" | cut -d'|' -f1)
    local sharpe=$(echo "$result" | cut -d'|' -f2)
    local mean_reward=$(echo "$result" | cut -d'|' -f3)
    local n=$(echo "$result" | cut -d'|' -f5)
    
    local divergence_rate
    local method
    
    if (( $(echo "$n >= 10" | bc -l) )); then
        # Risk-adjusted divergence based on Sharpe ratio and success rate
        if (( $(echo "$sharpe > 2.0" | bc -l) )) && (( $(echo "$success_rate > 0.85" | bc -l) )); then
            # Excellent performance: aggressive exploration
            divergence_rate=0.30
            method="aggressive"
        elif (( $(echo "$sharpe > 1.5" | bc -l) )) && (( $(echo "$success_rate > 0.75" | bc -l) )); then
            # Good performance: moderate exploration
            divergence_rate=0.20
            method="moderate"
        elif (( $(echo "$sharpe > 1.0" | bc -l) )) && (( $(echo "$success_rate > 0.65" | bc -l) )); then
            # Acceptable performance: conservative exploration
            divergence_rate=0.12
            method="conservative"
        elif (( $(echo "$sharpe > 0.5" | bc -l) )) && (( $(echo "$success_rate > 0.50" | bc -l) )); then
            # Marginal performance: minimal exploration
            divergence_rate=0.06
            method="minimal"
        else
            # Poor performance: very conservative
            divergence_rate=0.03
            method="very_conservative"
        fi
        
        # Phase adjustment
        case $phase in
            1)
                divergence_rate=$(echo "$divergence_rate * 0.5" | bc -l)
                method="${method}_phase1"
                ;;
            2)
                divergence_rate=$(echo "$divergence_rate * 0.75" | bc -l)
                method="${method}_phase2"
                ;;
            3)
                # Full rate for phase 3
                method="${method}_phase3"
                ;;
        esac
        
    else
        # Insufficient data: phase-based defaults
        case $phase in
            1) divergence_rate=0.05; method="phase1_default" ;;
            2) divergence_rate=0.10; method="phase2_default" ;;
            3) divergence_rate=0.15; method="phase3_default" ;;
        esac
    fi
    
    echo "$divergence_rate|$method"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CHECK FREQUENCY - Replace hardcoded every 10 episodes
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

calculate_check_frequency() {
    local circle="$1"
    local ceremony="$2"
    
    # Calculate volatility and failure metrics
    local result=$(sqlite3 "$DB_PATH" <<SQL
WITH recent_perf AS (
  SELECT 
    reward,
    success,
    created_at
  FROM episodes
  WHERE circle='$circle' AND ceremony='$ceremony'
    AND created_at > datetime('now', '-7 days')
),
risk_metrics AS (
  SELECT 
    AVG(reward) as mean_reward,
    AVG((reward - (SELECT AVG(reward) FROM recent_perf)) * 
        (reward - (SELECT AVG(reward) FROM recent_perf))) as variance,
    AVG(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END) as failure_rate,
    COUNT(*) as sample_size
  FROM recent_perf
)
SELECT 
  CASE 
    WHEN mean_reward > 0 THEN SQRT(variance) / mean_reward 
    ELSE 1.0 
  END as reward_volatility,
  failure_rate,
  sample_size
FROM risk_metrics;
SQL
)
    
    if [[ -z "$result" ]]; then
        echo "10|fallback"
        return
    fi
    
    local volatility=$(echo "$result" | cut -d'|' -f1)
    local failure_rate=$(echo "$result" | cut -d'|' -f2)
    local n=$(echo "$result" | cut -d'|' -f3)
    
    local frequency
    local method
    
    if (( $(echo "$n >= 10" | bc -l) )); then
        # Risk-based frequency
        if (( $(echo "$volatility > 0.30" | bc -l) )) || (( $(echo "$failure_rate > 0.20" | bc -l) )); then
            # High risk: check frequently
            frequency=5
            method="high_risk"
        elif (( $(echo "$volatility > 0.15" | bc -l) )) || (( $(echo "$failure_rate > 0.10" | bc -l) )); then
            # Medium risk: standard checking
            frequency=10
            method="medium_risk"
        else
            # Low risk: infrequent checking
            frequency=15
            method="low_risk"
        fi
    else
        # Insufficient data: conservative
        frequency=8
        method="insufficient_data"
    fi
    
    echo "$frequency|$method"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# QUANTILE-BASED THRESHOLDS - For non-normal distributions
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

calculate_quantile_threshold() {
    local circle="$1"
    local ceremony="$2"
    local quantile="${3:-0.05}"  # Default 5th percentile
    
    # Get quantile-based threshold (works for fat-tailed distributions)
    local result=$(sqlite3 "$DB_PATH" <<SQL
WITH ranked_rewards AS (
  SELECT 
    reward,
    ROW_NUMBER() OVER (ORDER BY reward) as row_num,
    COUNT(*) OVER () as total_count
  FROM episodes
  WHERE circle='$circle' AND ceremony='$ceremony'
    AND success=1
    AND created_at > datetime('now', '-30 days')
)
SELECT 
  reward as quantile_threshold,
  total_count as sample_size
FROM ranked_rewards
WHERE CAST(row_num AS REAL) / total_count <= $quantile
ORDER BY reward DESC
LIMIT 1;
SQL
)
    
    if [[ -z "$result" ]]; then
        echo "0.5|0|fallback"
        return
    fi
    
    local threshold=$(echo "$result" | cut -d'|' -f1)
    local n=$(echo "$result" | cut -d'|' -f2)
    
    echo "$threshold|$n|quantile_${quantile}"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MAIN - Example usage and testing
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Script is being run directly (testing)
    
    circle="${1:-orchestrator}"
    ceremony="${2:-standup}"
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Dynamic Threshold Calculator - Test Mode"
    echo "  Circle: $circle | Ceremony: $ceremony"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo
    
    echo "1. Circuit Breaker Threshold:"
    result=$(calculate_circuit_breaker_threshold "$circle" "$ceremony")
    echo "   Threshold: $(echo "$result" | cut -d'|' -f1)"
    echo "   Sample Size: $(echo "$result" | cut -d'|' -f2)"
    echo "   Method: $(echo "$result" | cut -d'|' -f3)"
    echo "   Mean: $(echo "$result" | cut -d'|' -f4)"
    echo "   StdDev: $(echo "$result" | cut -d'|' -f5)"
    echo
    
    echo "2. Degradation Threshold:"
    baseline=1.0
    result=$(calculate_degradation_threshold "$circle" "$ceremony" "$baseline")
    echo "   Threshold: $(echo "$result" | cut -d'|' -f1)"
    echo "   Sample Size: $(echo "$result" | cut -d'|' -f2)"
    echo "   Method: $(echo "$result" | cut -d'|' -f3)"
    echo
    
    echo "3. Cascade Threshold:"
    result=$(calculate_cascade_threshold "$circle" "$ceremony")
    echo "   Max Failures: $(echo "$result" | cut -d'|' -f1)"
    echo "   Window (min): $(echo "$result" | cut -d'|' -f2)"
    echo "   Method: $(echo "$result" | cut -d'|' -f3)"
    echo
    
    echo "4. Divergence Rate:"
    for phase in 1 2 3; do
        result=$(calculate_divergence_rate "$circle" "$phase")
        echo "   Phase $phase: $(echo "$result" | cut -d'|' -f1) ($(echo "$result" | cut -d'|' -f2))"
    done
    echo
    
    echo "5. Check Frequency:"
    result=$(calculate_check_frequency "$circle" "$ceremony")
    echo "   Every N episodes: $(echo "$result" | cut -d'|' -f1)"
    echo "   Method: $(echo "$result" | cut -d'|' -f2)"
    echo
    
    echo "6. Quantile Threshold (5th percentile):"
    result=$(calculate_quantile_threshold "$circle" "$ceremony" 0.05)
    echo "   Threshold: $(echo "$result" | cut -d'|' -f1)"
    echo "   Sample Size: $(echo "$result" | cut -d'|' -f2)"
    echo "   Method: $(echo "$result" | cut -d'|' -f3)"
    echo
fi
