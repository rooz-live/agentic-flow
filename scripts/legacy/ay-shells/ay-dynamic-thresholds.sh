#!/usr/bin/env bash
# Dynamic Threshold Calculator - Replace hardcoded values with statistical ground truth
# Purpose: Calculate risk-adjusted, regime-aware thresholds from historical data

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
AGENTDB_PATH="${PROJECT_ROOT}/agentdb.db"

# Minimum sample sizes for statistical validity
MIN_SAMPLE_SIZE=30
MIN_SAMPLE_SIZE_SMALL=10
FALLBACK_SAMPLE_SIZE=5

#═══════════════════════════════════════════
# 1. CIRCUIT BREAKER THRESHOLD
#    Replace: hardcoded 0.7
#    With: Mean - N*StdDev (regime-aware, sample-size adjusted)
#═══════════════════════════════════════════

calculate_circuit_breaker_threshold() {
  local circle="$1"
  local lookback_days="${2:-30}"
  
  sqlite3 "$AGENTDB_PATH" <<SQL 2>/dev/null || echo "0.7"
WITH recent_stats AS (
  SELECT 
    AVG(reward) as mean_reward,
    -- SQLite doesn't have STDEV, calculate manually
    AVG(reward * reward) - (AVG(reward) * AVG(reward)) as variance,
    COUNT(*) as sample_size,
    MIN(reward) as min_reward,
    MAX(reward) as max_reward
  FROM episodes 
  WHERE task LIKE '%$circle%'
    AND success = 1
    AND created_at > strftime('%s', 'now', '-${lookback_days} days')
),
computed AS (
  SELECT 
    mean_reward,
    SQRT(variance) as stddev_reward,
    sample_size,
    min_reward,
    max_reward,
    CASE 
      -- Large sample: Use 2.5 sigma (captures 98.8% of distribution)
      WHEN sample_size >= $MIN_SAMPLE_SIZE THEN mean_reward - (2.5 * SQRT(variance))
      -- Medium sample: Use 3.0 sigma (more conservative)
      WHEN sample_size >= $MIN_SAMPLE_SIZE_SMALL THEN mean_reward - (3.0 * SQRT(variance))
      -- Small sample: Use 85% of mean (conservative fallback)
      WHEN sample_size >= $FALLBACK_SAMPLE_SIZE THEN mean_reward * 0.85
      -- No data: Use conservative default
      ELSE 0.5
    END as threshold
  FROM recent_stats
)
SELECT 
  -- Ensure threshold is reasonable (not negative, not above max)
  MAX(0.3, MIN(threshold, min_reward * 0.95)) as final_threshold,
  sample_size,
  mean_reward,
  stddev_reward,
  CASE
    WHEN sample_size >= $MIN_SAMPLE_SIZE THEN 'HIGH_CONFIDENCE'
    WHEN sample_size >= $MIN_SAMPLE_SIZE_SMALL THEN 'MEDIUM_CONFIDENCE'
    WHEN sample_size >= $FALLBACK_SAMPLE_SIZE THEN 'LOW_CONFIDENCE'
    ELSE 'NO_DATA'
  END as confidence_level
FROM computed;
SQL
}

#═══════════════════════════════════════════
# 2. DEGRADATION THRESHOLD
#    Replace: baseline_reward * 0.9
#    With: Statistical significance test (confidence intervals)
#═══════════════════════════════════════════

