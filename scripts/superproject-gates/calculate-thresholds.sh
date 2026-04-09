#!/usr/bin/env bash
# calculate-thresholds.sh - Dynamic percentile-based thresholds
# Works with actual AgentDB schema (no circle/ceremony columns, no STDEV function)

set -euo pipefail

COMMAND="${1:-all}"
DB_PATH="${2:-./agentdb.db}"

if [ ! -f "$DB_PATH" ]; then
    echo "❌ Database not found: $DB_PATH" >&2
    exit 1
fi

# Enable WAL mode for better concurrent read performance
sqlite3 "$DB_PATH" "PRAGMA journal_mode=WAL;" >/dev/null 2>&1 || true

# ============================================================================
# Helper: Calculate percentile using ORDER BY + LIMIT
# ============================================================================

get_percentile() {
    local percentile=$1
    local filter_clause=${2:-"success=1"}
    local retries=3
    local delay=1
    
    for ((i=1; i<=retries; i++)); do
        result=$(sqlite3 "$DB_PATH" 2>&1 <<SQL
WITH ordered AS (
    SELECT reward
    FROM episodes
    WHERE $filter_clause
    ORDER BY reward
),
counts AS (
    SELECT COUNT(*) as total FROM ordered
)
SELECT reward
FROM ordered
LIMIT 1
OFFSET (SELECT CAST(total * $percentile AS INTEGER) FROM counts);
SQL
)
        if [[ $? -eq 0 && ! "$result" =~ "database is locked" ]]; then
            echo "$result"
            return 0
        fi
        echo "⚠️  Database locked, retry $i/$retries..." >&2
        sleep $delay
        delay=$((delay * 2))
    done
    echo "❌ Failed after $retries retries" >&2
    return 1
}

# ============================================================================
# Helper: Calculate variance/stddev manually (SQLite has no STDEV)
# ============================================================================

get_stats() {
    local filter_clause=${1:-"success=1"}
    
    sqlite3 "$DB_PATH" <<SQL
WITH data AS (
    SELECT 
        reward,
        COUNT(*) OVER () as n,
        AVG(reward) OVER () as mean
    FROM episodes
    WHERE $filter_clause
)
SELECT 
    mean,
    SQRT(AVG((reward - mean) * (reward - mean))) as stddev,
    MIN(reward) as min_r,
    MAX(reward) as max_r,
    n
FROM data
LIMIT 1;
SQL
}

# ============================================================================
# Helper: Get recent success rate
# ============================================================================

get_success_rate() {
    local lookback_days=${1:-7}
    
    sqlite3 "$DB_PATH" <<SQL
SELECT 
    CAST(SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) AS REAL) / COUNT(*) as rate
FROM episodes
WHERE created_at > (unixepoch('now') - ($lookback_days * 86400));
SQL
}

# ============================================================================
# 1. CIRCUIT BREAKER THRESHOLD
# ============================================================================

calculate_circuit_breaker() {
    echo "🔍 Calculating circuit breaker threshold..." >&2
    
    # Get basic stats
    local stats=$(get_stats "success=1 AND created_at > (unixepoch('now') - (30 * 86400))")
    local mean=$(echo "$stats" | cut -d'|' -f1)
    local stddev=$(echo "$stats" | cut -d'|' -f2)
    local min_r=$(echo "$stats" | cut -d'|' -f3)
    local max_r=$(echo "$stats" | cut -d'|' -f4)
    local n=$(echo "$stats" | cut -d'|' -f5)
    
    echo "   Mean: $mean, StdDev: $stddev, n: $n" >&2
    
    # Check if distribution is degenerate (all same value)
    local range=$(echo "$max_r - $min_r" | bc)
    
    if [ -z "$stddev" ] || [ -z "$mean" ]; then
        echo "0.85" # Safe fallback
        return
    fi
    
    # If variance is near zero, use 5th percentile
    if (( $(echo "$range < 0.01" | bc -l) )); then
        echo "   Degenerate distribution detected, using P05" >&2
        get_percentile 0.05 "success=1 AND created_at > (unixepoch('now') - (30 * 86400))"
    else
        # Use mean - 2.5*sigma for normal-ish distributions
        if [ "$n" -ge 30 ]; then
            echo "$mean - (2.5 * $stddev)" | bc
        else
            echo "$mean - (3.0 * $stddev)" | bc
        fi
    fi
}

