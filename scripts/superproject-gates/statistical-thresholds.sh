#!/usr/bin/env bash
# Learned thresholds helpers (SQLite-based, best-effort). Safe fallbacks on errors.
# Functions:
#   get_circuit_breaker <circle> <ceremony> <db_path>
#   get_equity_threshold <db_path>
#   get_wsjf_scores <circle> <db_path>

get_circuit_breaker() {
  local circle="$1"; local ceremony="$2"; local db="${3:-agentdb.db}"
  if [ ! -f "$db" ]; then echo "0.70"; return; fi
  local avg
  if [ -n "$circle" ]; then
    avg=$(sqlite3 "$db" "SELECT ROUND(AVG(reward),2) FROM episodes WHERE json_extract(metadata,'$.circle')='$circle' AND created_at > datetime('now','-30 days');" 2>/dev/null || echo "0.70")
  else
    avg=$(sqlite3 "$db" "SELECT ROUND(AVG(reward),2) FROM episodes WHERE created_at > datetime('now','-30 days');" 2>/dev/null || echo "0.70")
  fi
  [ -z "$avg" ] && avg=0.70
  # simple conservative threshold: avg - 0.15, clamped [0.30,0.95]
  awk -v a="$avg" 'BEGIN{t=a-0.15; if(t<0.30)t=0.30; if(t>0.95)t=0.95; printf "%.2f", t}'
}

get_equity_threshold() {
  local db="${1:-agentdb.db}"
  if [ ! -f "$db" ]; then echo "70|0|0"; return; fi
  # variance of completion_pct across all completion_episodes
  local stats
  stats=$(sqlite3 "$db" "SELECT COALESCE(AVG(completion_pct),0), COALESCE(AVG(completion_pct*completion_pct),0), COUNT(*) FROM completion_episodes WHERE timestamp > strftime('%s','now')*1000 - 86400000;" 2>/dev/null || echo "0|0|0")
  IFS='|' read -r mean sq n <<<"${stats//|/|}"
  mean=${mean:-0}; sq=${sq:-0}; n=${n:-0}
  # variance approx
  var=$(awk -v m="$mean" -v s="$sq" 'BEGIN{print (s - m*m)}')
  # coefficient proxy
  cv=$(awk -v m="$mean" -v v="$var" 'BEGIN{ if(m==0){print 0}else{print sqrt(v)/m}}' 2>/dev/null || echo 0)
  # map to threshold ~70..85 depending on stability
  thr=$(awk -v c="$cv" 'BEGIN{t=85 - (c*20); if(t<65)t=65; if(t>90)t=90; print int(t)}')
  echo "$thr|$cv|$n"
}

get_wsjf_scores() {
  local circle="$1"; local db="${2:-agentdb.db}"
  if [ ! -f "$db" ]; then echo "5.0|5.0|5.0|0|0.0"; return; fi
  local ep succ
  ep=$(sqlite3 "$db" "SELECT COUNT(*) FROM episodes WHERE json_extract(metadata,'$.circle')='$circle';" 2>/dev/null || echo 0)
  succ=$(sqlite3 "$db" "SELECT COUNT(*) FROM episodes WHERE json_extract(metadata,'$.circle')='$circle' AND success=1;" 2>/dev/null || echo 0)
  local sr="0.0"; if [ "$ep" -gt 0 ]; then sr=$(awk -v s="$succ" -v e="$ep" 'BEGIN{printf "%.2f", s/e}') ; fi
  # business value inversely to success rate; time criticality lower with more episodes; fixed risk reduction
  local bv tc rr
  bv=$(awk -v x="$sr" 'BEGIN{printf "%.1f", (1.0 - x) * 10}')
  if [ "$ep" -lt 10 ]; then tc=10.0; elif [ "$ep" -lt 50 ]; then tc=7.0; else tc=5.0; fi
  rr=5.0
  echo "$bv|$tc|$rr|$ep|$sr"
}

#!/usr/bin/env bash
# statistical-thresholds.sh - Dynamic, statistically-grounded threshold calculations
# Replaces hardcoded values with data-driven, risk-adjusted thresholds