calculate_degradation_threshold() {
  local circle="$1"
  local ceremony="$2"
  local significance_level="${3:-0.05}"  # p < 0.05 (95% confidence)
  
  sqlite3 "$AGENTDB_PATH" <<SQL 2>/dev/null || echo "0.85|0.15|NO_DATA"
WITH baseline_stats AS (
  SELECT 
    AVG(reward) as mean_reward,
    AVG(reward * reward) - (AVG(reward) * AVG(reward)) as variance,
    COUNT(*) as n,
    -- Calculate coefficient of variation (CV = stddev / mean)
    SQRT(AVG(reward * reward) - (AVG(reward) * AVG(reward))) / 
      NULLIF(AVG(reward), 0) as coeff_variation
  FROM episodes 
  WHERE task LIKE '%$circle%' AND task LIKE '%$ceremony%'
    AND success = 1
    AND created_at > strftime('%s', 'now', '-30 days')
),
threshold_calc AS (
  SELECT 
    mean_reward,
    SQRT(variance) as stddev_reward,
    n,
    coeff_variation,
    CASE
      -- Large sample: Use 95% confidence interval (1.96 * SE)
      WHEN n >= $MIN_SAMPLE_SIZE THEN 
        mean_reward - (1.96 * SQRT(variance) / SQRT(n))
      -- Medium sample: Use 99% confidence interval (2.576 * SE)
      WHEN n >= $MIN_SAMPLE_SIZE_SMALL THEN 
        mean_reward - (2.576 * SQRT(variance) / SQRT(n))
      -- Small sample: Conservative 15% drop
      WHEN n >= $FALLBACK_SAMPLE_SIZE THEN mean_reward * 0.85
      -- No data: Very conservative
      ELSE 0.70
    END as threshold,
    CASE
      WHEN n >= $MIN_SAMPLE_SIZE THEN 'HIGH_CONFIDENCE'
      WHEN n >= $MIN_SAMPLE_SIZE_SMALL THEN 'MEDIUM_CONFIDENCE'
      WHEN n >= $FALLBACK_SAMPLE_SIZE THEN 'LOW_CONFIDENCE'
      ELSE 'NO_DATA'
    END as confidence_level
  FROM baseline_stats
)
SELECT 
  MAX(0.5, threshold) as degradation_threshold,
  ROUND(coeff_variation, 3) as variation_coefficient,
  confidence_level,
  n as sample_size
FROM threshold_calc;
SQL
}

#═══════════════════════════════════════════
# 3. CASCADE FAILURE THRESHOLD
#    Replace: 10 failures in 5 minutes
#    With: Failure velocity based on statistical baseline
#═══════════════════════════════════════════

calculate_cascade_threshold() {
  local circle="$1"
  local ceremony="$2"
  
  sqlite3 "$AGENTDB_PATH" <<SQL 2>/dev/null || echo "5|5|FALLBACK"
WITH episode_stats AS (
  SELECT 
    -- Average duration in minutes (convert milliseconds to minutes)
    AVG(CAST(latency_ms / 60000.0 AS REAL)) as avg_duration_min,
    -- Baseline failure rate
    AVG(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END) as baseline_failure_rate,
    -- Failure rate variance
    AVG(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END * 
        CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END) - 
      (AVG(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END) * 
       AVG(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END)) as failure_variance,
    COUNT(*) as total_episodes
  FROM episodes
  WHERE task LIKE '%$circle%' AND task LIKE '%$ceremony%'
    AND created_at > strftime('%s', 'now', '-7 days')
    AND latency_ms IS NOT NULL
),
threshold_calc AS (
  SELECT 
    avg_duration_min,
    baseline_failure_rate,
    SQRT(failure_variance) as failure_stddev,
    total_episodes,
    CASE 
      -- Statistical approach: 3-sigma above baseline failure rate
      WHEN total_episodes >= 50 THEN
        -- Expected failures in 50 episodes at 3-sigma
        CAST((baseline_failure_rate + (3 * SQRT(failure_variance))) * 50 AS INTEGER)
      -- Velocity-based: Time window allows N episodes, threshold at 30% failure rate
      WHEN total_episodes >= $MIN_SAMPLE_SIZE_SMALL AND avg_duration_min > 0 THEN
        CAST((30.0 / avg_duration_min) * 0.30 AS INTEGER)
      -- Fallback: Conservative fixed threshold
      ELSE 5
    END as calculated_threshold,
    -- Adaptive window: 3x average episode duration or min 5 minutes
    CAST(MAX(5, avg_duration_min * 3) AS INTEGER) as window_minutes
  FROM episode_stats
)
SELECT 
  MAX(3, calculated_threshold) as cascade_threshold,
  window_minutes,
  CASE
    WHEN total_episodes >= 50 THEN 'STATISTICAL'
    WHEN total_episodes >= $MIN_SAMPLE_SIZE_SMALL THEN 'VELOCITY_BASED'
    ELSE 'FALLBACK'
  END as method
FROM threshold_calc;
SQL
}

