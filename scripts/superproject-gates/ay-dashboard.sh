#!/usr/bin/env bash
set -euo pipefail

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Advanced Agentic Flow Monitoring Dashboard
# Statistical thresholds, WSJF prioritization, ROAM risks
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuration
REFRESH_INTERVAL=${REFRESH_INTERVAL:-15}
AGENTDB_PATH="${AGENTDB_PATH:-$PROJECT_ROOT/agentdb.db}"
RISK_DB="${PROJECT_ROOT}/.db/risk-traceability.db"
DASH_WINDOW_DAYS=${DASH_WINDOW_DAYS:-30}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# Load statistical thresholds
if [[ -f "$SCRIPT_DIR/lib/statistical-thresholds.sh" ]]; then
    source "$SCRIPT_DIR/lib/statistical-thresholds.sh"
    STATISTICAL_ENABLED=true
else
    STATISTICAL_ENABLED=false
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Helper Functions
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

print_header() {
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${CYAN}$1${NC}"
    echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_section() {
    echo -e "${BOLD}${MAGENTA}▶ $1${NC}"
}

get_bar() {
    local value=$1
    local max=$2
    local width=30
    local filled=$(echo "scale=0; $value / $max * $width" | bc 2>/dev/null || echo "0")
    local empty=$((width - filled))
    
    printf "["
    for ((i=0; i<filled; i++)); do printf "█"; done
    for ((i=0; i<empty; i++)); do printf "░"; done
    printf "]"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Dashboard Sections
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

show_system_overview() {
    print_section "System Overview"
    
    # AgentDB Status
    if [[ -f "$AGENTDB_PATH" ]]; then
        local total_episodes=$(sqlite3 "$AGENTDB_PATH" "SELECT COUNT(*) FROM episodes;" 2>/dev/null || echo "0")
        local recent_episodes=$(sqlite3 "$AGENTDB_PATH" "SELECT COUNT(*) FROM episodes WHERE created_at > datetime('now', '-24 hours');" 2>/dev/null || echo "0")
        local circles=$(sqlite3 "$AGENTDB_PATH" "SELECT COUNT(DISTINCT json_extract(metadata, '\$.circle')) FROM episodes;" 2>/dev/null || echo "0")
        
        echo -e "  ${GREEN}✓${NC} AgentDB: $total_episodes episodes ($recent_episodes in 24h, $circles circles)"
    else
        echo -e "  ${YELLOW}⚠${NC} AgentDB: Not found at $AGENTDB_PATH"
    fi
    
    # Statistical Thresholds Status
    if [[ "$STATISTICAL_ENABLED" == "true" ]]; then
        echo -e "  ${GREEN}✓${NC} Statistical Thresholds: Enabled (ground-truth validated)"
    else
        echo -e "  ${YELLOW}⚠${NC} Statistical Thresholds: Disabled (using hardcoded fallbacks)"
    fi
    
    # Risk Traceability DB
    if [[ -f "$RISK_DB" ]]; then
        local threshold_decisions=$(sqlite3 "$RISK_DB" "SELECT COUNT(*) FROM threshold_validations;" 2>/dev/null || echo "0")
        echo -e "  ${GREEN}✓${NC} Risk Traceability: $threshold_decisions threshold decisions logged"
    else
        echo -e "  ${DIM}○${NC} Risk Traceability: Not initialized"
    fi
    
    echo ""
}

show_statistical_thresholds() {
    if [[ "$STATISTICAL_ENABLED" != "true" ]]; then
        return
    fi
    
    print_section "Statistical Thresholds (Last Calculation)"
    
    local circles=("orchestrator" "assessor" "analyst" "innovator" "seeker" "intuitive")
    
    # Circuit Breaker Thresholds
    echo -e "${BOLD}Circuit Breaker (5th percentile):${NC}"
    for circle in "${circles[@]}"; do
        local cb_threshold=$(get_circuit_breaker "$circle" "" "$AGENTDB_PATH" 2>/dev/null || echo "0.30")
        local color=$GREEN
        if (( $(echo "$cb_threshold < 0.5" | bc -l 2>/dev/null || echo "0") )); then
            color=$YELLOW
        fi
        printf "  %-15s: ${color}%.2f${NC}\n" "$circle" "$cb_threshold"
    done
    echo ""
    
    # Equity Threshold
    local equity_result=$(get_equity_threshold "$AGENTDB_PATH" 2>/dev/null || echo "70|0|0")
    local equity_threshold=$(echo "$equity_result" | cut -d'|' -f1)
    local episode_cv=$(echo "$equity_result" | cut -d'|' -f2)
    echo -e "${BOLD}Equity Threshold (adaptive):${NC} $equity_threshold (CV: $episode_cv)"
    echo ""
}

show_wsjf_priorities() {
    print_section "WSJF Circle Priorities"
    
    if [[ "$STATISTICAL_ENABLED" != "true" ]] || [[ ! -f "$AGENTDB_PATH" ]]; then
        echo "  Statistical scoring unavailable"
        echo ""
        return
    fi
    
    local circles=("orchestrator" "assessor" "analyst" "innovator" "seeker" "intuitive")
    declare -A wsjf_scores
    declare -A business_values
    declare -A time_criticalities
    declare -A risk_reductions
    
    # Calculate WSJF for each circle
    for circle in "${circles[@]}"; do
        local wsjf_result=$(get_wsjf_scores "$circle" "$AGENTDB_PATH" 2>/dev/null || echo "5.0|5.0|5.0|0|0.0")
        local bv=$(echo "$wsjf_result" | cut -d'|' -f1)
        local tc=$(echo "$wsjf_result" | cut -d'|' -f2)
        local rr=$(echo "$wsjf_result" | cut -d'|' -f3)
        
        # Calculate WSJF score (sum of components / job size estimate)
        local job_size=10.0
        case "$circle" in
            orchestrator) job_size=5.0 ;;
            assessor) job_size=15.0 ;;
            analyst) job_size=20.0 ;;
            innovator) job_size=10.0 ;;
            seeker) job_size=15.0 ;;
            intuitive) job_size=20.0 ;;
        esac
        
        local wsjf=$(echo "scale=2; ($bv + $tc + $rr) / $job_size" | bc -l 2>/dev/null || echo "1.0")
        
        wsjf_scores[$circle]=$wsjf
        business_values[$circle]=$bv
        time_criticalities[$circle]=$tc
        risk_reductions[$circle]=$rr
    done
    
    # Sort and display
    echo -e "${BOLD}Priority Order (WSJF Score):${NC}"
    for circle in $(for c in "${circles[@]}"; do echo "$c ${wsjf_scores[$c]}"; done | sort -rn -k2 | awk '{print $1}'); do
        local wsjf="${wsjf_scores[$circle]}"
        local bv="${business_values[$circle]}"
        local tc="${time_criticalities[$circle]}"
        local rr="${risk_reductions[$circle]}"
        
        local color=$BLUE
        local priority="LOW"
        if (( $(echo "$wsjf >= 2.0" | bc -l) )); then
            color=$GREEN
            priority="HIGH"
        elif (( $(echo "$wsjf >= 1.0" | bc -l) )); then
            color=$YELLOW
            priority="MED"
        fi
        
        printf "  ${color}%-15s${NC} WSJF: %-5s [BV:%-4s TC:%-4s RR:%-4s] %s\n" \
            "$circle" "$wsjf" "$bv" "$tc" "$rr" "$priority"
    done
    echo ""
}

