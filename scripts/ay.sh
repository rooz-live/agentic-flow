#!/usr/bin/env bash
# ay - Agentic Yield: Iterative mode cycling with progress UI
# Resolves primary recommended actions with minimal cycles

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors & UI
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Progress tracking
TOTAL_ACTIONS=0
COMPLETED_ACTIONS=0
CYCLE_COUNT=0
START_TIME=$(date +%s)

# UI Components
clear_screen() {
    if command -v tput &>/dev/null; then
        tput clear 2>/dev/null || clear || printf "\033[2J\033[H"
    else
        clear 2>/dev/null || printf "\033[2J\033[H"
    fi
}

draw_progress_bar() {
    local current=$1
    local total=$2
    local width=50
    local percentage=$((current * 100 / total))
    local filled=$((width * current / total))
    local empty=$((width - filled))
    
    printf "${CYAN}["
    printf "%${filled}s" | tr ' ' '█'
    printf "%${empty}s" | tr ' ' '░'
    printf "]${NC} ${BOLD}%3d%%${NC}\n" "$percentage"
}

draw_header() {
    local mode=$1
    local cycle=$2
    
    echo -e "${BOLD}${MAGENTA}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${MAGENTA}║${NC}  ${CYAN}🚀 AGENTIC YIELD (ay)${NC} - Iterative Mode Cycling        ${BOLD}${MAGENTA}║${NC}"
    echo -e "${BOLD}${MAGENTA}╠════════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${BOLD}${MAGENTA}║${NC}  Current Mode: ${YELLOW}${mode}${NC}                                   ${BOLD}${MAGENTA}║${NC}"
    echo -e "${BOLD}${MAGENTA}║${NC}  Cycle: ${GREEN}${cycle}${NC}                                              ${BOLD}${MAGENTA}║${NC}"
    echo -e "${BOLD}${MAGENTA}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

draw_action_list() {
    local -n actions=$1
    local -n statuses=$2
    
    echo -e "${BOLD}Actions:${NC}"
    for i in "${!actions[@]}"; do
        local status="${statuses[$i]}"
        local icon="⏳"
        local color="${YELLOW}"
        
        case "$status" in
            "done")
                icon="✅"
                color="${GREEN}"
                ((COMPLETED_ACTIONS++)) || true
                ;;
            "running")
                icon="🔄"
                color="${CYAN}"
                ;;
            "failed")
                icon="❌"
                color="${RED}"
                ;;
            "skip")
                icon="⏭️"
                color="${BLUE}"
                ;;
        esac
        
        echo -e "  ${color}${icon} ${actions[$i]}${NC}"
    done
    echo ""
}

show_elapsed_time() {
    local elapsed=$(($(date +%s) - START_TIME))
    local mins=$((elapsed / 60))
    local secs=$((elapsed % 60))
    echo -e "${BLUE}⏱️  Elapsed: ${mins}m ${secs}s${NC}"
}

# Primary recommended actions from current system state
declare -a PRIMARY_ACTIONS=(
    "Check ceremony execution health"
    "Clean temporary episode files"
    "Trigger skill learning"
    "Validate episode data quality"
    "Run production ceremony test"
    "Verify dynamic thresholds"
)

declare -a ACTION_STATUS=()
for _ in "${PRIMARY_ACTIONS[@]}"; do
    ACTION_STATUS+=("pending")
done

TOTAL_ACTIONS=${#PRIMARY_ACTIONS[@]}

# Agent modes for cycling
declare -a AGENT_MODES=(
    "validator"
    "tester"
    "monitor"
    "reviewer"
)

# Mode implementations
mode_validator() {
    local action=$1
    
    case "$action" in
        "Check ceremony execution health")
            echo "Testing ceremony execution..."
            cd "$PROJECT_ROOT"
            if timeout 30 ./scripts/ay-yo.sh test &>/tmp/ay-ceremony-test.log; then
                return 0
            fi
            return 1
            ;;
        "Validate episode data quality")
            echo "Checking episode JSON structure..."
            cd "$PROJECT_ROOT"
            local latest=$(ls -t /tmp/episode_orchestrator_*.json 2>/dev/null | head -1)
            if [[ -n "$latest" ]] && jq -e '.skills | length > 0' "$latest" &>/dev/null; then
                return 0
            fi
            return 1
            ;;
        *)
            return 2  # Skip
            ;;
    esac
}