# ============================================================================
# 1. Circuit Breaker Threshold (Dynamic)
# ============================================================================
# OLD: Fixed 0.7 threshold
# NEW: Adaptive threshold based on recent performance and volatility
calculate_circuit_breaker_threshold() {
    local circle="$1"
    local ceremony="${2:-}"
    local db_path="${3:-./agentdb.db}"
    
    # Build WHERE clause
    # Note: circle is stored in metadata JSON, not as a direct column
    local where_clause="json_extract(metadata, '\$.circle') = '$circle' AND success=1 AND created_at > datetime('now', '-30 days')"
    if [ -n "$ceremony" ]; then
        where_clause="$where_clause AND task LIKE '%$ceremony%'"
    fi
    
    local result=$(sqlite3 "$db_path" <<SQL
WITH recent_stats AS (
  SELECT 
    AVG(reward) as mean_reward,
    (AVG(reward * reward) - AVG(reward) * AVG(reward)) as variance,
    COUNT(*) as sample_size
  FROM episodes 
  WHERE $where_clause
)
SELECT 
  CASE 
    -- Sufficient sample: Use 2.5 sigma (covers 98.8% of normal distribution)
    WHEN sample_size >= 30 THEN 
      mean_reward - (2.5 * SQRT(variance))
    -- Medium sample: More conservative (3 sigma)
    WHEN sample_size >= 10 THEN 
      mean_reward - (3.0 * SQRT(variance))
    -- Small sample: Very conservative fallback
    ELSE 0.5
  END as threshold,
  mean_reward,
  SQRT(variance) as stddev,
  sample_size
FROM recent_stats;
SQL
)
    
    echo "$result"
}

# ============================================================================
# 2. Degradation Threshold (Statistically Significant)
# ============================================================================
# OLD: baseline * 0.9 (arbitrary 10%)
# NEW: Confidence interval based on sample size and variance
calculate_degradation_threshold() {
    local circle="$1"
    local ceremony="$2"
    local db_path="${3:-./agentdb.db}"
    
    local result=$(sqlite3 "$db_path" <<SQL
WITH stats AS (
  SELECT 
    AVG(reward) as mean_reward,
    SQRT(AVG(reward * reward) - AVG(reward) * AVG(reward)) as stddev_reward,
    COUNT(*) as n
  FROM episodes 
  WHERE json_extract(metadata, '\$.circle') = '$circle'
    AND task LIKE '%$ceremony%'
    AND success=1
    AND created_at > datetime('now', '-30 days')
)
SELECT 
  CASE
    -- Large sample: 95% confidence interval (1.96 * SE)
    WHEN n >= 30 THEN 
      mean_reward - (1.96 * stddev_reward / SQRT(n))
    -- Medium sample: 97.5% confidence (2.24 * SE)  
    WHEN n >= 10 THEN 
      mean_reward - (2.24 * stddev_reward / SQRT(n))
    -- Small sample: Conservative 15% drop
    ELSE mean_reward * 0.85
  END as threshold,
  mean_reward,
  stddev_reward,
  stddev_reward / NULLIF(mean_reward, 0) as coeff_variation,
  n as sample_size
FROM stats;
SQL
)
    
    echo "$result"
}