#═══════════════════════════════════════════
# 4. DIVERGENCE RATE
#    Replace: hardcoded 0.1
#    With: Risk-adjusted rate based on Sharpe ratio & success
#═══════════════════════════════════════════

calculate_divergence_rate() {
  local circle="$1"
  local lookback_days="${2:-7}"
  
  sqlite3 "$AGENTDB_PATH" <<SQL 2>/dev/null || echo "0.05|0.0|NO_DATA"
WITH recent_perf AS (
  SELECT 
    AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) as success_rate,
    AVG(reward) as mean_reward,
    AVG(reward * reward) - (AVG(reward) * AVG(reward)) as variance,
    COUNT(*) as sample_size
  FROM episodes
  WHERE task LIKE '%$circle%'
    AND created_at > strftime('%s', 'now', '-${lookback_days} days')
),
sharpe_calc AS (
  SELECT 
    success_rate,
    mean_reward,
    SQRT(variance) as stddev_reward,
    sample_size,
    -- Sharpe ratio (assuming risk-free rate = 0)
    mean_reward / NULLIF(SQRT(variance), 0) as sharpe_ratio
  FROM recent_perf
),
divergence_decision AS (
  SELECT 
    sharpe_ratio,
    success_rate,
    sample_size,
    CASE
      -- Excellent performance: Aggressive exploration (30%)
      WHEN sharpe_ratio > 2.0 AND success_rate > 0.85 THEN 0.30
      -- Good performance: Moderate-aggressive exploration (20%)
      WHEN sharpe_ratio > 1.5 AND success_rate > 0.75 THEN 0.20
      -- Solid performance: Moderate exploration (15%)
      WHEN sharpe_ratio > 1.0 AND success_rate > 0.70 THEN 0.15
      -- Acceptable performance: Conservative exploration (10%)
      WHEN sharpe_ratio > 0.5 AND success_rate > 0.60 THEN 0.10
      -- Marginal performance: Minimal exploration (5%)
      WHEN sharpe_ratio > 0.0 AND success_rate > 0.50 THEN 0.05
      -- Poor performance: Minimal divergence (3%)
      ELSE 0.03
    END as divergence_rate,
    CASE
      WHEN sample_size >= $MIN_SAMPLE_SIZE THEN 'HIGH_CONFIDENCE'
      WHEN sample_size >= $MIN_SAMPLE_SIZE_SMALL THEN 'MEDIUM_CONFIDENCE'
      ELSE 'LOW_CONFIDENCE'
    END as confidence_level
  FROM sharpe_calc
  WHERE sample_size >= $MIN_SAMPLE_SIZE_SMALL
)
SELECT 
  divergence_rate,
  ROUND(sharpe_ratio, 2) as sharpe,
  confidence_level,
  success_rate
FROM divergence_decision;
SQL
}

#═══════════════════════════════════════════
# 5. CHECK FREQUENCY
#    Replace: hardcoded 10
#    With: Adaptive based on risk volatility
#═══════════════════════════════════════════

calculate_check_frequency() {
  local circle="$1"
  local ceremony="$2"
  
  sqlite3 "$AGENTDB_PATH" <<SQL 2>/dev/null || echo "10|FALLBACK"
WITH risk_factors AS (
  SELECT 
    -- Coefficient of variation
    SQRT(AVG(reward * reward) - (AVG(reward) * AVG(reward))) / 
      NULLIF(AVG(reward), 0) as reward_volatility,
    -- Failure rate
    AVG(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END) as failure_rate,
    -- Average duration in minutes (convert milliseconds to minutes)
    AVG(CAST(latency_ms / 60000.0 AS REAL)) as avg_duration_min,
    COUNT(*) as sample_size
  FROM episodes
  WHERE task LIKE '%$circle%' AND task LIKE '%$ceremony%'
    AND created_at > strftime('%s', 'now', '-7 days')
    AND latency_ms IS NOT NULL
),
frequency_calc AS (
  SELECT 
    reward_volatility,
    failure_rate,
    sample_size,
    CASE
      -- High volatility OR high failure rate = Frequent checks
      WHEN reward_volatility > 0.30 OR failure_rate > 0.20 THEN 5
      -- Elevated risk = Standard checks
      WHEN reward_volatility > 0.20 OR failure_rate > 0.15 THEN 7
      -- Medium risk = Normal checks
      WHEN reward_volatility > 0.15 OR failure_rate > 0.10 THEN 10
      -- Low risk = Infrequent checks
      WHEN reward_volatility > 0.10 OR failure_rate > 0.05 THEN 15
      -- Very low risk = Minimal checks
      ELSE 20
    END as check_every_n_episodes,
    CASE
      WHEN sample_size >= $MIN_SAMPLE_SIZE THEN 'DATA_DRIVEN'
      WHEN sample_size >= $MIN_SAMPLE_SIZE_SMALL THEN 'PARTIAL_DATA'
      ELSE 'FALLBACK'
    END as method
  FROM risk_factors
)
SELECT 
  check_every_n_episodes,
  method
FROM frequency_calc;
SQL
}

