#!/usr/bin/env bash
set -euo pipefail

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ay smart-cycle - Intelligent Auto-Improvement Orchestrator
# Automatically selects and cycles through improvement modes
# until primary recommended actions are resolved
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_PATH="${PROJECT_ROOT}/agentdb.db"

# CI mode flag (non-interactive gating)
CI_MODE=0

# Colors & Formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# Configuration
MAX_ITERATIONS=${AY_MAX_ITERATIONS:-10}
MIN_SUCCESS_RATE=70
MIN_EQUITY_SCORE=65
TARGET_COMPLETION=75
DRY_RUN=${AY_DRY_RUN:-0}

# Progress tracking
ITERATION=0
ACTIONS_RESOLVED=0
TOTAL_ACTIONS=0
START_TIME=$(date +%s)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# UI Components
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

print_banner() {
    clear
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC} ${BOLD}🎯 ay Smart Cycle - Intelligent Auto-Improvement${NC}        ${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_progress_bar() {
    local current=$1
    local total=$2
    local width=40
    local percentage=$((current * 100 / total))
    local filled=$((current * width / total))
    local empty=$((width - filled))
    
    printf "${CYAN}Progress: [${NC}"
    printf "${GREEN}%${filled}s${NC}" | tr ' ' '█'
    printf "%${empty}s" | tr ' ' '░'
    printf "${CYAN}]${NC} ${BOLD}%3d%%${NC} (%d/%d)\n" "$percentage" "$current" "$total"
}

print_section() {
    echo ""
    echo -e "${BLUE}▶${NC} ${BOLD}$1${NC}"
}

print_metric() {
    local label=$1
    local value=$2
    local target=$3
    local status_icon
    
    if (( $(echo "$value >= $target" | bc -l 2>/dev/null || echo "0") )); then
        status_icon="${GREEN}✓${NC}"
    else
        status_icon="${YELLOW}⚠${NC}"
    fi
    
    printf "  %-25s: ${BOLD}%6.1f%%${NC} (target: %d%%) %s\n" "$label" "$value" "$target" "$status_icon"
}

print_action() {
    local action=$1
    local status=$2
    
    case "$status" in
        pending)
            echo -e "  ${DIM}⏳ $action${NC}"
            ;;
        running)
            echo -e "  ${YELLOW}⚙${NC}  ${BOLD}$action${NC} ${DIM}(executing...)${NC}"
            ;;
        success)
            echo -e "  ${GREEN}✓${NC}  $action ${DIM}(complete)${NC}"
            ;;
        skipped)
            echo -e "  ${BLUE}○${NC}  $action ${DIM}(not needed)${NC}"
            ;;
        failed)
            echo -e "  ${RED}✗${NC}  $action ${DIM}(failed)${NC}"
            ;;
    esac
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Analysis Functions
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