# ============================================================================
# 3. Cascade Failure Threshold (Velocity & Rate Based)
# ============================================================================
# OLD: 10 failures in 5 minutes (absolute count)
# NEW: Failure velocity with statistical significance
calculate_cascade_threshold() {
    local circle="$1"
    local ceremony="$2"
    local db_path="${3:-./agentdb.db}"
    
    local result=$(sqlite3 "$db_path" <<SQL
WITH episode_stats AS (
  SELECT 
    AVG(CAST((julianday(metadata->>'completed_at') - julianday(created_at)) * 1440 AS REAL)) as avg_duration_min,
    AVG(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END) as baseline_failure_rate,
    SQRT(AVG(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END) * 
         (1 - AVG(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END))) as failure_stddev,
    COUNT(*) as total_episodes
  FROM episodes
  WHERE json_extract(metadata, '\$.circle') = '$circle'
    AND task LIKE '%$ceremony%'
    AND created_at > datetime('now', '-7 days')
)
SELECT 
  CASE 
    -- Statistical approach: 3 sigma above baseline (99.7% confidence)
    WHEN total_episodes >= 50 THEN
      CAST((baseline_failure_rate + (3.0 * failure_stddev)) * 50 AS INTEGER)
    -- Velocity-based with safety factor (5 min window)
    ELSE
      CAST((300.0 / NULLIF(avg_duration_min, 0)) * 1.5 AS INTEGER)
  END as threshold,
  CAST(COALESCE(avg_duration_min * 3, 5) AS INTEGER) as window_minutes,
  baseline_failure_rate,
  total_episodes
FROM episode_stats;
SQL
)
    
    # Ensure minimums
    local threshold=$(echo "$result" | cut -d'|' -f1)
    local window=$(echo "$result" | cut -d'|' -f2)
    
    # Apply floor values
    threshold=${threshold:-5}
    if [ "$threshold" -lt 3 ]; then threshold=3; fi
    
    window=${window:-5}
    if [ "$window" -lt 3 ]; then window=3; fi
    
    echo "${threshold}|${window}|$(echo "$result" | cut -d'|' -f3-)"
}

# ============================================================================
# 4. Divergence Rate (Risk-Adjusted)
# ============================================================================
# OLD: 0.05 + (0.25 * stability) - linear assumption
# NEW: Sharpe ratio + success rate based exploration
calculate_divergence_rate() {
    local circle="$1"
    local db_path="${2:-./agentdb.db}"
    
    local result=$(sqlite3 "$db_path" <<SQL
WITH recent_perf AS (
  SELECT 
    AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) as success_rate,
    AVG(reward) as mean_reward,
    SQRT(AVG(reward * reward) - AVG(reward) * AVG(reward)) as stddev_reward,
    COUNT(*) as sample_size
  FROM episodes
  WHERE json_extract(metadata, '\$.circle') = '$circle'
    AND created_at > datetime('now', '-7 days')
),
sharpe AS (
  SELECT 
    success_rate,
    mean_reward,
    stddev_reward,
    (mean_reward / NULLIF(stddev_reward, 0)) as sharpe_ratio,
    sample_size
  FROM recent_perf
)
SELECT 
  CASE
    -- High Sharpe + High Success = Aggressive exploration (30%)
    WHEN sharpe_ratio > 2.0 AND success_rate > 0.85 THEN 0.30
    -- Good Sharpe + Good Success = Moderate exploration (15%)
    WHEN sharpe_ratio > 1.0 AND success_rate > 0.70 THEN 0.15
    -- Fair performance = Conservative exploration (8%)
    WHEN sharpe_ratio > 0.5 AND success_rate > 0.50 THEN 0.08
    -- Poor performance = Minimal divergence (3%)
    ELSE 0.03
  END as divergence_rate,
  success_rate,
  sharpe_ratio,
  sample_size
FROM sharpe
WHERE sample_size >= 10;
SQL
)
    
    # Fallback to conservative default if no data
    if [ -z "$result" ]; then
        echo "0.05|0.0|0.0|0"
    else
        echo "$result"
    fi
}

# ============================================================================
# 5. Check Frequency (Adaptive Monitoring)
# ============================================================================
# OLD: 20 / (1 + risk) - needs validation
# NEW: Based on volatility and failure rate
calculate_check_frequency() {
    local circle="$1"
    local ceremony="$2"
    local db_path="${3:-./agentdb.db}"
    
    local result=$(sqlite3 "$db_path" <<SQL
WITH risk_factors AS (
  SELECT 
    SQRT(AVG(reward * reward) - AVG(reward) * AVG(reward)) / NULLIF(AVG(reward), 0) as reward_volatility,
    AVG(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END) as failure_rate,
    AVG(CAST((julianday(metadata->>'completed_at') - julianday(created_at)) * 1440 AS REAL)) as avg_duration_min
  FROM episodes
  WHERE json_extract(metadata, '\$.circle') = '$circle'
    AND task LIKE '%$ceremony%'
    AND created_at > datetime('now', '-7 days')
)
SELECT 
  CASE
    -- High volatility OR high failure rate = Check frequently
    WHEN reward_volatility > 0.3 OR failure_rate > 0.2 THEN 5
    -- Medium risk = Standard checking
    WHEN reward_volatility > 0.15 OR failure_rate > 0.1 THEN 10
    -- Low risk = Infrequent checking
    ELSE 15
  END as check_every_n_episodes,
  reward_volatility,
  failure_rate
FROM risk_factors;
SQL
)
    
    # Fallback
    if [ -z "$result" ]; then
        echo "10|0.0|0.0"
    else
        echo "$result"
    fi
}