# ============================================================================
# 2. DEGRADATION THRESHOLD
# ============================================================================

calculate_degradation() {
    echo "🔍 Calculating degradation threshold..." >&2
    
    local stats=$(get_stats "success=1 AND created_at > (unixepoch('now') - (30 * 86400))")
    local mean=$(echo "$stats" | cut -d'|' -f1)
    local stddev=$(echo "$stats" | cut -d'|' -f2)
    local n=$(echo "$stats" | cut -d'|' -f5)
    
    if [ -z "$stddev" ] || [ -z "$mean" ] || [ "$n" -lt 5 ]; then
        echo "0.85" # Conservative fallback
        return
    fi
    
    # Standard error of mean
    local se=$(echo "$stddev / sqrt($n)" | bc -l)
    
    # Use confidence interval approach
    if [ "$n" -ge 30 ]; then
        # Large sample: 95% CI (1.96 * SE)
        echo "$mean - (1.96 * $se)" | bc
    elif [ "$n" -ge 10 ]; then
        # Medium sample: More conservative
        echo "$mean - (2.5 * $se)" | bc
    else
        # Small sample: Use 15% below mean
        echo "$mean * 0.85" | bc
    fi
}

# ============================================================================
# 3. CASCADE FAILURE THRESHOLD
# ============================================================================

calculate_cascade() {
    echo "🔍 Calculating cascade failure threshold..." >&2
    
    # Get failure statistics
    local failure_stats=$(sqlite3 "$DB_PATH" <<SQL
SELECT 
    AVG(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END) as failure_rate,
    COUNT(*) as total
FROM episodes
WHERE created_at > (unixepoch('now') - (7 * 86400));
SQL
)
    
    local failure_rate=$(echo "$failure_stats" | cut -d'|' -f1)
    local total=$(echo "$failure_stats" | cut -d'|' -f2)
    
    if [ -z "$failure_rate" ] || [ "$total" -lt 10 ]; then
        echo "5" # Conservative minimum
        return
    fi
    
    # Calculate threshold as 3-sigma above baseline
    local baseline_failures=$(echo "$failure_rate * 50" | bc -l)
    local failure_stddev=$(echo "sqrt($failure_rate * (1 - $failure_rate) * 50)" | bc -l)
    local threshold=$(echo "$baseline_failures + (3 * $failure_stddev)" | bc -l)
    
    # Round and ensure minimum
    local int_threshold=$(printf "%.0f" "$threshold")
    if [ "$int_threshold" -lt 5 ]; then
        echo "5"
    else
        echo "$int_threshold"
    fi
}

# ============================================================================
# 4. DIVERGENCE RATE (Risk-Adjusted)
# ============================================================================

calculate_divergence() {
    echo "🔍 Calculating divergence rate..." >&2
    
    local stats=$(get_stats "created_at > (unixepoch('now') - (7 * 86400))")
    local mean=$(echo "$stats" | cut -d'|' -f1)
    local stddev=$(echo "$stats" | cut -d'|' -f2)
    local n=$(echo "$stats" | cut -d'|' -f5)
    
    local success_rate=$(get_success_rate 7)
    
    if [ -z "$mean" ] || [ -z "$stddev" ] || [ "$n" -lt 10 ]; then
        echo "0.05" # Conservative default
        return
    fi
    
    # Calculate Sharpe ratio (mean / stddev)
    local sharpe=$(echo "$mean / $stddev" | bc -l)
    
    # Calculate coefficient of variation
    local cv=$(echo "$stddev / $mean" | bc -l)
    
    echo "   Success rate: $success_rate, Sharpe: $sharpe, CV: $cv" >&2
    
    # Decision tree for divergence rate
    if (( $(echo "$sharpe > 2.0 && $success_rate > 0.85" | bc -l) )); then
        echo "0.30" # Aggressive exploration
    elif (( $(echo "$sharpe > 1.0 && $success_rate > 0.70" | bc -l) )); then
        echo "0.15" # Moderate exploration
    elif (( $(echo "$sharpe > 0.5 && $success_rate > 0.50" | bc -l) )); then
        echo "0.08" # Conservative exploration
    elif (( $(echo "$cv > 0.5" | bc -l) )); then
        echo "0.05" # High volatility = reduce divergence
    else
        echo "0.03" # Minimal divergence
    fi
}