analyze_system_state() {
    print_section "📊 Analyzing System State"
    
    local -A state
    
    # Get overall metrics from AgentDB
    if [[ -f "$DB_PATH" ]]; then
        local total_eps=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes;" 2>/dev/null || echo "0")
        local success_eps=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes WHERE success = 1;" 2>/dev/null || echo "0")
        local success_rate=$(echo "scale=1; $success_eps * 100 / $total_eps" | bc 2>/dev/null || echo "0.0")
        
        state[total_episodes]=$total_eps
        state[success_rate]=$success_rate
    else
        state[total_episodes]=0
        state[success_rate]=0.0
    fi
    
    # Get circle performance from completion tracker
    if [[ -f "$DB_PATH" ]]; then
        local avg_completion=$(sqlite3 "$DB_PATH" \
            "SELECT COALESCE(ROUND(AVG(completion_pct)), 0) FROM completion_episodes;" \
            2>/dev/null || echo "0")
        state[avg_completion]=$avg_completion
    else
        state[avg_completion]=0
    fi
    
    # Calculate equity score (variance in circle performance)
    local equity_score=50
    if [[ -f "$DB_PATH" ]]; then
        local circle_variance=$(sqlite3 "$DB_PATH" <<EOF 2>/dev/null || echo "100"
SELECT COALESCE(
    ROUND(
        AVG(
            (completion_pct - (SELECT AVG(completion_pct) FROM completion_episodes)) * 
            (completion_pct - (SELECT AVG(completion_pct) FROM completion_episodes))
        )
    ),
    100
)
FROM completion_episodes;
EOF
)
        # Normalize: lower variance = higher equity score
        # Convert float to integer before bash arithmetic
        local variance_int=$(printf "%.0f" "$circle_variance")
        equity_score=$((100 - variance_int / 10))
        [[ $equity_score -lt 0 ]] && equity_score=0
        [[ $equity_score -gt 100 ]] && equity_score=100
    fi
    state[equity_score]=$equity_score
    
    # Count underperforming circles
    local low_circles=0
    if [[ -f "$DB_PATH" ]]; then
        low_circles=$(sqlite3 "$DB_PATH" \
            "SELECT COUNT(DISTINCT circle) FROM completion_episodes 
             WHERE circle IN (
                 SELECT circle FROM completion_episodes 
                 GROUP BY circle 
                 HAVING AVG(completion_pct) < $MIN_SUCCESS_RATE
             );" 2>/dev/null || echo "0")
    fi
    state[low_circles]=$low_circles
    
    # Display metrics
    echo ""
    print_metric "Success Rate" "${state[success_rate]}" "$MIN_SUCCESS_RATE"
    print_metric "Avg Completion" "${state[avg_completion]}" "$TARGET_COMPLETION"
    print_metric "Equity Score" "${state[equity_score]}" "$MIN_EQUITY_SCORE"
    echo ""
    echo -e "  ${DIM}Episodes: ${state[total_episodes]} | Underperforming Circles: ${state[low_circles]}${NC}"
    
    # Export state for decision making
    for key in "${!state[@]}"; do
        echo "$key=${state[$key]}"
    done
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Decision Engine
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

select_next_mode() {
    local state_file="$1"
    
    # Parse state
    declare -A state
    while IFS='=' read -r key value; do
        state[$key]=$value
    done < "$state_file"
    
    print_section "🧠 Selecting Next Improvement Mode"
    echo ""
    
    # Decision tree based on metrics
    local selected_mode=""
    local reason=""
    
    # Priority 1: Fix broken circles (WSJF for targeted fixing)
    if [[ ${state[low_circles]:-0} -gt 0 ]]; then
        selected_mode="wsjf"
        reason="$((state[low_circles])) underperforming circles detected"
    
    # Priority 2: Improve equity (continuous improvement)
    elif (( $(echo "${state[equity_score]:-50} < $MIN_EQUITY_SCORE" | bc -l 2>/dev/null || echo "1") )); then
        selected_mode="continuous"
        reason="Equity score ${state[equity_score]}% below threshold ($MIN_EQUITY_SCORE%)"
    
    # Priority 3: Boost success rate (WSJF iteration)
    elif (( $(echo "${state[success_rate]:-0} < $MIN_SUCCESS_RATE" | bc -l 2>/dev/null || echo "1") )); then
        selected_mode="wsjf"
        reason="Success rate ${state[success_rate]}% below threshold ($MIN_SUCCESS_RATE%)"
    
    # Priority 4: Improve overall completion (cycle all circles)
    elif (( $(echo "${state[avg_completion]:-0} < $TARGET_COMPLETION" | bc -l 2>/dev/null || echo "1") )); then
        selected_mode="cycle"
        reason="Average completion ${state[avg_completion]}% below target ($TARGET_COMPLETION%)"
    
    # All metrics healthy - monitor only
    else
        selected_mode="monitor"
        reason="All metrics healthy - monitoring mode"
    fi
    
    echo -e "  ${CYAN}Selected Mode:${NC} ${BOLD}$selected_mode${NC}"
    echo -e "  ${DIM}Reason: $reason${NC}"
    echo ""
    
    echo "$selected_mode"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Execution Engine
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

execute_mode() {
    local mode=$1
    local iteration=$2
    
    print_section "⚙️  Executing Mode: $mode (Iteration $iteration)"
    echo ""
    
    if [[ $DRY_RUN -eq 1 ]]; then
        echo -e "  ${YELLOW}DRY RUN${NC} - Would execute: ay improve $mode"
        sleep 2
        return 0
    fi
    
    local start_time=$(date +%s)
    local success=0
    
    case "$mode" in
        wsjf)
            print_action "Run WSJF iteration (top 3)" "running"
            if "$SCRIPT_DIR/ay-wsjf-iterate.sh" iterate 3 2>&1 | tail -20; then
                success=1
            fi
            ;;
        continuous)
            print_action "Run continuous improvement cycle" "running"
            if "$SCRIPT_DIR/ay-continuous-improve.sh" oneshot 2>&1 | tail -20; then
                success=1
            fi
            ;;
        cycle)
            print_action "Run full WSJF cycle" "running"
            if "$SCRIPT_DIR/ay-wsjf-iterate.sh" cycle 1 2>&1 | tail -20; then
                success=1
            fi
            ;;
        monitor)
            print_action "Monitor (no action needed)" "skipped"
            success=1
            ;;
    esac
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    if [[ $success -eq 1 ]]; then
        echo -e "  ${GREEN}✓${NC} Completed in ${duration}s"
        return 0
    else
        echo -e "  ${RED}✗${NC} Failed after ${duration}s"
        return 1
    fi
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Validation & Testing
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Draw progress bar for metric
draw_progress_bar() {
    local label="$1"
    local current=$2
    local target=$3
    local width=40
    
    # Calculate percentage
    local pct=$(echo "scale=1; $current * 100 / $target" | bc 2>/dev/null || echo "0")
    [[ $(echo "$pct > 100" | bc -l) -eq 1 ]] && pct=100
    
    # Calculate filled bars
    local filled=$(echo "scale=0; $width * $pct / 100" | bc 2>/dev/null || echo "0")
    [[ $filled -gt $width ]] && filled=$width
    local empty=$((width - filled))
    
    # Choose color based on achievement
    local color="$RED"
    [[ $(echo "$pct >= 70" | bc -l) -eq 1 ]] && color="$YELLOW"
    [[ $(echo "$pct >= 100" | bc -l) -eq 1 ]] && color="$GREEN"
    
    # Build bar
    local bar=""
    for ((i=0; i<filled; i++)); do bar+="█"; done
    for ((i=0; i<empty; i++)); do bar+="░"; done
    
    # Status icon
    local icon="⚠"
    [[ $(echo "$pct >= 100" | bc -l) -eq 1 ]] && icon="✓"
    
    printf "  %-20s ${color}%s${NC} %5.1f%% ${color}%s${NC}\n" "$label" "$bar" "$pct" "$icon"
}