mode_tester() {
    local action=$1
    
    case "$action" in
        "Trigger skill learning")
            echo "Running learning cycles..."
            cd "$PROJECT_ROOT"
            # Run 3 quick learning cycles
            if timeout 60 ./scripts/ay-yo.sh learn 3 &>/tmp/ay-learn.log; then
                return 0
            fi
            return 1
            ;;
        "Run production ceremony test")
            echo "Testing production ceremony..."
            cd "$PROJECT_ROOT"
            if timeout 30 ./scripts/ay-prod.sh --check orchestrator standup &>/tmp/ay-prod-check.log; then
                return 0
            fi
            return 1
            ;;
        *)
            return 2  # Skip
            ;;
    esac
}

mode_monitor() {
    local action=$1
    
    case "$action" in
        "Clean temporary episode files")
            echo "Cleaning up /tmp/episode_*.json files..."
            cd "$PROJECT_ROOT"
            local before=$(ls -1 /tmp/episode_*.json 2>/dev/null | wc -l | tr -d ' ')
            rm -f /tmp/episode_run_*.json /tmp/episode_unknown.json 2>/dev/null || true
            local after=$(ls -1 /tmp/episode_*.json 2>/dev/null | wc -l | tr -d ' ')
            if (( before > after )); then
                echo "Cleaned $((before - after)) files"
                return 0
            fi
            return 1
            ;;
        "Verify dynamic thresholds")
            echo "Checking dynamic threshold script..."
            cd "$PROJECT_ROOT"
            if [[ -x scripts/ay-dynamic-thresholds.sh ]]; then
                return 0
            fi
            return 1
            ;;
        *)
            return 2  # Skip
            ;;
    esac
}

mode_reviewer() {
    local action=$1
    
    case "$action" in
        "Validate ROAM score reduction")
            echo "Calculating ROAM improvement..."
            # Check if documentation exists with score data
            if grep -q "8.5/10 → 2.5/10" docs/WSJF-MIGRATION-COMPLETE.md 2>/dev/null; then
                return 0
            fi
            return 1
            ;;
        *)
            return 2  # Skip
            ;;
    esac
}

# Execute action with current mode
execute_action() {
    local mode=$1
    local action_idx=$2
    local action="${PRIMARY_ACTIONS[$action_idx]}"
    
    local result=2  # Default: skip
    
    case "$mode" in
        "validator")
            mode_validator "$action"
            result=$?
            ;;
        "tester")
            mode_tester "$action"
            result=$?
            ;;
        "monitor")
            mode_monitor "$action"
            result=$?
            ;;
        "reviewer")
            mode_reviewer "$action"
            result=$?
            ;;
    esac
    
    return $result
}

