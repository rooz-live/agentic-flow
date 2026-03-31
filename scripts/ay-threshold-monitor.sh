#!/usr/bin/env bash
# ay-threshold-monitor.sh - Real-time Dynamic Threshold Monitoring
# Integrates with ay-continuous-improve.sh and monitor-divergence.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
AGENTDB_PATH="${AGENTDB_PATH:-${ROOT_DIR}/agentdb.db}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

REFRESH_INTERVAL="${REFRESH_INTERVAL:-10}"
CIRCLE="${1:-orchestrator}"
CEREMONY="${2:-standup}"

# ═══════════════════════════════════════════════════════════════════════════
# THRESHOLD FETCHING
# ═══════════════════════════════════════════════════════════════════════════

fetch_thresholds() {
    local output
    output=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" all "$CIRCLE" "$CEREMONY" 2>/dev/null)
    echo "$output"
}

parse_threshold_value() {
    local output="$1"
    local pattern="$2"
    echo "$output" | grep -A1 "$pattern" | grep -E "Threshold:|Rate:|Percentile:" | awk '{print $2}' | head -1
}

parse_confidence() {
    local output="$1"
    local pattern="$2"
    echo "$output" | grep -A2 "$pattern" | grep "Confidence:" | awk '{print $2}' | head -1
}

parse_method() {
    local output="$1"
    local pattern="$2"
    echo "$output" | grep -A3 "$pattern" | grep "Method:" | awk '{print $2}' | head -1
}

# ═══════════════════════════════════════════════════════════════════════════
# STATUS EVALUATION
# ═══════════════════════════════════════════════════════════════════════════

get_status_color() {
    local confidence="$1"
    case "$confidence" in
        HIGH_CONFIDENCE)
            echo "$GREEN"
            ;;
        MEDIUM_CONFIDENCE)
            echo "$YELLOW"
            ;;
        LOW_CONFIDENCE)
            echo "$YELLOW"
            ;;
        NO_DATA|FALLBACK|"")
            echo "$RED"
            ;;
        *)
            echo "$NC"
            ;;
    esac
}

get_status_icon() {
    local confidence="$1"
    case "$confidence" in
        HIGH_CONFIDENCE)
            echo "✅"
            ;;
        MEDIUM_CONFIDENCE)
            echo "⚠️"
            ;;
        LOW_CONFIDENCE)
            echo "⚠️"
            ;;
        NO_DATA|FALLBACK|"")
            echo "❌"
            ;;
        *)
            echo "?"
            ;;
    esac
}

# ═══════════════════════════════════════════════════════════════════════════
# DASHBOARD DISPLAY
# ═══════════════════════════════════════════════════════════════════════════