validate_improvements() {
    local before_file=$1
    local after_file=$2
    
    print_section "✅ Validating Improvements"
    echo ""
    
    # Parse before/after states
    declare -A before after
    while IFS='=' read -r key value; do before[$key]=$value; done < "$before_file"
    while IFS='=' read -r key value; do after[$key]=$value; done < "$after_file"
    
    local improvements=0
    
    # Check success rate
    if (( $(echo "${after[success_rate]:-0} > ${before[success_rate]:-0}" | bc -l 2>/dev/null || echo "0") )); then
        local delta=$(echo "${after[success_rate]} - ${before[success_rate]}" | bc)
        echo -e "  ${GREEN}✓${NC} Success rate improved: ${BOLD}+${delta}%${NC}"
        ((improvements++))
    fi
    
    # Check completion
    if (( $(echo "${after[avg_completion]:-0} > ${before[avg_completion]:-0}" | bc -l 2>/dev/null || echo "0") )); then
        local delta=$(echo "${after[avg_completion]} - ${before[avg_completion]}" | bc)
        echo -e "  ${GREEN}✓${NC} Avg completion improved: ${BOLD}+${delta}%${NC}"
        ((improvements++))
    fi
    
    # Check equity
    if (( $(echo "${after[equity_score]:-0} > ${before[equity_score]:-0}" | bc -l 2>/dev/null || echo "0") )); then
        local delta=$(echo "${after[equity_score]} - ${before[equity_score]}" | bc)
        echo -e "  ${GREEN}✓${NC} Equity score improved: ${BOLD}+${delta}%${NC}"
        ((improvements++))
    fi
    
    # Check circle fixes
    if (( ${after[low_circles]:-0} < ${before[low_circles]:-0} )); then
        local delta=$((before[low_circles] - after[low_circles]))
        echo -e "  ${GREEN}✓${NC} Underperforming circles reduced: ${BOLD}-${delta}${NC}"
        ((improvements++))
    fi
    
    if [[ $improvements -eq 0 ]]; then
        echo -e "  ${YELLOW}⚠${NC} No measurable improvements this iteration"
        return 1
    fi
    
    echo ""
    echo -e "  ${BOLD}Total improvements: $improvements${NC}"
    return 0
}

