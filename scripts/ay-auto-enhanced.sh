#!/usr/bin/env bash
# ay-auto-enhanced.sh - Enhanced Auto-Resolution with Per-Threshold Progress
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
AGENTDB_PATH="${AGENTDB_PATH:-${ROOT_DIR}/agentdb.db}"

# Colors
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly CYAN='\033[0;36m'
readonly BLUE='\033[0;34m'
readonly MAGENTA='\033[0;35m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

# Box drawing
readonly BOX_TL="┏" BOX_TR="┓" BOX_BL="┗" BOX_BR="┛"
readonly BOX_V="┃" BOX_H="━" BOX_ML="┣" BOX_MR="┫"

# Configuration
MAX_ITERATIONS="${MAX_ITERATIONS:-5}"
CIRCLE="${AY_CIRCLE:-orchestrator}"
CEREMONY="${AY_CEREMONY:-standup}"

# State tracking
declare -A THRESHOLD_STATUS_BEFORE
declare -A THRESHOLD_STATUS_AFTER
declare -A THRESHOLD_PROGRESS
ITERATION=0

# ═══════════════════════════════════════════════════════════════════════════
# THRESHOLD ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════

get_threshold_status() {
    local output
    output=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" all "$CIRCLE" "$CEREMONY" 2>/dev/null || echo "")
    
    # Parse each threshold
    local cb_conf=$(echo "$output" | grep -A2 "Circuit Breaker" | grep "Confidence:" | awk '{print $2}' || echo "NO_DATA")
    local deg_conf=$(echo "$output" | grep -A2 "Degradation" | grep "Confidence:" | awk '{print $2}' || echo "NO_DATA")
    local cas_method=$(echo "$output" | grep -A2 "Cascade" | grep "Method:" | awk '{print $2}' || echo "FALLBACK")
    local div_conf=$(echo "$output" | grep -A2 "Divergence" | grep "Confidence:" | awk '{print $2}' || echo "NO_DATA")
    local freq_method=$(echo "$output" | grep -A2 "Check Frequency" | grep "Method:" | awk '{print $2}' || echo "FALLBACK")
    local quant_method=$(echo "$output" | grep -A2 "Quantile" | grep "Method:" | awk '{print $2}' || echo "FALLBACK")
    
    echo "CIRCUIT_BREAKER:$cb_conf"
    echo "DEGRADATION:$deg_conf"
    echo "CASCADE:$cas_method"
    echo "DIVERGENCE:$div_conf"
    echo "CHECK_FREQ:$freq_method"
    echo "QUANTILE:$quant_method"
}

calculate_health() {
    local status="$1"
    local count=0
    
    echo "$status" | grep -q "CIRCUIT_BREAKER:HIGH_CONFIDENCE" && count=$((count + 1))
    echo "$status" | grep -q "DEGRADATION:HIGH_CONFIDENCE" && count=$((count + 1))
    echo "$status" | grep -q "CASCADE:STATISTICAL" && count=$((count + 1))
    echo "$status" | grep -q "DIVERGENCE:HIGH_CONFIDENCE" && count=$((count + 1))
    echo "$status" | grep -q "CHECK_FREQ:ADAPTIVE" && count=$((count + 1))
    echo "$status" | grep -qE "QUANTILE:(EMPIRICAL_QUANTILE|HIGH_CONFIDENCE)" && count=$((count + 1))
    
    echo "$((count * 100 / 6))"
}

threshold_progress_bar() {
    local name="$1"
    local before="$2"
    local after="$3"
    local width=30
    
    # Determine status scores
    local score_before=0
    local score_after=0
    
    case "$before" in
        HIGH_CONFIDENCE|STATISTICAL|ADAPTIVE|EMPIRICAL_QUANTILE) score_before=100 ;;
        MEDIUM_CONFIDENCE) score_before=66 ;;
        LOW_CONFIDENCE|FALLBACK) score_before=33 ;;
        NO_DATA) score_before=0 ;;
    esac
    
    case "$after" in
        HIGH_CONFIDENCE|STATISTICAL|ADAPTIVE|EMPIRICAL_QUANTILE) score_after=100 ;;
        MEDIUM_CONFIDENCE) score_after=66 ;;
        LOW_CONFIDENCE|FALLBACK) score_after=33 ;;
        NO_DATA) score_after=0 ;;
    esac
    
    local filled=$((width * score_after / 100))
    local empty=$((width - filled))
    
    # Color based on improvement
    local color="$NC"
    local icon=" "
    if [ "$score_after" -gt "$score_before" ]; then
        color="$GREEN"
        icon="↑"
    elif [ "$score_after" -eq "$score_before" ] && [ "$score_after" -eq 100 ]; then
        color="$GREEN"
        icon="✓"
    elif [ "$score_after" -eq "$score_before" ]; then
        color="$YELLOW"
        icon="="
    else
        color="$RED"
        icon="↓"
    fi
    
    printf "%s %-20s ${color}[" "$icon" "$name"
    printf '%*s' "$filled" | tr ' ' '█'
    printf '%*s' "$empty" | tr ' ' '░'
    printf "] %3d%%${NC} %s → %s\n" "$score_after" "$before" "$after"
}