# ============================================================================
# 6. Quantile-Based Thresholds (for fat-tailed distributions)
# ============================================================================
# For non-normal distributions (financial returns, etc.)
calculate_quantile_threshold() {
    local circle="$1"
    local ceremony="$2"
    local percentile="${3:-5}"  # 5th percentile by default (95% confidence)
    local db_path="${4:-./agentdb.db}"
    
    local result=$(sqlite3 "$db_path" <<SQL
WITH ordered_rewards AS (
  SELECT 
    reward,
    ROW_NUMBER() OVER (ORDER BY reward) as row_num,
    COUNT(*) OVER () as total_count
  FROM episodes
  WHERE json_extract(metadata, '\$.circle') = '$circle'
    AND task LIKE '%$ceremony%'
    AND success=1
    AND created_at > datetime('now', '-30 days')
)
SELECT 
  reward as threshold,
  total_count as sample_size
FROM ordered_rewards
WHERE row_num = CAST(total_count * ($percentile / 100.0) AS INTEGER)
LIMIT 1;
SQL
)
    
    echo "$result"
}

# ============================================================================
# Helper: Get Confidence Interval
# ============================================================================
get_confidence_interval() {
    local mean="$1"
    local stddev="$2"
    local n="$3"
    local confidence="${4:-0.95}"  # 95% default
    
    # Calculate z-score for confidence level
    local z_score
    case "$confidence" in
        0.90) z_score=1.645 ;;
        0.95) z_score=1.96 ;;
        0.99) z_score=2.576 ;;
        *) z_score=1.96 ;;  # Default to 95%
    esac
    
    # Calculate margin of error: z * (σ / √n)
    local margin=$(echo "scale=4; $z_score * ($stddev / sqrt($n))" | bc -l)
    local lower=$(echo "scale=4; $mean - $margin" | bc -l)
    local upper=$(echo "scale=4; $mean + $margin" | bc -l)
    
    echo "${lower}|${upper}|${margin}"
}

# ============================================================================
# Example Usage
# ============================================================================
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    # Test mode
    circle="${1:-orchestrator}"
    ceremony="${2:-standup}"
    
    echo "=== Statistical Thresholds for $circle/$ceremony ==="
    echo ""
    
    echo "1. Circuit Breaker:"
    result=$(calculate_circuit_breaker_threshold "$circle" "$ceremony")
    echo "   Threshold: $(echo "$result" | cut -d'|' -f1)"
    echo "   Mean: $(echo "$result" | cut -d'|' -f2)"
    echo "   StdDev: $(echo "$result" | cut -d'|' -f3)"
    echo "   Sample: $(echo "$result" | cut -d'|' -f4)"
    echo ""
    
    echo "2. Degradation Threshold:"
    result=$(calculate_degradation_threshold "$circle" "$ceremony")
    echo "   Threshold: $(echo "$result" | cut -d'|' -f1)"
    echo "   Mean: $(echo "$result" | cut -d'|' -f2)"
    echo "   Coeff of Variation: $(echo "$result" | cut -d'|' -f4)"
    echo ""
    
    echo "3. Cascade Threshold:"
    result=$(calculate_cascade_threshold "$circle" "$ceremony")
    echo "   Failure Threshold: $(echo "$result" | cut -d'|' -f1) failures"
    echo "   Window: $(echo "$result" | cut -d'|' -f2) minutes"
    echo "   Baseline Rate: $(echo "$result" | cut -d'|' -f3)"
    echo ""
    
    echo "4. Divergence Rate:"
    result=$(calculate_divergence_rate "$circle")
    echo "   Rate: $(echo "$result" | cut -d'|' -f1)"
    echo "   Success Rate: $(echo "$result" | cut -d'|' -f2)"
    echo "   Sharpe Ratio: $(echo "$result" | cut -d'|' -f3)"
    echo ""
    
    echo "5. Check Frequency:"
    result=$(calculate_check_frequency "$circle" "$ceremony")
    echo "   Check every: $(echo "$result" | cut -d'|' -f1) episodes"
    echo "   Volatility: $(echo "$result" | cut -d'|' -f2)"
    echo "   Failure Rate: $(echo "$result" | cut -d'|' -f3)"