# Generate GO/NO-GO verdict
generate_verdict() {
    local state_file=$1
    local iteration=$2
    
    # Parse state - use simpler variable names
    local success_rate=$(grep "^success_rate=" "$state_file" | cut -d'=' -f2)
    local equity_score=$(grep "^equity_score=" "$state_file" | cut -d'=' -f2)
    local avg_completion=$(grep "^avg_completion=" "$state_file" | cut -d'=' -f2)
    local low_circles=$(grep "^low_circles=" "$state_file" | cut -d'=' -f2)
    
    # Defaults
    success_rate=${success_rate:-0}
    equity_score=${equity_score:-0}
    avg_completion=${avg_completion:-0}
    low_circles=${low_circles:-0}
    
    print_section "🎯 TEST CRITERIA & VERDICT (Iteration $iteration)"
    echo ""
    
    # Draw progress bars for each metric
    draw_progress_bar "Success Rate" "$success_rate" "$MIN_SUCCESS_RATE"
    draw_progress_bar "Equity Score" "$equity_score" "$MIN_EQUITY_SCORE"
    draw_progress_bar "Avg Completion" "$avg_completion" "$TARGET_COMPLETION"
    
    echo ""
    
    # Count targets met
    local targets_met=0
    local targets_total=3
    
    (( $(echo "$success_rate >= $MIN_SUCCESS_RATE" | bc -l 2>/dev/null || echo "0") )) && ((targets_met++))
    (( $(echo "$equity_score >= $MIN_EQUITY_SCORE" | bc -l 2>/dev/null || echo "0") )) && ((targets_met++))
    (( $(echo "$avg_completion >= $TARGET_COMPLETION" | bc -l 2>/dev/null || echo "0") )) && ((targets_met++))
    
    # Determine verdict
    local verdict
    local verdict_color
    local verdict_icon
    
    if [[ $targets_met -eq $targets_total ]]; then
        verdict="GO"
        verdict_color="$GREEN"
        verdict_icon="✓"
    elif [[ $targets_met -ge 2 ]]; then
        verdict="CONTINUE"
        verdict_color="$YELLOW"
        verdict_icon="⚙"
    else
        verdict="NO-GO"
        verdict_color="$RED"
        verdict_icon="✗"
    fi
    
    echo -e "  ${BOLD}Targets Met:${NC} $targets_met / $targets_total"
    echo ""
    echo -e "  ${verdict_color}${BOLD}═══════════════════════════════════════${NC}"
    echo -e "  ${verdict_color}${BOLD}  VERDICT: $verdict $verdict_icon${NC}"
    echo -e "  ${verdict_color}${BOLD}═══════════════════════════════════════${NC}"
    echo ""
    
    # Recommendations
    print_section "📋 RECOMMENDATIONS"
    echo ""
    
    if [[ $targets_met -eq $targets_total ]]; then
        echo -e "  ${GREEN}✓${NC} ${BOLD}All targets achieved - ready for production!${NC}"
        echo -e "  ${DIM}Next steps:${NC}"
        echo -e "    • Run full integration tests"
        echo -e "    • Deploy to staging environment"
        echo -e "    • Monitor production metrics"
    elif [[ $targets_met -ge 2 ]]; then
        echo -e "  ${YELLOW}⚙${NC} ${BOLD}Making good progress - continue optimizing${NC}"
        echo -e "  ${DIM}Recommended actions:${NC}"
        
        # Specific recommendations based on what's failing
        if (( $(echo "$success_rate < $MIN_SUCCESS_RATE" | bc -l 2>/dev/null || echo "0") )); then
            echo -e "    • ${YELLOW}Priority:${NC} Improve success rate (currently ${success_rate}%)" 
            echo -e "      → Run: ${CYAN}ay improve wsjf 5${NC}"
        fi
        if (( $(echo "$equity_score < $MIN_EQUITY_SCORE" | bc -l 2>/dev/null || echo "0") )); then
            echo -e "    • ${YELLOW}Priority:${NC} Balance circle performance (equity ${equity_score}%)"
            echo -e "      → Run: ${CYAN}ay improve continuous${NC}"
        fi
        if (( $(echo "$avg_completion < $TARGET_COMPLETION" | bc -l 2>/dev/null || echo "0") )); then
            echo -e "    • ${YELLOW}Priority:${NC} Increase completion rate (currently ${avg_completion}%)"
            echo -e "      → Run: ${CYAN}ay improve cycle 2${NC}"
        fi
    else
        echo -e "  ${RED}✗${NC} ${BOLD}Significant improvements needed${NC}"
        echo -e "  ${DIM}Critical actions required:${NC}"
        
        if (( low_circles > 0 )); then
            echo -e "    • ${RED}Critical:${NC} Fix $low_circles underperforming circles"
            echo -e "      → Run: ${CYAN}ay improve wsjf 10${NC}"
        fi
        if (( $(echo "$success_rate < 50" | bc -l 2>/dev/null || echo "0") )); then
            echo -e "    • ${RED}Critical:${NC} Success rate critically low (${success_rate}%)"
            echo -e "      → Review logs: ${CYAN}ay logs${NC}"
            echo -e "      → Check ceremonies: ${CYAN}ay ceremony status${NC}"
        fi
        if (( $(echo "$equity_score < 40" | bc -l 2>/dev/null || echo "0") )); then
            echo -e "    • ${RED}Critical:${NC} Severe performance imbalance"
            echo -e "      → Run full rebalance: ${CYAN}ay improve continuous${NC}"
        fi
    fi
    
    echo ""
    return $targets_met
}

