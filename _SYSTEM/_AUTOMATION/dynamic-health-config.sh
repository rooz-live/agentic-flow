#!/bin/bash
# dynamic-health-config.sh - Calculate optimal health monitoring parameters based on context
# Instead of fixed values, dynamically determine optimal bounds

set -euo pipefail

# =============================================================================
# DYNAMIC HEALTH CONFIGURATION
# =============================================================================

# Calculate optimal health check count based on context
calculate_optimal_health_checks() {
    local provider="$1"
    local time_of_day="${2:-$(date +%H)}"
    local day_of_week="${3:-$(date +%u)}" # 1=Monday, 7=Sunday
    
    # Base values by provider reliability
    declare -A provider_reliability=(
        ["tailscale"]=0.95    # 95% reliable
        ["ngrok"]=0.85        # 85% reliable
        ["cloudflare"]=0.75   # 75% reliable (ephemeral URLs)
        ["localtunnel"]=0.65  # 65% reliable (npm dependency)
    )
    
    # Time-based multipliers
    local time_multiplier=1.0
    if [[ $time_of_day -ge 22 || $time_of_day -lt 6 ]]; then
        # Late night/early morning - less monitoring needed
        time_multiplier=0.5
    elif [[ $time_of_day -ge 9 && $time_of_day -le 17 ]]; then
        # Business hours - more monitoring
        time_multiplier=1.5
    fi
    
    # Day-based multipliers
    local day_multiplier=1.0
    if [[ $day_of_week -ge 6 ]]; then
        # Weekend - less critical
        day_multiplier=0.7
    fi
    
    # Calculate base checks
    local reliability=${provider_reliability[$provider]:-0.5}
    local base_checks=20
    
    # Adjust based on reliability (less reliable = more checks)
    local reliability_adjustment=$(echo "scale=2; 2.0 - $reliability" | bc -l)
    
    # Calculate optimal checks
    local optimal_checks=$(echo "
        scale=0;
        $base_checks * $reliability_adjustment * $time_multiplier * $day_multiplier
    " | bc -l)
    
    # Ensure reasonable bounds
    [[ $optimal_checks -lt 5 ]] && optimal_checks=5
    [[ $optimal_checks -gt 100 ]] && optimal_checks=100
    
    echo $optimal_checks
}

# Calculate optimal check interval based on provider type
calculate_optimal_interval() {
    local provider="$1"
    
    declare -A provider_intervals=(
        ["tailscale"]=30    # Stable, check every 30s
        ["ngrok"]=20        # Fairly stable, every 20s
        ["cloudflare"]=15   # Less stable, every 15s
        ["localtunnel"]=10  # Unstable, every 10s
    )
    
    echo ${provider_intervals[$provider]:-20}
}

# Calculate max failures before circuit breaker
calculate_max_failures() {
    local provider="$1"
    local current_hour=$(date +%H)
    
    # Base failure tolerance
    declare -A base_tolerance=(
        ["tailscale"]=5     # High tolerance
        ["ngrok"]=3         # Medium tolerance
        ["cloudflare"]=2    # Low tolerance (URLs expire)
        ["localtunnel"]=2   # Low tolerance (npm issues)
    )
    
    local tolerance=${base_tolerance[$provider]:-3}
    
    # Reduce tolerance during business hours for faster recovery
    if [[ $current_hour -ge 9 && $current_hour -le 17 ]]; then
        tolerance=$((tolerance - 1))
        [[ $tolerance -lt 1 ]] && tolerance=1
    fi
    
    echo $tolerance
}

# Calculate backoff strategy
calculate_backoff_strategy() {
    local provider="$1"
    local failure_count="$2"
    
    # Exponential backoff with provider-specific caps
    declare -A max_backoff=(
        ["tailscale"]=120   # Max 2 minutes
        ["ngrok"]=180       # Max 3 minutes
        ["cloudflare"]=60   # Max 1 minute (fast retry)
        ["localtunnel"]=90  # Max 1.5 minutes
    )
    
    local base=30
    local backoff=$((base * (2 ** failure_count)))
    local max=${max_backoff[$provider]:-120}
    
    # Apply cap
    [[ $backoff -gt $max ]] && backoff=$max
    
    echo $backoff
}

# Get dynamic configuration for health monitoring
get_dynamic_health_config() {
    local provider="$1"
    
    local time_of_day=$(date +%H)
    local day_of_week=$(date +%u)
    
    local max_checks=$(calculate_optimal_health_checks "$provider" "$time_of_day" "$day_of_week")
    local interval=$(calculate_optimal_interval "$provider")
    local max_failures=$(calculate_max_failures "$provider")
    
    # Output as shell variables
    cat << EOF
MAX_HEALTH_CHECKS=$max_checks
HEALTH_CHECK_INTERVAL=$interval
MAX_FAILURES=$max_failures
PROVIDER=$provider
TIME_OF_DAY=$time_of_day
DAY_OF_WEEK=$day_of_week
EOF
    
    # Log the configuration
    echo "🔧 Dynamic Health Config for $provider:"
    echo "   Max checks: $max_checks (adjusted for time/day)"
    echo "   Check interval: ${interval}s"
    echo "   Max failures: $max_failures"
    echo "   Time context: ${time_of_day}:00, Day $day_of_week"
}

# Adaptive configuration based on recent failure history
get_adaptive_config() {
    local provider="$1"
    local history_file="/tmp/health-history-${provider}.json"
    
    # Default values
    local default_checks=$(calculate_optimal_health_checks "$provider")
    local default_interval=$(calculate_optimal_interval "$provider")
    local default_failures=$(calculate_max_failures "$provider")
    
    # If we have history, adapt based on recent patterns
    if [[ -f "$history_file" ]]; then
        local recent_failures=$(jq '.recent_failures // 0' "$history_file" 2>/dev/null || echo 0)
        local avg_uptime=$(jq '.avg_uptime // 0.8' "$history_file" 2>/dev/null || echo 0.8)
        
        # Adapt based on history
        if [[ $recent_failures -gt 5 ]]; then
            # Recent instability - increase monitoring
            default_checks=$((default_checks * 2))
            default_interval=$((default_interval / 2))
            echo "⚠️ Adapting: Recent instability detected"
        elif [[ $(echo "$avg_uptime > 0.95" | bc -l) -eq 1 ]]; then
            # Very stable - reduce monitoring overhead
            default_checks=$((default_checks / 2))
            default_interval=$((default_interval * 2))
            echo "✅ Adapting: Provider is very stable"
        fi
    fi
    
    cat << EOF
MAX_HEALTH_CHECKS=$default_checks
HEALTH_CHECK_INTERVAL=$default_interval
MAX_FAILURES=$default_failures
EOF
}

# Context-aware configuration for different scenarios
get_context_config() {
    local scenario="${1:-normal}"
    
    case "$scenario" in
        "production")
            # Production: Maximum reliability
            cat << EOF
MAX_HEALTH_CHECKS=100
HEALTH_CHECK_INTERVAL=10
MAX_FAILURES=2
EOF
            ;;
        "development")
            # Development: Less aggressive
            cat << EOF