# ============================================================================
# 5. CHECK FREQUENCY
# ============================================================================

calculate_check_frequency() {
    echo "🔍 Calculating check frequency..." >&2
    
    local stats=$(get_stats "created_at > (unixepoch('now') - (7 * 86400))")
    local mean=$(echo "$stats" | cut -d'|' -f1)
    local stddev=$(echo "$stats" | cut -d'|' -f2)
    
    local failure_rate=$(sqlite3 "$DB_PATH" <<SQL
SELECT AVG(CASE WHEN success = 0 THEN 1.0 ELSE 0.0 END)
FROM episodes
WHERE created_at > (unixepoch('now') - (7 * 86400));
SQL
)
    
    if [ -z "$mean" ] || [ -z "$stddev" ]; then
        echo "10" # Default
        return
    fi
    
    local cv=$(echo "$stddev / $mean" | bc -l)
    
    # High volatility or high failure rate = Check frequently
    if (( $(echo "$cv > 0.3 || $failure_rate > 0.2" | bc -l) )); then
        echo "5"
    elif (( $(echo "$cv > 0.15 || $failure_rate > 0.1" | bc -l) )); then
        echo "10"
    else
        echo "15"
    fi
}

# ============================================================================
# DISTRIBUTION ANALYSIS (Diagnostic)
# ============================================================================

analyze_distribution() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 Reward Distribution Analysis"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Basic stats
    sqlite3 "$DB_PATH" <<SQL
WITH stats AS (
    SELECT 
        COUNT(*) as n,
        MIN(reward) as min_r,
        AVG(reward) as mean,
        MAX(reward) as max_r
    FROM episodes
    WHERE success = 1
)
SELECT 
    'Count: ' || n,
    'Range: [' || ROUND(min_r, 3) || ' - ' || ROUND(max_r, 3) || ']',
    'Mean: ' || ROUND(mean, 4)
FROM stats;
SQL
    
    echo ""
    echo "📈 Percentiles:"
    
    # Calculate key percentiles
    local p05=$(get_percentile 0.05)
    local p25=$(get_percentile 0.25)
    local p50=$(get_percentile 0.50)
    local p75=$(get_percentile 0.75)
    local p95=$(get_percentile 0.95)
    
    echo "  P05: $p05"
    echo "  P25: $p25"
    echo "  P50: $p50"
    echo "  P75: $p75"
    echo "  P95: $p95"
    
    # Variance check
    local stats=$(get_stats)
    local stddev=$(echo "$stats" | cut -d'|' -f2)
    local mean=$(echo "$stats" | cut -d'|' -f1)
    local cv=$(echo "scale=4; $stddev / $mean" | bc)
    
    echo ""
    echo "📊 Variability:"
    echo "  StdDev: $stddev"
    echo "  CoeffVar: $cv"
    
    if (( $(echo "$cv < 0.05" | bc -l) )); then
        echo "  ⚠️  DEGENERATE: Nearly constant rewards!"
    elif (( $(echo "$cv < 0.15" | bc -l) )); then
        echo "  ✅ LOW VOLATILITY: Stable rewards"
    else
        echo "  ⚠️  HIGH VOLATILITY: Variable rewards"
    fi
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# ============================================================================
# Main
# ============================================================================

main() {
    case "$COMMAND" in
        circuit-breaker)
            calculate_circuit_breaker
            ;;
        degradation)
            calculate_degradation
            ;;
        cascade)
            calculate_cascade
            ;;
        divergence)
            calculate_divergence
            ;;
        check-frequency)
            calculate_check_frequency
            ;;
        analyze)
            analyze_distribution
            ;;
        all)
            echo "{"
            echo "  \"circuit_breaker\": $(calculate_circuit_breaker 2>/dev/null),"
            echo "  \"degradation\": $(calculate_degradation 2>/dev/null),"
            echo "  \"cascade\": $(calculate_cascade 2>/dev/null),"
            echo "  \"divergence\": $(calculate_divergence 2>/dev/null),"
            echo "  \"check_frequency\": $(calculate_check_frequency 2>/dev/null)"
            echo "}"
            echo ""
            analyze_distribution
            ;;
        *)
            echo "Usage: $0 [circuit-breaker|degradation|cascade|divergence|check-frequency|analyze|all] [db_path]"
            exit 1
            ;;
    esac
}

main