fi

# ============================================================================
# Convenience Wrappers (match documentation naming)
# ============================================================================

get_circuit_breaker() {
    local circle="$1"
    local ceremony="${2:-}"
    local db_path="${3:-./agentdb.db}"
    calculate_circuit_breaker_threshold "$circle" "$ceremony" "$db_path" | cut -d'|' -f1
}

get_degradation_threshold() {
    local circle="$1"
    local ceremony="$2"
    local db_path="${3:-./agentdb.db}"
    calculate_degradation_threshold "$circle" "$ceremony" "$db_path"
}

get_cascade_threshold() {
    local circle="$1"
    local ceremony="$2"
    local db_path="${3:-./agentdb.db}"
    calculate_cascade_threshold "$circle" "$ceremony" "$db_path"
}

get_divergence() {
    local circle="$1"
    local db_path="${2:-./agentdb.db}"
    calculate_divergence_rate "$circle" "$db_path"
}

get_wsjf_scores() {
    local circle="$1"
    local db_path="${2:-./agentdb.db}"
    calculate_wsjf_scores "$circle" "$db_path"
}

get_equity_threshold() {
    local db_path="${1:-./agentdb.db}"
    calculate_equity_threshold "$db_path"
}

# ============================================================================
# 7. WSJF Component Scores (Data-Driven)
# ============================================================================
# OLD: Fixed time_criticality=5.0, risk_reduction=5.0
# NEW: Calculate from historical episode metrics
calculate_wsjf_scores() {
    local circle="$1"
    local db_path="${2:-./agentdb.db}"
    
    local result=$(sqlite3 "$db_path" <<SQL
WITH circle_episodes AS (
  SELECT 
    created_at,
    success,
    reward,
    json_extract(metadata, '\$.circle') as circle
  FROM episodes
  WHERE json_extract(metadata, '\$.circle') = '$circle'
    AND created_at > datetime('now', '-30 days')
  ORDER BY created_at
),
intervals AS (
  SELECT 
    (julianday(created_at) - julianday((SELECT created_at FROM circle_episodes e2 
      WHERE e2.created_at < e1.created_at ORDER BY created_at DESC LIMIT 1))) * 1440 as interval_minutes
  FROM circle_episodes e1
  WHERE created_at > (SELECT MIN(created_at) FROM circle_episodes)
),
circle_metrics AS (
  SELECT 
    AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) as success_rate,
    COUNT(*) as episode_count,
    AVG(reward) as avg_reward,
    SQRT(AVG(reward * reward) - AVG(reward) * AVG(reward)) as stddev_reward,
    MAX(created_at) as last_run,
    (SELECT AVG(interval_minutes) FROM intervals) as avg_interval_minutes
  FROM circle_episodes
)
SELECT 
  -- Business Value: Inverse success rate weighted by episode count
  ROUND((1.0 - success_rate) * 10 * (1 + LOG(episode_count + 1) / 3), 2) as business_value,
  
  -- Time Criticality: Based on recency and velocity
  ROUND(
    CASE
      WHEN julianday('now') - julianday(last_run) > 7 THEN 10.0
      WHEN julianday('now') - julianday(last_run) > 3 THEN 7.0
      WHEN julianday('now') - julianday(last_run) > 1 THEN 5.0
      ELSE 3.0
    END * (1.0 + (10.0 / NULLIF(avg_interval_minutes, 0.1))),
  2) as time_criticality,
  
  -- Risk Reduction: Based on reward volatility and failure rate
  ROUND(
    (stddev_reward / NULLIF(avg_reward, 0.1)) * 10 + (1.0 - success_rate) * 5,
  2) as risk_reduction,
  
  episode_count,
  success_rate
FROM circle_metrics;
SQL
)
    
    # Fallback if no data
    if [ -z "$result" ]; then
        echo "5.0|5.0|5.0|0|0"
        return 0
    fi
    
    # Parse and bound to [1-10]
    local bv tc rr ep_count sr
    bv=$(echo "$result" | cut -d'|' -f1)
    tc=$(echo "$result" | cut -d'|' -f2)
    rr=$(echo "$result" | cut -d'|' -f3)
    ep_count=$(echo "$result" | cut -d'|' -f4)
    sr=$(echo "$result" | cut -d'|' -f5)
    
    # Bound values to [1-10]
    bv=$(echo "$bv" | awk '{if ($1 > 10) print 10; else if ($1 < 1) print 1; else print $1}')
    tc=$(echo "$tc" | awk '{if ($1 > 10) print 10; else if ($1 < 1) print 1; else print $1}')
    rr=$(echo "$rr" | awk '{if ($1 > 10) print 10; else if ($1 < 1) print 1; else print $1}')
    
    echo "${bv}|${tc}|${rr}|${ep_count}|${sr}"
}