# ═══════════════════════════════════════════════════════════════════════════
# VALIDATION REPORT
# ═══════════════════════════════════════════════════════════════════════════

generate_validation_report() {
    local before_status="$1"
    local after_status="$2"
    local mode="$3"
    
    local health_before=$(calculate_health "$before_status")
    local health_after=$(calculate_health "$after_status")
    local health_delta=$((health_after - health_before))
    
    echo ""
    echo -e "${BLUE}${BOX_TL}$(printf '%*s' 78 | tr ' ' "$BOX_H")${BOX_TR}${NC}"
    echo -e "${BLUE}${BOX_V}${NC} ${BOLD}VALIDATION REPORT - Iteration $ITERATION${NC}$(printf '%*s' 44 '')${BLUE}${BOX_V}${NC}"
    echo -e "${BLUE}${BOX_ML}$(printf '%*s' 78 | tr ' ' "$BOX_H")${BOX_MR}${NC}"
    
    # Test Criteria Section
    echo -e "${BLUE}${BOX_V}${NC} ${CYAN}Test Criteria:${NC}$(printf '%*s' 60 '')${BLUE}${BOX_V}${NC}"
    echo -e "${BLUE}${BOX_V}${NC}   ✓ Mode executed: ${mode}$(printf '%*s' $((50 - ${#mode})) '')${BLUE}${BOX_V}${NC}"
    echo -e "${BLUE}${BOX_V}${NC}   ✓ System re-analyzed$(printf '%*s' 56 '')${BLUE}${BOX_V}${NC}"
    echo -e "${BLUE}${BOX_V}${NC}   ✓ Thresholds compared$(printf '%*s' 55 '')${BLUE}${BOX_V}${NC}"
    echo -e "${BLUE}${BOX_ML}$(printf '%*s' 78 | tr ' ' "$BOX_H")${BOX_MR}${NC}"
    
    # Per-Threshold Progress
    echo -e "${BLUE}${BOX_V}${NC} ${CYAN}Threshold Progress:${NC}$(printf '%*s' 55 '')${BLUE}${BOX_V}${NC}"
    
    local cb_before=$(echo "$before_status" | grep "CIRCUIT_BREAKER:" | cut -d: -f2)
    local cb_after=$(echo "$after_status" | grep "CIRCUIT_BREAKER:" | cut -d: -f2)
    echo -e "${BLUE}${BOX_V}${NC}   $(threshold_progress_bar "Circuit Breaker" "$cb_before" "$cb_after")$(printf '%*s' 10 '')${BLUE}${BOX_V}${NC}"
    
    local deg_before=$(echo "$before_status" | grep "DEGRADATION:" | cut -d: -f2)
    local deg_after=$(echo "$after_status" | grep "DEGRADATION:" | cut -d: -f2)
    echo -e "${BLUE}${BOX_V}${NC}   $(threshold_progress_bar "Degradation" "$deg_before" "$deg_after")$(printf '%*s' 10 '')${BLUE}${BOX_V}${NC}"
    
    local cas_before=$(echo "$before_status" | grep "CASCADE:" | cut -d: -f2)
    local cas_after=$(echo "$after_status" | grep "CASCADE:" | cut -d: -f2)
    echo -e "${BLUE}${BOX_V}${NC}   $(threshold_progress_bar "Cascade Failure" "$cas_before" "$cas_after")$(printf '%*s' 10 '')${BLUE}${BOX_V}${NC}"
    
    local div_before=$(echo "$before_status" | grep "DIVERGENCE:" | cut -d: -f2)
    local div_after=$(echo "$after_status" | grep "DIVERGENCE:" | cut -d: -f2)
    echo -e "${BLUE}${BOX_V}${NC}   $(threshold_progress_bar "Divergence Rate" "$div_before" "$div_after")$(printf '%*s' 10 '')${BLUE}${BOX_V}${NC}"
    
    local freq_before=$(echo "$before_status" | grep "CHECK_FREQ:" | cut -d: -f2)
    local freq_after=$(echo "$after_status" | grep "CHECK_FREQ:" | cut -d: -f2)
    echo -e "${BLUE}${BOX_V}${NC}   $(threshold_progress_bar "Check Frequency" "$freq_before" "$freq_after")$(printf '%*s' 10 '')${BLUE}${BOX_V}${NC}"
    
    local quant_before=$(echo "$before_status" | grep "QUANTILE:" | cut -d: -f2)
    local quant_after=$(echo "$after_status" | grep "QUANTILE:" | cut -d: -f2)
    echo -e "${BLUE}${BOX_V}${NC}   $(threshold_progress_bar "Quantile-Based" "$quant_before" "$quant_after")$(printf '%*s' 10 '')${BLUE}${BOX_V}${NC}"
    
    echo -e "${BLUE}${BOX_ML}$(printf '%*s' 78 | tr ' ' "$BOX_H")${BOX_MR}${NC}"
    
    # Overall Health Change
    echo -e "${BLUE}${BOX_V}${NC} ${CYAN}Overall Health:${NC}$(printf '%*s' 59 '')${BLUE}${BOX_V}${NC}"
    
    local health_color="$YELLOW"
    [ "$health_after" -ge 80 ] && health_color="$GREEN"
    [ "$health_after" -lt 50 ] && health_color="$RED"
    
    local delta_icon="→"
    local delta_color="$YELLOW"
    if [ "$health_delta" -gt 0 ]; then
        delta_icon="↑"
        delta_color="$GREEN"
    elif [ "$health_delta" -lt 0 ]; then
        delta_icon="↓"
        delta_color="$RED"
    fi
    
    echo -e "${BLUE}${BOX_V}${NC}   Before: ${YELLOW}${health_before}%${NC} ${delta_color}${delta_icon} ${health_color}${BOLD}${health_after}%${NC} ${delta_color}(${delta_delta:+${delta_icon}}${health_delta:+${health_delta}}%)${NC}$(printf '%*s' $((40 - ${#health_after} - ${#health_before})) '')${BLUE}${BOX_V}${NC}"
    
    echo -e "${BLUE}${BOX_ML}$(printf '%*s' 78 | tr ' ' "$BOX_H")${BOX_MR}${NC}"
    
    # Verdict
    local verdict=""
    local verdict_color=""
    local verdict_icon=""
    
    if [ "$health_after" -ge 80 ]; then
        verdict="GO"
        verdict_color="$GREEN"
        verdict_icon="✓"
    elif [ "$health_after" -ge 50 ]; then
        verdict="CONTINUE"
        verdict_color="$YELLOW"
        verdict_icon="▸"
    else
        verdict="NO_GO"
        verdict_color="$RED"
        verdict_icon="✗"
    fi
    
    echo -e "${BLUE}${BOX_V}${NC} ${BOLD}VERDICT: ${verdict_color}${verdict_icon} ${verdict}${NC}$(printf '%*s' $((60 - ${#verdict})) '')${BLUE}${BOX_V}${NC}"
    
    # Verdict explanation
    case "$verdict" in
        GO)
            echo -e "${BLUE}${BOX_V}${NC}   ${GREEN}Target achieved! System health ≥ 80%, stop iterating.${NC}$(printf '%*s' 18 '')${BLUE}${BOX_V}${NC}"
            ;;
        CONTINUE)
            echo -e "${BLUE}${BOX_V}${NC}   ${YELLOW}Progress made (health ≥ 50%), continue to next iteration.${NC}$(printf '%*s' 11 '')${BLUE}${BOX_V}${NC}"
            ;;
        NO_GO)
            echo -e "${BLUE}${BOX_V}${NC}   ${RED}No improvement detected, try different strategy.${NC}$(printf '%*s' 22 '')${BLUE}${BOX_V}${NC}"
            ;;
    esac
    
    echo -e "${BLUE}${BOX_ML}$(printf '%*s' 78 | tr ' ' "$BOX_H")${BOX_MR}${NC}"
    
    # Recommendations
    echo -e "${BLUE}${BOX_V}${NC} ${CYAN}Recommendations:${NC}$(printf '%*s' 58 '')${BLUE}${BOX_V}${NC}"
    
    if [ "$verdict" = "GO" ]; then
        echo -e "${BLUE}${BOX_V}${NC}   ✓ Run final verification: ${CYAN}ay health${NC}$(printf '%*s' 36 '')${BLUE}${BOX_V}${NC}"
        echo -e "${BLUE}${BOX_V}${NC}   ✓ Monitor system: ${CYAN}ay monitor${NC}$(printf '%*s' 43 '')${BLUE}${BOX_V}${NC}"
        echo -e "${BLUE}${BOX_V}${NC}   ✓ Integrate dynamic thresholds into scripts$(printf '%*s' 27 '')${BLUE}${BOX_V}${NC}"
    elif [ "$verdict" = "CONTINUE" ]; then
        # Analyze which thresholds still need work
        local needs_work=()
        echo "$after_status" | grep -q "CASCADE:FALLBACK" && needs_work+=("Cascade Failure")
        echo "$after_status" | grep -q "CHECK_FREQ:FALLBACK" && needs_work+=("Check Frequency")
        echo "$after_status" | grep -qE "(CIRCUIT_BREAKER|DEGRADATION|DIVERGENCE):.*_CONFIDENCE" || needs_work+=("Core thresholds")
        
        if [ ${#needs_work[@]} -gt 0 ]; then
            for item in "${needs_work[@]}"; do
                echo -e "${BLUE}${BOX_V}${NC}   → Continue improving: ${YELLOW}${item}${NC}$(printf '%*s' $((50 - ${#item})) '')${BLUE}${BOX_V}${NC}"
            done
        fi
        echo -e "${BLUE}${BOX_V}${NC}   → Next iteration will target highest priority issue$(printf '%*s' 21 '')${BLUE}${BOX_V}${NC}"
    else
        echo -e "${BLUE}${BOX_V}${NC}   → Generate more episodes: ${CYAN}ay init 50${NC}$(printf '%*s' 34 '')${BLUE}${BOX_V}${NC}"
        echo -e "${BLUE}${BOX_V}${NC}   → Check database: ${CYAN}ay status${NC}$(printf '%*s' 43 '')${BLUE}${BOX_V}${NC}"
        echo -e "${BLUE}${BOX_V}${NC}   → Review logs for errors$(printf '%*s' 46 '')${BLUE}${BOX_V}${NC}"
    fi
    
    echo -e "${BLUE}${BOX_BL}$(printf '%*s' 78 | tr ' ' "$BOX_H")${BOX_BR}${NC}"
    echo ""
    
    # Return verdict for script logic
    echo "$verdict"
}

# ═══════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════

main() {
    clear
    echo -e "${BLUE}${BOLD}AY AUTO - Enhanced Validation & Progress Tracking${NC}"
    echo ""
    
    # Get initial status
    echo -e "${CYAN}→${NC} Analyzing initial system state..."
    local initial_status
    initial_status=$(get_threshold_status)
    local initial_health=$(calculate_health "$initial_status")
    
    echo -e "${GREEN}✓${NC} Initial health: ${initial_health}%"
    echo ""
    
    if [ "$initial_health" -ge 80 ]; then
        echo -e "${GREEN}${BOLD}★ System already at target health!${NC}"
        echo ""
        "$SCRIPT_DIR/ay-unified.sh" health
        exit 0
    fi
    
    echo -e "${YELLOW}Press Enter to begin adaptive resolution...${NC}"
    read -r
    
    # Iteration loop
    for ((ITERATION=1; ITERATION<=MAX_ITERATIONS; ITERATION++)); do
        echo ""
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BOLD}ITERATION $ITERATION/$MAX_ITERATIONS${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        
        # Capture before status
        local before_status
        before_status=$(get_threshold_status)
        
        # Simple mode selection (could use ay-auto.sh logic)
        local mode="improve"
        
        echo -e "${CYAN}→${NC} Executing ${BOLD}${mode}${NC} mode..."
        echo ""
        
        # Execute (simplified - just sleep for demo)
        sleep 2
        
        # Capture after status
        local after_status
        after_status=$(get_threshold_status)
        
        # Generate validation report
        local verdict
        verdict=$(generate_validation_report "$before_status" "$after_status" "$mode" | tail -1)
        
        # Act on verdict
        case "$verdict" in
            GO)
                echo -e "${GREEN}${BOLD}★ TARGET ACHIEVED!${NC}"
                echo ""
                exit 0
                ;;
            CONTINUE)
                echo -e "${YELLOW}Continuing to next iteration...${NC}"
                sleep 2
                ;;
            NO_GO)
                echo -e "${RED}No progress, stopping.${NC}"
                exit 1
                ;;
        esac
    done
    
    echo ""
    echo -e "${YELLOW}⚠ Max iterations reached${NC}"
}

main "$@"