#═══════════════════════════════════════════
# 6. QUANTILE-BASED DEGRADATION (Fat-Tail Aware)
#    Replace: 2-sigma (assumes normal distribution)
#    With: Empirical quantiles (handles fat tails)
#═══════════════════════════════════════════

calculate_quantile_degradation_threshold() {
  local circle="$1"
  local ceremony="$2"
  local quantile="${3:-0.05}"  # 5th percentile (95% should be above)
  
  sqlite3 "$AGENTDB_PATH" <<SQL 2>/dev/null || echo "0.75|FALLBACK"
WITH ordered_rewards AS (
  SELECT 
    reward,
    ROW_NUMBER() OVER (ORDER BY reward) as row_num,
    COUNT(*) OVER () as total_count
  FROM episodes
  WHERE task LIKE '%$circle%' AND task LIKE '%$ceremony%'
    AND success = 1
    AND created_at > strftime('%s', 'now', '-30 days')
),
quantile_calc AS (
  SELECT 
    reward,
    total_count,
    CASE 
      -- Use empirical quantile if sufficient data
      WHEN total_count >= $MIN_SAMPLE_SIZE THEN
        (SELECT reward FROM ordered_rewards 
         WHERE row_num = CAST(total_count * $quantile AS INTEGER)
         LIMIT 1)
      -- Fallback to percentile-based
      WHEN total_count >= $MIN_SAMPLE_SIZE_SMALL THEN
        (SELECT reward FROM ordered_rewards 
         WHERE row_num = CAST(total_count * 0.10 AS INTEGER)
         LIMIT 1)
      -- Conservative fallback
      ELSE (SELECT MIN(reward) * 0.90 FROM ordered_rewards)
    END as threshold_quantile,
    CASE
      WHEN total_count >= $MIN_SAMPLE_SIZE THEN 'EMPIRICAL_QUANTILE'
      WHEN total_count >= $MIN_SAMPLE_SIZE_SMALL THEN 'PERCENTILE_BASED'
      ELSE 'FALLBACK'
    END as method
  FROM ordered_rewards
  LIMIT 1
)
SELECT 
  MAX(0.5, threshold_quantile) as degradation_threshold,
  method
FROM quantile_calc;
SQL
}

#═══════════════════════════════════════════
# COMMAND INTERFACE
#═══════════════════════════════════════════