MAX_HEALTH_CHECKS=20
HEALTH_CHECK_INTERVAL=30
MAX_FAILURES=5
EOF
            ;;
        "testing")
            # Testing: Quick feedback
            cat << EOF
MAX_HEALTH_CHECKS=10
HEALTH_CHECK_INTERVAL=5
MAX_FAILURES=2
EOF
            ;;
        "demo")
            # Demo: Balance of reliability and speed
            cat << EOF
MAX_HEALTH_CHECKS=30
HEALTH_CHECK_INTERVAL=15
MAX_FAILURES=3
EOF
            ;;
        *)
            # Normal: Dynamic based on provider
            echo "Usage: get_context_config {production|development|testing|demo}"
            return 1
            ;;
    esac
}

# Main execution
case "${1:-help}" in
    "calculate")
        get_dynamic_health_config "$2"
        ;;
    "adaptive")
        get_adaptive_config "$2"
        ;;
    "context")
        get_context_config "$2"
        ;;
    "help"|*)
        echo "Usage: $0 {calculate|adaptive|context} [provider|scenario]"
        echo ""
        echo "Examples:"
        echo "  $0 calculate ngrok           # Dynamic config for ngrok"
        echo "  $0 adaptive cloudflare       # Adaptive based on history"
        echo "  $0 context production        # Production preset"
        exit 1
        ;;
esac