check_exit_conditions() {
    local state_file=$1
    
    # Parse state
    declare -A state
    while IFS='=' read -r key value; do
        state[$key]=$value
    done < "$state_file"
    
    # Check if all targets met
    local targets_met=0
    local targets_total=3
    
    (( $(echo "${state[success_rate]:-0} >= $MIN_SUCCESS_RATE" | bc -l 2>/dev/null || echo "0") )) && ((targets_met++))
    (( $(echo "${state[equity_score]:-0} >= $MIN_EQUITY_SCORE" | bc -l 2>/dev/null || echo "0") )) && ((targets_met++))
    (( $(echo "${state[avg_completion]:-0} >= $TARGET_COMPLETION" | bc -l 2>/dev/null || echo "0") )) && ((targets_met++))
    
    if [[ $targets_met -eq $targets_total ]]; then
        return 0  # Exit - all targets met
    fi
    
    return 1  # Continue
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Main Orchestration Loop
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

main() {
    print_banner
    
    echo -e "${BOLD}Configuration:${NC}"
    echo -e "  Max Iterations: $MAX_ITERATIONS"
    echo -e "  Success Rate Target: $MIN_SUCCESS_RATE%"
    echo -e "  Equity Target: $MIN_EQUITY_SCORE%"
    echo -e "  Completion Target: $TARGET_COMPLETION%"
    [[ $DRY_RUN -eq 1 ]] && echo -e "  ${YELLOW}Mode: DRY RUN${NC}"
    echo ""
    
    # Prompt only when interactive
    if [ -t 0 ]; then
        read -p "Press Enter to start, or Ctrl+C to cancel..."
    fi
    
    # Initial state
    local state_before="/tmp/ay-smart-cycle-state-before.txt"
    local state_after="/tmp/ay-smart-cycle-state-after.txt"
    
    # Capture only raw key=value lines from analysis output
    analyze_system_state | grep -E '^[a-zA-Z0-9_]+=' > "$state_before"
    
    # Main loop
    LAST_TARGETS_MET=0
    for ((ITERATION=1; ITERATION<=MAX_ITERATIONS; ITERATION++)); do
        print_banner
        print_progress_bar "$ITERATION" "$MAX_ITERATIONS"
        echo ""
        
        # Analyze current state
        analyze_system_state | grep -E '^[a-zA-Z0-9_]+=' > "$state_after"
        
        # Generate verdict and recommendations (capture non-zero safely under set -e)
        set +e
        generate_verdict "$state_after" "$ITERATION"
        local verdict_code=$?
        set -e
        LAST_TARGETS_MET=$verdict_code
        # Audit: record verdict snapshot if logger exists
        if [[ -x "$SCRIPT_DIR/decision-audit-logger.sh" ]]; then
            "$SCRIPT_DIR/decision-audit-logger.sh" "verdict" "iteration=$ITERATION;targets_met=$verdict_code" "state_file=$state_after"
        fi
        
        # Check exit conditions
        if check_exit_conditions "$state_after"; then
            print_section "🎉 All Targets Achieved!"
            echo ""
            echo -e "  ${GREEN}Success!${NC} All metrics meet or exceed targets."
            echo -e "  ${DIM}Completed in $ITERATION iterations${NC}"
            break
        fi
        
        # Validate improvements from previous iteration
        if [[ $ITERATION -gt 1 ]]; then
            echo ""
            if ! validate_improvements "$state_before" "$state_after"; then
                echo -e "  ${YELLOW}Note:${NC} Consider manual intervention if no progress"
            fi
        fi
        
        # Check for NO-GO verdict (0 targets met)
        if [[ $verdict_code -eq 0 && $ITERATION -gt 3 ]]; then
            echo ""
            echo -e "  ${RED}⚠ NO-GO verdict after 3+ iterations - stopping for manual review${NC}"
            break
        fi
        
        # Select next mode
        cp "$state_after" "$state_before"
        local next_mode=$(select_next_mode "$state_after")
        
        # Audit: record mode selection if logger exists
        if [[ -x "$SCRIPT_DIR/decision-audit-logger.sh" ]]; then
            "$SCRIPT_DIR/decision-audit-logger.sh" "mode_select" "iteration=$ITERATION;mode=$next_mode" "state_file=$state_after"
        fi
        
        # Execute
        if ! execute_mode "$next_mode" "$ITERATION"; then
            echo -e "  ${RED}Execution failed - continuing to next iteration${NC}"
        fi
        
        # Brief pause
        echo ""
        if [[ $ITERATION -lt $MAX_ITERATIONS ]]; then
            echo -e "${DIM}Next iteration in 3 seconds...${NC}"
            sleep 3
        fi
    done
    
    # Final summary
    local end_time=$(date +%s)
    local total_duration=$((end_time - START_TIME))
    
    print_banner
    print_section "📈 Final Summary"
    echo ""
    
    analyze_system_state > "$state_after"
    
    # Show before/after
    declare -A before after
    # Read without subshell and skip empty keys
    while IFS='=' read -r key value; do
        [[ -z "$key" ]] && continue
        before[$key]="$value"
    done < "$state_before"
    while IFS='=' read -r key value; do
        [[ -z "$key" ]] && continue
        after[$key]="$value"
    done < "$state_after"
    
    echo -e "${BOLD}Iterations Completed:${NC} $ITERATION / $MAX_ITERATIONS"
    echo -e "${BOLD}Total Duration:${NC} ${total_duration}s"
    echo ""
    
    # Cleanup
    rm -f "$state_before" "$state_after"
    
    echo -e "${GREEN}✓${NC} Smart cycle complete"
    echo ""
    echo -e "${DIM}View full dashboard: ${NC}${CYAN}ay improve dashboard${NC}"

    # CI gate: exit non-zero when fewer than 2 targets met in last iteration
    if [[ $CI_MODE -eq 1 ]]; then
        if [[ $LAST_TARGETS_MET -lt 2 ]]; then
            exit 2
        else
            exit 0
        fi
    fi
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Entry Point
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Flags
for arg in "$@"; do
    case "$arg" in
        --dry-run)
            DRY_RUN=1
            ;;
        --ci)
            CI_MODE=1
            ;;
    esac