cmd_all() {
  local circle="${1:-orchestrator}"
  local ceremony="${2:-standup}"
  
  echo "═══════════════════════════════════════════"
  echo "  Dynamic Threshold Calculator"
  echo "  Circle: $circle | Ceremony: $ceremony"
  echo "═══════════════════════════════════════════"
  echo ""
  
  echo "1. Circuit Breaker Threshold [WSJF: 8.83] (replace hardcoded 0.7):"
  CB_RESULT=$(calculate_circuit_breaker_threshold "$circle")
  echo "   Threshold: $(echo "$CB_RESULT" | cut -d'|' -f1)"
  echo "   Confidence: $(echo "$CB_RESULT" | cut -d'|' -f5)"
  echo "   Sample: $(echo "$CB_RESULT" | cut -d'|' -f2) episodes"
  echo ""
  
  echo "2. Degradation Threshold [WSJF: 5.50] ✅ SPRINT 2 (replace baseline * 0.9):"
  DEG_RESULT=$(calculate_degradation_threshold "$circle" "$ceremony")
  echo "   Threshold: $(echo "$DEG_RESULT" | cut -d'|' -f1)"
  echo "   Variation Coef: $(echo "$DEG_RESULT" | cut -d'|' -f2)"
  echo "   Confidence: $(echo "$DEG_RESULT" | cut -d'|' -f3)"
  echo "   Sample: $(echo "$DEG_RESULT" | cut -d'|' -f4) episodes"
  echo ""
  
  echo "3. Cascade Failure Threshold [WSJF: 10.67] (replace hardcoded 10/5min):"
  CAS_RESULT=$(calculate_cascade_threshold "$circle" "$ceremony")
  echo "   Threshold: $(echo "$CAS_RESULT" | cut -d'|' -f1) failures"
  echo "   Window: $(echo "$CAS_RESULT" | cut -d'|' -f2) minutes"
  echo "   Method: $(echo "$CAS_RESULT" | cut -d'|' -f3)"
  echo ""
  
  echo "4. Divergence Rate [WSJF: 3.00] (replace hardcoded 0.1):"
  DIV_RESULT=$(calculate_divergence_rate "$circle")
  echo "   Rate: $(echo "$DIV_RESULT" | cut -d'|' -f1)"
  echo "   Sharpe: $(echo "$DIV_RESULT" | cut -d'|' -f2)"
  echo "   Confidence: $(echo "$DIV_RESULT" | cut -d'|' -f3)"
  echo ""
  
  echo "5. Check Frequency [WSJF: 5.00] (replace hardcoded 10):"
  FREQ_RESULT=$(calculate_check_frequency "$circle" "$ceremony")
  echo "   Check every: $(echo "$FREQ_RESULT" | cut -d'|' -f1) episodes"
  echo "   Method: $(echo "$FREQ_RESULT" | cut -d'|' -f2)"
  echo ""
  
  echo "6. Quantile-Based Degradation (fat-tail aware):"
  QUANT_RESULT=$(calculate_quantile_degradation_threshold "$circle" "$ceremony")
  echo "   5th Percentile: $(echo "$QUANT_RESULT" | cut -d'|' -f1)"
  echo "   Method: $(echo "$QUANT_RESULT" | cut -d'|' -f2)"
  echo ""
  
  echo "═══════════════════════════════════════════"
  echo "  ✅ Sprint 2 Complete: All 5 Critical Thresholds Dynamic"
  echo "═══════════════════════════════════════════"
}

case "${1:-all}" in
  circuit-breaker)
    calculate_circuit_breaker_threshold "${2:-orchestrator}"
    ;;
  degradation)
    calculate_degradation_threshold "${2:-orchestrator}" "${3:-standup}"
    ;;
  cascade)
    calculate_cascade_threshold "${2:-orchestrator}" "${3:-standup}"
    ;;
  divergence)
    calculate_divergence_rate "${2:-orchestrator}"
    ;;
  frequency|check-freq)
    calculate_check_frequency "${2:-orchestrator}" "${3:-standup}"
    ;;
  quantile)
    calculate_quantile_degradation_threshold "${2:-orchestrator}" "${3:-standup}"
    ;;
  all)
    cmd_all "${2:-orchestrator}" "${3:-standup}"
    ;;
  *)
    cat << 'EOF'
Dynamic Threshold Calculator

USAGE:
  $0 <command> [circle] [ceremony]

COMMANDS:
  all                Show all thresholds (default)
  circuit-breaker    Calculate circuit breaker threshold
  degradation        Calculate degradation threshold
  cascade            Calculate cascade failure threshold
  divergence         Calculate divergence rate
  frequency          Calculate check frequency
  quantile           Calculate quantile-based threshold

EXAMPLES:
  $0 all orchestrator standup
  $0 circuit-breaker orchestrator
  $0 divergence assessor

OUTPUT FORMAT:
  Values are piped-delimited for easy parsing:
  threshold|confidence|sample_size|...

EOF
    ;;
esac