# ============================================================================
# 8. Equity Threshold (Adaptive to Circle Heterogeneity)
# ============================================================================
# OLD: Fixed MIN_EQUITY_SCORE=70
# NEW: Adapt based on circle usage patterns
calculate_equity_threshold() {
    local db_path="${1:-./agentdb.db}"
    
    local result=$(sqlite3 "$db_path" <<SQL
WITH circle_specialization AS (
  SELECT 
    json_extract(metadata, '\$.circle') as circle,
    COUNT(*) as episode_count,
    AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) as success_rate
  FROM episodes
  WHERE created_at > datetime('now', '-30 days')
  GROUP BY json_extract(metadata, '\$.circle')
),
specialization_metrics AS (
  SELECT 
    AVG(episode_count) as mean_episodes,
    SQRT(AVG((episode_count - (SELECT AVG(episode_count) FROM circle_specialization)) * 
             (episode_count - (SELECT AVG(episode_count) FROM circle_specialization)))) as stddev_episodes,
    AVG(success_rate) as mean_success,
    SQRT(AVG((success_rate - (SELECT AVG(success_rate) FROM circle_specialization)) * 
             (success_rate - (SELECT AVG(success_rate) FROM circle_specialization)))) as stddev_success
  FROM circle_specialization
)
SELECT 
  CASE
    -- Low heterogeneity = Strict equity requirement
    WHEN (stddev_episodes / NULLIF(mean_episodes, 1)) < 0.3 
         AND (stddev_success / NULLIF(mean_success, 0.01)) < 0.2 THEN 80
    -- Medium heterogeneity = Moderate equity requirement
    WHEN (stddev_episodes / NULLIF(mean_episodes, 1)) < 0.6 
         AND (stddev_success / NULLIF(mean_success, 0.01)) < 0.4 THEN 65
    -- High heterogeneity = Relaxed equity (allow specialization)
    ELSE 50
  END as min_equity_score,
  stddev_episodes / NULLIF(mean_episodes, 1) as episode_cv,
  stddev_success / NULLIF(mean_success, 0.01) as performance_cv
FROM specialization_metrics;
SQL
)
    
    # Fallback
    if [ -z "$result" ]; then
        echo "70|0|0"
    else
        echo "$result"
    fi
}

# Export convenience wrappers
export -f get_circuit_breaker
export -f get_degradation_threshold
export -f get_cascade_threshold
export -f get_divergence
export -f get_wsjf_scores
export -f get_equity_threshold