done

if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
    cat <<EOF
${BOLD}ay smart-cycle - Intelligent Auto-Improvement Orchestrator${NC}

${BOLD}USAGE:${NC}
  ay smart-cycle [--dry-run] [--help]

${BOLD}DESCRIPTION:${NC}
  Automatically analyzes system state, selects optimal improvement modes,
  and cycles through them until primary recommended actions are resolved.

${BOLD}FEATURES:${NC}
  • Intelligent mode selection based on current metrics
  • Progress tracking with visual UI
  • Automatic validation of improvements
  • Exit when targets achieved or max iterations reached

${BOLD}TARGETS:${NC}
  • Success Rate: ${MIN_SUCCESS_RATE}%
  • Equity Score: ${MIN_EQUITY_SCORE}%
  • Avg Completion: ${TARGET_COMPLETION}%

${BOLD}MODES:${NC}
  • wsjf - Fix underperforming circles
  • continuous - Improve equity balance
  • cycle - Boost overall completion
  • monitor - Watch only (targets met)

${BOLD}OPTIONS:${NC}
  --dry-run    Simulate without executing
  --help       Show this help

${BOLD}ENVIRONMENT:${NC}
  AY_MAX_ITERATIONS    Max cycles (default: 10)
  AY_DRY_RUN          Dry run mode (default: 0)

${BOLD}EXAMPLES:${NC}
  # Run smart cycle
  ay smart-cycle

  # Dry run (test without executing)
  ay smart-cycle --dry-run

EOF
    exit 0
fi

main "$@"