# Main UI loop
run_cycle() {
    local mode_idx=0
    local all_done=false
    
    while [[ "$all_done" == "false" ]]; do
        ((CYCLE_COUNT++))
        local current_mode="${AGENT_MODES[$mode_idx]}"
        
        clear_screen
        draw_header "$current_mode" "$CYCLE_COUNT"
        
        # Reset completion counter for UI
        COMPLETED_ACTIONS=0
        for status in "${ACTION_STATUS[@]}"; do
            [[ "$status" == "done" ]] && ((COMPLETED_ACTIONS++)) || true
        done
        
        draw_progress_bar "$COMPLETED_ACTIONS" "$TOTAL_ACTIONS"
        echo ""
        draw_action_list PRIMARY_ACTIONS ACTION_STATUS
        show_elapsed_time
        echo ""
        
        # Execute actions for current mode
        local actions_processed=0
        for i in "${!PRIMARY_ACTIONS[@]}"; do
            if [[ "${ACTION_STATUS[$i]}" == "pending" ]]; then
                ACTION_STATUS[$i]="running"
                
                # Update UI
                clear_screen
                draw_header "$current_mode" "$CYCLE_COUNT"
                COMPLETED_ACTIONS=0
                for status in "${ACTION_STATUS[@]}"; do
                    [[ "$status" == "done" ]] && ((COMPLETED_ACTIONS++)) || true
                done
                draw_progress_bar "$COMPLETED_ACTIONS" "$TOTAL_ACTIONS"
                echo ""
                draw_action_list PRIMARY_ACTIONS ACTION_STATUS
                show_elapsed_time
                echo ""
                echo -e "${CYAN}▶ Processing: ${PRIMARY_ACTIONS[$i]}${NC}"
                
                # Execute
                if execute_action "$current_mode" "$i"; then
                    ACTION_STATUS[$i]="done"
                    echo -e "${GREEN}✅ Success${NC}"
                    ((actions_processed++))
                    sleep 0.5
                elif [[ $? -eq 2 ]]; then
                    ACTION_STATUS[$i]="pending"  # Skip, try again
                    echo -e "${BLUE}⏭️  Skipped (not for this mode)${NC}"
                    sleep 0.3
                else
                    ACTION_STATUS[$i]="failed"
                    echo -e "${RED}❌ Failed${NC}"
                    sleep 0.5
                fi
            fi
        done
        
        # Check if all done
        local pending_count=0
        for status in "${ACTION_STATUS[@]}"; do
            [[ "$status" == "pending" ]] && ((pending_count++)) || true
        done
        
        if [[ $pending_count -eq 0 ]]; then
            all_done=true
        else
            # Cycle to next mode
            mode_idx=$(( (mode_idx + 1) % ${#AGENT_MODES[@]} ))
            sleep 1
        fi
        
        # Safety: max 20 cycles
        if [[ $CYCLE_COUNT -ge 20 ]]; then
            echo -e "${YELLOW}⚠️  Max cycles reached (20)${NC}"
            all_done=true
        fi
    done
}

# Generate final report
generate_report() {
    clear_screen
    
    echo -e "${BOLD}${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${GREEN}║${NC}              ${BOLD}AGENTIC YIELD - FINAL REPORT${NC}                  ${BOLD}${GREEN}║${NC}"
    echo -e "${BOLD}${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Calculate stats
    local done_count=0
    local failed_count=0
    local skipped_count=0
    
    for status in "${ACTION_STATUS[@]}"; do
        case "$status" in
            "done") ((done_count++)) ;;
            "failed") ((failed_count++)) ;;
            "pending"|"skip") ((skipped_count++)) ;;
        esac
    done
    
    local success_rate=$((done_count * 100 / TOTAL_ACTIONS))
    
    echo -e "${BOLD}Summary:${NC}"
    echo -e "  Total Actions:    ${TOTAL_ACTIONS}"
    echo -e "  ${GREEN}✅ Completed:      ${done_count}${NC}"
    echo -e "  ${RED}❌ Failed:         ${failed_count}${NC}"
    echo -e "  ${YELLOW}⏭️  Skipped:        ${skipped_count}${NC}"
    echo -e "  ${BLUE}🔄 Total Cycles:   ${CYCLE_COUNT}${NC}"
    echo ""
    
    # Progress bar
    echo -e "${BOLD}Success Rate:${NC}"
    draw_progress_bar "$done_count" "$TOTAL_ACTIONS"
    echo ""
    
    # Time stats
    local elapsed=$(($(date +%s) - START_TIME))
    local mins=$((elapsed / 60))
    local secs=$((elapsed % 60))
    echo -e "${BOLD}Performance:${NC}"
    echo -e "  Total Time:       ${mins}m ${secs}s"
    echo -e "  Avg per Action:   $((elapsed / TOTAL_ACTIONS))s"
    echo ""
    
    # Go/No-Go decision
    echo -e "${BOLD}${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
    if [[ $success_rate -ge 80 ]]; then
        echo -e "${BOLD}${GREEN}✅ GO: Ready for production deployment${NC}"
        echo -e "${GREEN}   Success rate: ${success_rate}% (target: ≥80%)${NC}"
        echo ""
        echo -e "${BOLD}Next Steps:${NC}"
        echo -e "  1. Review migration patches: backups/*/migration.patch"
        echo -e "  2. Deploy to staging (10% traffic)"
        echo -e "  3. Monitor: ./scripts/monitor-threshold-performance.sh"
        echo -e "  4. Gradual rollout: 10% → 50% → 100%"
    elif [[ $success_rate -ge 50 ]]; then
        echo -e "${BOLD}${YELLOW}⚠️  CONDITIONAL GO: Proceed with caution${NC}"
        echo -e "${YELLOW}   Success rate: ${success_rate}% (target: ≥80%)${NC}"
        echo ""
        echo -e "${BOLD}Action Required:${NC}"
        echo -e "  1. Review failed actions above"
        echo -e "  2. Fix issues and re-run: ./scripts/ay.sh"
        echo -e "  3. Deploy only after reaching 80%+ success"
    else
        echo -e "${BOLD}${RED}❌ NO-GO: Critical issues found${NC}"
        echo -e "${RED}   Success rate: ${success_rate}% (target: ≥80%)${NC}"
        echo ""
        echo -e "${BOLD}Action Required:${NC}"
        echo -e "  1. Review logs: /tmp/ay-*.log"
        echo -e "  2. Fix failed actions"
        echo -e "  3. Re-run: ./scripts/ay.sh"
        echo -e "  4. Do NOT deploy until issues resolved"
    fi
    echo -e "${BOLD}${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Detailed action status
    echo -e "${BOLD}Detailed Results:${NC}"
    for i in "${!PRIMARY_ACTIONS[@]}"; do
        local status="${ACTION_STATUS[$i]}"
        local icon="⏳"
        local color="${YELLOW}"
        
        case "$status" in
            "done")
                icon="✅"
                color="${GREEN}"
                ;;
            "running")
                icon="🔄"
                color="${CYAN}"
                ;;
            "failed")
                icon="❌"
                color="${RED}"
                ;;
            *)
                icon="⏭️"
                color="${BLUE}"
                ;;
        esac
        
        echo -e "  ${color}${icon} ${PRIMARY_ACTIONS[$i]}${NC}"
    done
    echo ""
    
    # Save report
    local report_file="reports/ay-report-$(date +%Y%m%d-%H%M%S).txt"
    mkdir -p reports
    {
        echo "AGENTIC YIELD (ay) - Report"
        echo "Generated: $(date)"
        echo ""
        echo "Total Actions: $TOTAL_ACTIONS"
        echo "Completed: $done_count"
        echo "Failed: $failed_count"
        echo "Skipped: $skipped_count"
        echo "Cycles: $CYCLE_COUNT"
        echo "Success Rate: ${success_rate}%"
        echo "Elapsed Time: ${mins}m ${secs}s"
        echo ""
        echo "Go/No-Go: $([ $success_rate -ge 80 ] && echo 'GO' || echo 'NO-GO')"
    } > "$report_file"
    
    echo -e "${BLUE}📄 Report saved: $report_file${NC}"
    echo ""
}

# Main entry point
main() {
    cd "$PROJECT_ROOT"
    
    echo -e "${CYAN}Initializing Agentic Yield...${NC}"
    sleep 1
    
    run_cycle
    generate_report
    
    # Exit code based on success rate
    local done_count=0
    for status in "${ACTION_STATUS[@]}"; do
        [[ "$status" == "done" ]] && ((done_count++)) || true
    done
    
    local success_rate=$((done_count * 100 / TOTAL_ACTIONS))
    
    if [[ $success_rate -ge 80 ]]; then
        exit 0  # GO
    elif [[ $success_rate -ge 50 ]]; then
        exit 1  # CONDITIONAL GO
    else
        exit 2  # NO-GO
    fi
}

main "$@"