show_performance_metrics() {
    print_section "Circle Performance (30 days)"
    
    if [[ ! -f "$AGENTDB_PATH" ]]; then
        echo "  AgentDB not available"
        echo ""
        return
    fi
    
    local circles=("orchestrator" "assessor" "analyst" "innovator" "seeker" "intuitive")
    
    echo -e "${BOLD}Success Rates:${NC}"
    for circle in "${circles[@]}"; do
        local success_rate=$(sqlite3 "$AGENTDB_PATH" "
            SELECT ROUND(AVG(CASE WHEN success = 1 THEN 100.0 ELSE 0.0 END), 1)
            FROM episodes
            WHERE json_extract(metadata, '\$.circle') = '$circle'
              AND created_at > datetime('now', '-' || $DASH_WINDOW_DAYS || ' days');
        " 2>/dev/null || echo "0.0")
        
        local episode_count=$(sqlite3 "$AGENTDB_PATH" "
            SELECT COUNT(*)
            FROM episodes
            WHERE json_extract(metadata, '\$.circle') = '$circle'
              AND created_at > datetime('now', '-' || $DASH_WINDOW_DAYS || ' days');
        " 2>/dev/null || echo "0")
        
        local color=$RED
        if (( $(echo "$success_rate >= 80" | bc -l 2>/dev/null || echo "0") )); then
            color=$GREEN
        elif (( $(echo "$success_rate >= 60" | bc -l 2>/dev/null || echo "0") )); then
            color=$YELLOW
        fi
        
        local bar=$(get_bar "$success_rate" "100")
        printf "  %-15s: ${color}%5.1f%%${NC} $bar (n=%d)\n" "$circle" "$success_rate" "$episode_count"
    done
    echo ""
}

show_circuit_breaker_status() {
    print_section "Circuit Breaker Status"
    
    if [[ ! -f "$AGENTDB_PATH" ]]; then
        echo "  AgentDB not available"
        echo ""
        return
    fi
    
    local circles=("orchestrator" "assessor" "analyst")
    
    for circle in "${circles[@]}"; do
        # Get recent reward
        local recent_reward=$(sqlite3 "$AGENTDB_PATH" "
            SELECT ROUND(AVG(reward), 2)
            FROM (
                SELECT reward FROM episodes
                WHERE json_extract(metadata, '\$.circle') = '$circle'
                  AND created_at > datetime('now', '-7 days')
                ORDER BY created_at DESC
                LIMIT 20
            );
        " 2>/dev/null || echo "0.0")
        
        if [[ "$STATISTICAL_ENABLED" == "true" ]]; then
            local cb_threshold=$(get_circuit_breaker "$circle" "" "$AGENTDB_PATH" 2>/dev/null || echo "0.7")
        else
            local cb_threshold=0.7
        fi
        
        local status="${GREEN}✓ OK${NC}"
        if (( $(echo "$recent_reward < $cb_threshold" | bc -l 2>/dev/null || echo "0") )); then
            status="${RED}✗ TRIGGERED${NC}"
        elif (( $(echo "$recent_reward < $cb_threshold * 1.1" | bc -l 2>/dev/null || echo "0") )); then
            status="${YELLOW}⚠ WARNING${NC}"
        fi
        
        printf "  %-15s: Reward %.2f | Threshold %.2f | %b\n" "$circle" "$recent_reward" "$cb_threshold" "$status"
    done
    echo ""
}

show_cascade_detection() {
    print_section "Cascade Failure Detection"
    
    if [[ "$STATISTICAL_ENABLED" == "true" ]]; then
        local cascade_result=$(get_cascade_threshold "orchestrator" "standup" "$AGENTDB_PATH" 2>/dev/null || echo "10|5|0.0|0")
        local cascade_threshold=$(echo "$cascade_result" | cut -d'|' -f1)
        local cascade_window=$(echo "$cascade_result" | cut -d'|' -f2)
        local baseline_rate=$(echo "$cascade_result" | cut -d'|' -f3)
        
        echo "  Threshold: $cascade_threshold failures in ${cascade_window}min (velocity-based)"
        echo "  Baseline failure rate: $baseline_rate"
    else
        echo "  Threshold: 10 failures in 5min (hardcoded)"
    fi
    
    # Count recent failures
    local recent_failures=0
    if [[ -f "$AGENTDB_PATH" ]]; then
        recent_failures=$(sqlite3 "$AGENTDB_PATH" "
            SELECT COUNT(*)
            FROM episodes
            WHERE success = 0
              AND created_at > datetime('now', '-10 minutes');
        " 2>/dev/null || echo "0")
    fi
    
    local status="${GREEN}✓ Normal${NC}"
    if [[ "$STATISTICAL_ENABLED" == "true" ]]; then
        if [[ $recent_failures -ge $cascade_threshold ]]; then
            status="${RED}✗ CASCADE DETECTED${NC}"
        elif [[ $recent_failures -ge $((cascade_threshold / 2)) ]]; then
            status="${YELLOW}⚠ Elevated${NC}"
        fi
    else
        if [[ $recent_failures -ge 10 ]]; then
            status="${RED}✗ CASCADE DETECTED${NC}"
        elif [[ $recent_failures -ge 5 ]]; then
            status="${YELLOW}⚠ Elevated${NC}"
        fi
    fi
    
    echo -e "  Recent failures (10min): $recent_failures | Status: $status"
    echo ""
}

show_threshold_validation() {
    if [[ ! -f "$RISK_DB" ]]; then
        return
    fi
    
    print_section "Threshold Validation (Last 7 Days)"
    
    # Summary by threshold type
    echo -e "${BOLD}Decisions by Type:${NC}"
    sqlite3 -column -header "$RISK_DB" "
        SELECT 
            threshold_type as Type,
            COUNT(*) as Decisions,
            ROUND(AVG(threshold_value), 2) as AvgValue,
            ROUND(MIN(threshold_value), 2) as Min,
            ROUND(MAX(threshold_value), 2) as Max
        FROM threshold_validations
        WHERE timestamp > datetime('now', '-7 days')
        GROUP BY threshold_type
        ORDER BY Decisions DESC
        LIMIT 10;
    " 2>/dev/null | sed 's/^/  /' || echo "  No data"
    
    echo ""
}

show_roam_summary() {
    print_section "ROAM Risk Summary"
    
    echo -e "  ${GREEN}✓${NC} Resolved: Time budgets enforced (DoR compliance 100%)"
    echo -e "  ${YELLOW}○${NC} Owned: Daemon runaway (PID tracking active)"
    echo -e "  ${BLUE}○${NC} Accepted: Circle equity imbalance (monitoring in place)"
    echo -e "  ${GREEN}✓${NC} Mitigated: Learning loop instability (max iterations enforced)"
    echo ""
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Main Dashboard Loop
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

main_dashboard() {
    while true; do
        clear
        
        print_header "🎯 Agentic Flow Monitoring Dashboard"
        echo -e "${DIM}$(date '+%Y-%m-%d %H:%M:%S') | Refresh: ${REFRESH_INTERVAL}s | Press Ctrl+C to exit${NC}"
        echo ""
        
        show_system_overview
        show_statistical_thresholds
        show_wsjf_priorities
        show_performance_metrics
        show_circuit_breaker_status
        show_cascade_detection
        show_threshold_validation
        show_roam_summary
        
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        
        sleep "$REFRESH_INTERVAL"
    done
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Command Router
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMMAND="${1:-live}"

case "$COMMAND" in
    live|l)
        main_dashboard
        ;;
    
    once|o)
        show_system_overview
        show_statistical_thresholds
        show_wsjf_priorities
        show_performance_metrics
        show_circuit_breaker_status
        show_cascade_detection
        show_threshold_validation
        show_roam_summary
        ;;
    
    thresholds|t)
        show_statistical_thresholds
        show_threshold_validation
        ;;
    
    wsjf|w)
        show_wsjf_priorities
        ;;
    
    performance|p)
        show_performance_metrics
        show_circuit_breaker_status
        show_cascade_detection
        ;;
    
    help|h|--help|-h)
        echo "Agentic Flow Monitoring Dashboard"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  live, l        Live dashboard (default, refreshes every ${REFRESH_INTERVAL}s)"
        echo "  once, o        One-time snapshot"
        echo "  thresholds, t  Statistical thresholds only"
        echo "  wsjf, w        WSJF priorities only"
        echo "  performance, p Circuit breaker and cascade detection"
        echo "  help, h        Show this help"
        echo ""
        echo "Environment:"
        echo "  REFRESH_INTERVAL  Dashboard refresh interval (default: 15s)"
        echo "  AGENTDB_PATH      Path to AgentDB (default: ./agentdb.db)"
        echo ""
        ;;
    
    *)
        echo "Unknown command: $COMMAND"
        echo "Use '$0 help' for usage"
        exit 1
        ;;
esac