display_dashboard() {
    local thresholds="$1"
    
    clear
    
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     DYNAMIC THRESHOLD MONITOR - AGENTIC FLOW SYSTEM          ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}Circle: ${MAGENTA}$CIRCLE${CYAN} | Ceremony: ${MAGENTA}$CEREMONY${NC}"
    echo -e "${CYAN}Time: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo ""
    
    # 1. Circuit Breaker
    local cb_threshold=$(parse_threshold_value "$thresholds" "Circuit Breaker")
    local cb_confidence=$(parse_confidence "$thresholds" "Circuit Breaker")
    local cb_color=$(get_status_color "$cb_confidence")
    local cb_icon=$(get_status_icon "$cb_confidence")
    
    echo -e "${CYAN}━━━ 1. CIRCUIT BREAKER (2.5σ Method) ━━━${NC}"
    echo -e "  $cb_icon Threshold: ${cb_color}${cb_threshold:-N/A}${NC}"
    echo -e "  $cb_icon Confidence: ${cb_color}${cb_confidence:-NO_DATA}${NC}"
    echo ""
    
    # 2. Degradation
    local deg_threshold=$(parse_threshold_value "$thresholds" "Degradation Threshold")
    local deg_confidence=$(parse_confidence "$thresholds" "Degradation Threshold")
    local deg_color=$(get_status_color "$deg_confidence")
    local deg_icon=$(get_status_icon "$deg_confidence")
    
    echo -e "${CYAN}━━━ 2. DEGRADATION DETECTION (95% CI) ━━━${NC}"
    echo -e "  $deg_icon Threshold: ${deg_color}${deg_threshold:-N/A}${NC}"
    echo -e "  $deg_icon Confidence: ${deg_color}${deg_confidence:-NO_DATA}${NC}"
    echo ""
    
    # 3. Cascade Failure
    local cas_threshold=$(parse_threshold_value "$thresholds" "Cascade Failure")
    local cas_method=$(parse_method "$thresholds" "Cascade Failure")
    local cas_color=$([ "$cas_method" = "FALLBACK" ] && echo "$RED" || echo "$GREEN")
    local cas_icon=$([ "$cas_method" = "FALLBACK" ] && echo "❌" || echo "✅")
    
    echo -e "${CYAN}━━━ 3. CASCADE FAILURE (Velocity 3σ) ━━━${NC}"
    echo -e "  $cas_icon Threshold: ${cas_color}${cas_threshold:-5} failures${NC}"
    echo -e "  $cas_icon Method: ${cas_color}${cas_method:-FALLBACK}${NC}"
    echo ""
    
    # 4. Divergence Rate
    local div_rate=$(parse_threshold_value "$thresholds" "Divergence Rate")
    local div_confidence=$(parse_confidence "$thresholds" "Divergence Rate")
    local div_color=$(get_status_color "$div_confidence")
    local div_icon=$(get_status_icon "$div_confidence")
    
    echo -e "${CYAN}━━━ 4. DIVERGENCE RATE (Sharpe-Adjusted) ━━━${NC}"
    echo -e "  $div_icon Rate: ${div_color}${div_rate:-N/A}${NC}"
    echo -e "  $div_icon Confidence: ${div_color}${div_confidence:-NO_DATA}${NC}"
    
    # Show recommendation based on rate
    if [ -n "$div_rate" ] && [ "$div_rate" != "N/A" ]; then
        local rate_pct=$(echo "$div_rate * 100" | bc -l 2>/dev/null | cut -d. -f1)
        if [ "$rate_pct" -ge 20 ]; then
            echo -e "  💡 ${GREEN}Aggressive exploration recommended${NC}"
        elif [ "$rate_pct" -ge 10 ]; then
            echo -e "  💡 ${YELLOW}Moderate exploration${NC}"
        else
            echo -e "  💡 ${RED}Conservative - performance needs improvement${NC}"
        fi
    fi
    echo ""
    
    # 5. Check Frequency
    local freq_value=$(parse_threshold_value "$thresholds" "Check Frequency")
    local freq_method=$(parse_method "$thresholds" "Check Frequency")
    local freq_color=$([ "$freq_method" = "FALLBACK" ] && echo "$RED" || echo "$GREEN")
    local freq_icon=$([ "$freq_method" = "FALLBACK" ] && echo "❌" || echo "✅")
    
    echo -e "${CYAN}━━━ 5. CHECK FREQUENCY (Adaptive) ━━━${NC}"
    echo -e "  $freq_icon Check every: ${freq_color}${freq_value:-20} episodes${NC}"
    echo -e "  $freq_icon Method: ${freq_color}${freq_method:-FALLBACK}${NC}"
    echo ""
    
    # 6. Quantile-Based
    local quant_value=$(parse_threshold_value "$thresholds" "Quantile-Based")
    local quant_method=$(parse_method "$thresholds" "Quantile-Based")
    local quant_color=$([ "$quant_method" = "EMPIRICAL_QUANTILE" ] && echo "$GREEN" || echo "$YELLOW")
    local quant_icon=$([ "$quant_method" = "EMPIRICAL_QUANTILE" ] && echo "✅" || echo "⚠️")
    
    echo -e "${CYAN}━━━ 6. QUANTILE-BASED (Fat-Tail Aware) ━━━${NC}"
    echo -e "  $quant_icon 5th Percentile: ${quant_color}${quant_value:-N/A}${NC}"
    echo -e "  $quant_icon Method: ${quant_color}${quant_method:-FALLBACK}${NC}"
    echo ""
    
    # ═══════════════════════════════════════════════════════════════════════
    # OVERALL SYSTEM HEALTH
    # ═══════════════════════════════════════════════════════════════════════
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Count HIGH_CONFIDENCE thresholds
    local high_count=$(echo "$thresholds" | grep -c "HIGH_CONFIDENCE" || echo "0")
    local total=6
    local health_pct=$((high_count * 100 / total))
    
    echo ""
    echo -e "${CYAN}📊 SYSTEM HEALTH${NC}"
    echo -e "  Operational Thresholds: ${high_count}/${total} (${health_pct}%)"
    
    if [ "$health_pct" -ge 80 ]; then
        echo -e "  Status: ${GREEN}✅ EXCELLENT${NC}"
    elif [ "$health_pct" -ge 50 ]; then
        echo -e "  Status: ${YELLOW}⚠️ GOOD${NC}"
    else
        echo -e "  Status: ${RED}❌ NEEDS IMPROVEMENT${NC}"
    fi
    
    # Database stats
    if [ -f "$AGENTDB_PATH" ]; then
        local total_episodes=$(sqlite3 "$AGENTDB_PATH" "SELECT COUNT(*) FROM episodes" 2>/dev/null || echo "0")
        local recent_episodes=$(sqlite3 "$AGENTDB_PATH" "SELECT COUNT(*) FROM episodes WHERE created_at > strftime('%s', 'now', '-7 days')" 2>/dev/null || echo "0")
        
        echo ""
        echo -e "${CYAN}💾 DATABASE STATUS${NC}"
        echo -e "  Total Episodes: $total_episodes"
        echo -e "  Recent (7d): $recent_episodes"
        
        if [ "$recent_episodes" -lt 10 ]; then
            echo -e "  ${RED}⚠️ Need 10+ recent episodes for full confidence${NC}"
            echo -e "     Run: npx tsx scripts/generate-test-episodes.ts --count 20"
        fi
    fi
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "Refreshing every ${REFRESH_INTERVAL}s... (Ctrl+C to stop)"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════════
# MAIN LOOP
# ═══════════════════════════════════════════════════════════════════════════

main() {
    # Check if database exists
    if [ ! -f "$AGENTDB_PATH" ]; then
        echo -e "${RED}Error: agentdb.db not found at $AGENTDB_PATH${NC}"
        echo ""
        echo "Initialize database first:"
        echo "  npx tsx scripts/generate-test-episodes.ts --count 50"
        exit 1
    fi
    
    # Check if threshold script exists
    if [ ! -f "$SCRIPT_DIR/ay-dynamic-thresholds.sh" ]; then
        echo -e "${RED}Error: ay-dynamic-thresholds.sh not found${NC}"
        exit 1
    fi
    
    # Main monitoring loop
    while true; do
        thresholds=$(fetch_thresholds)
        display_dashboard "$thresholds"
        sleep "$REFRESH_INTERVAL"
    done
}

# Run if executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
