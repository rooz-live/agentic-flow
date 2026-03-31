#!/usr/bin/env bash
# ay-auto.sh - Adaptive Auto-Resolution with Iterative Strategy Cycling
# Intelligently selects modes, tests solutions, and shows progress via enhanced TUI
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
AGENTDB_PATH="${AGENTDB_PATH:-${ROOT_DIR}/agentdb.db}"

# Colors & Styles
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly CYAN='\033[0;36m'
readonly BLUE='\033[0;34m'
readonly MAGENTA='\033[0;35m'
readonly BOLD='\033[1m'
readonly DIM='\033[2m'
readonly NC='\033[0m'

# Box drawing characters
readonly BOX_H="━"
readonly BOX_V="┃"
readonly BOX_TL="┏"
readonly BOX_TR="┓"
readonly BOX_BL="┗"
readonly BOX_BR="┛"
readonly BOX_ML="┣"
readonly BOX_MR="┫"
readonly BOX_MT="┳"
readonly BOX_MB="┻"
readonly BOX_MC="╋"

# Progress indicators
readonly SPINNER=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')
readonly CHECK="✓"
readonly CROSS="✗"
readonly ARROW="→"
readonly STAR="★"

# Configuration & Parameterization
MAX_ITERATIONS="${MAX_ITERATIONS:-5}"
MIN_CONFIDENCE="${MIN_CONFIDENCE:-HIGH_CONFIDENCE}"
CIRCLE="${AY_CIRCLE:-orchestrator}"
CEREMONY="${AY_CEREMONY:-standup}"

# Threshold Parameters (Configurable)
GO_THRESHOLD="${GO_THRESHOLD:-80}"
CONTINUE_THRESHOLD="${CONTINUE_THRESHOLD:-50}"

# Skip flags for stage control
SKIP_BASELINE="${SKIP_BASELINE:-false}"
SKIP_GOVERNANCE="${SKIP_GOVERNANCE:-false}"
SKIP_RETRO="${SKIP_RETRO:-false}"

# Frequency Parameters
FREQUENCY="${FREQUENCY:-fixed}"                           # fixed, hourly, daily, per-ceremony
BASELINE_FREQUENCY="${BASELINE_FREQUENCY:-per-cycle}"
REVIEW_FREQUENCY="${REVIEW_FREQUENCY:-per-iteration}"
RETRO_FREQUENCY="${RETRO_FREQUENCY:-end-of-cycle}"
MAX_TIME="${MAX_TIME:-}"

# Test Criteria Thresholds
THRESHOLD_SUCCESS_RATE=70
THRESHOLD_COMPLIANCE=85
THRESHOLD_MULTIPLIER=95
THRESHOLD_EQUITY=40

# State tracking
declare -A MODE_STATUS
declare -A MODE_SCORES
declare -A ACTION_RESULTS
declare -A CRITERIA_PROGRESS
ITERATION=0
RESSOLVED_ACTIONS=0
TOTAL_ACTIONS=0
CURRENT_MODE=""
BASELINE_HEALTH=0
VERDICT=""
RETRO_TRIGGERED=false

# ═══════════════════════════════════════════════════════════════════════════
# TUI RENDERING
# ═══════════════════════════════════════════════════════════════════════════

clear_screen() {
    clear
    tput cup 0 0
}

draw_box() {
    local width=80
    local title="$1"
    local title_len=${#title}
    local padding=$(( (width - title_len - 4) / 2 ))
    
    echo -e "${BLUE}${BOX_TL}$(printf '%*s' "$padding" | tr ' ' "$BOX_H")${BOLD} $title ${NC}${BLUE}$(printf '%*s' "$((width - padding - title_len - 3))" | tr ' ' "$BOX_H")${BOX_TR}${NC}"
}

draw_separator() {
    local width=80
    echo -e "${BLUE}${BOX_ML}$(printf '%*s' "$((width-2))" | tr ' ' "$BOX_H")${BOX_MR}${NC}"
}

draw_footer() {
    local width=80
    echo -e "${BLUE}${BOX_BL}$(printf '%*s' "$((width-2))" | tr ' ' "$BOX_H")${BOX_BR}${NC}"
}

show_spinner() {
    local pid=$1
    local message="$2"
    local i=0
    
    while kill -0 "$pid" 2>/dev/null; do
        printf "\r${CYAN}${SPINNER[$i]}${NC} ${message}..."
        i=$(( (i + 1) % ${#SPINNER[@]} ))
        sleep 0.1
    done
    printf "\r%*s\r" 80 ""  # Clear line
}

render_progress_bar() {
    local current=$1
    local total=$2
    local width=40
    local percentage=$((current * 100 / total))
    local filled=$((width * current / total))
    local empty=$((width - filled))
    
    echo -n "["
    printf '%*s' "$filled" | tr ' ' '█'
    printf '%*s' "$empty" | tr ' ' '░'
    echo -n "] ${percentage}%"
}

# ═══════════════════════════════════════════════════════════════════════════
# INTELLIGENT MODE SELECTION
# ═══════════════════════════════════════════════════════════════════════════

analyze_system_state() {
    local output
    output=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" all "$CIRCLE" "$CEREMONY" 2>/dev/null || echo "")
    
    # Count matches, handle empty/null returns
    local high_count=0
    local fallback_count=0
    [[ -n "$output" ]] && high_count=$(echo "$output" | grep -c "HIGH_CONFIDENCE") || high_count=0
    [[ -n "$output" ]] && fallback_count=$(echo "$output" | grep -cE "NO_DATA|FALLBACK") || fallback_count=0
    
    # Final defensive check: ensure they are numbers
    high_count=${high_count:-0}
    fallback_count=${fallback_count:-0}
    
    # Calculate health score (0-100)
    local health_score=$(( (high_count * 100) / 6 ))
    
    # Determine primary issues
    local issues=()
    
    if [ "$fallback_count" -ge 3 ]; then
        issues+=("INSUFFICIENT_DATA")
    fi
    
    if [ "$health_score" -lt 50 ]; then
        issues+=("LOW_HEALTH")
    fi
    
    if echo "$output" | grep -q "FALLBACK.*Cascade"; then
        issues+=("CASCADE_RISK")
    fi
    
    if echo "$output" | grep -q "FALLBACK.*Check Frequency"; then
        issues+=("MONITORING_GAP")
    fi
    
    # Return structured output
    cat <<EOF
HEALTH_SCORE:$health_score
HIGH_CONFIDENCE:$high_count
FALLBACK_COUNT:$fallback_count
ISSUES:${issues[*]:-NONE}
EOF
}

select_optimal_mode() {
    local state="$1"
    local iteration=$2
    
    local health_score=$(echo "$state" | grep "HEALTH_SCORE" | cut -d: -f2 | xargs)
    local issues=$(echo "$state" | grep "ISSUES" | cut -d: -f2 | xargs)
    
    # Defensive defaults if parsing fails
    health_score=${health_score:-50}
    issues=${issues:-NONE}
    
    # Mode selection strategy based on state and iteration
    if [[ "$issues" == *"INSUFFICIENT_DATA"* ]]; then
        echo "init"
        return
    fi
    
    if [ "$iteration" -eq 1 ] || [ "$health_score" -lt 50 ]; then
        echo "improve"
        return
    fi
    
    if [[ "$issues" == *"CASCADE_RISK"* ]]; then
        echo "monitor"
        return
    fi
    
    if [[ "$issues" == *"MONITORING_GAP"* ]]; then
        echo "divergence"
        return
    fi
    
    # Default to iteration for optimization
    echo "iterate"
}

# ═══════════════════════════════════════════════════════════════════════════
# MODE EXECUTION WITH VALIDATION
# ═══════════════════════════════════════════════════════════════════════════

execute_mode() {
    local mode="$1"
    local iteration="$2"
    local learned_skills="${LEARNED_SKILLS:-[]}"  # EDIT 3A: Read learned skills from env
    
    CURRENT_MODE="$mode"
    local result="UNKNOWN"
    local score=0
    local skill_confidence=1.0  # Default confidence if no matching skill found
    
    case "$mode" in
        init)
            # Generate episodes to improve data coverage
            local count=30
            # EDIT 3B: Dynamically adjust score based on applicable learned skills
            skill_confidence=$(query_skill_confidence "init" "$learned_skills" "0.8")
            if npx tsx "$SCRIPT_DIR/generate-test-episodes.ts" --count "$count" --days 7 >/dev/null 2>&1; then
                result="SUCCESS"
                score=$(echo "80 * $skill_confidence" | bc -l 2>/dev/null | cut -d. -f1)
            else
                result="FAILED"
                score=0
            fi
            ;;
            
        improve)
            # Run continuous improvement (with timeout)
            local timeout=30
            # EDIT 3B: Dynamically adjust score based on applicable learned skills
            skill_confidence=$(query_skill_confidence "improve" "$learned_skills" "0.9")
            if timeout "$timeout" bash "$SCRIPT_DIR/ay-continuous-improve.sh" --max-iterations 1 >/dev/null 2>&1; then
                result="SUCCESS"
                score=$(echo "90 * $skill_confidence" | bc -l 2>/dev/null | cut -d. -f1)
            else
                result="PARTIAL"
                score=$(echo "50 * $skill_confidence" | bc -l 2>/dev/null | cut -d. -f1)
            fi
            ;;
            
        monitor)
            # Quick monitoring pass to check cascade status
            local thresholds
            thresholds=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" cascade-failure "$CIRCLE" "$CEREMONY" 2>/dev/null || echo "")
            
            if echo "$thresholds" | grep -q "STATISTICAL"; then
                result="SUCCESS"
                score=85
            else
                result="NEEDS_DATA"
                score=40
            fi
            ;;
            
        divergence)
            # Check divergence rate quality
            local div_output
            div_output=$("$SCRIPT_DIR/ay-dynamic-thresholds.sh" divergence-rate "$CIRCLE" "$CEREMONY" 2>/dev/null || echo "")
            
            if echo "$div_output" | grep -q "HIGH_CONFIDENCE"; then
                result="SUCCESS"
                score=85
            else
                result="NEEDS_DATA"
                score=45
            fi
            ;;
            
        iterate)
            # Run WSJF iteration
            # EDIT 3B: Dynamically adjust score based on applicable learned skills
            skill_confidence=$(query_skill_confidence "iterate" "$learned_skills" "0.95")
            if bash "$SCRIPT_DIR/ay-wsjf-iterate.sh" --max-iterations 1 >/dev/null 2>&1; then
                result="SUCCESS"
                score=$(echo "95 * $skill_confidence" | bc -l 2>/dev/null | cut -d. -f1)
            else
                result="PARTIAL"
                score=$(echo "60 * $skill_confidence" | bc -l 2>/dev/null | cut -d. -f1)
            fi
            ;;
            
        *)
            result="UNKNOWN"
            score=0
            ;;
    esac
    
    MODE_STATUS[$mode]="$result"
    MODE_SCORES[$mode]="$score"
    
    echo "$result"
}

validate_test_criteria() {
    local iteration=$1
    
    # Query metrics (from .metrics if available)
    local success_rate=70
    local compliance=80
    local multiplier=90
    local equity=35
    
    if [[ -f ".metrics/success_rate-latest.json" ]]; then
        success_rate=$(grep -o '"value": [0-9.]*' ".metrics/success_rate-latest.json" 2>/dev/null | head -1 | cut -d' ' -f2 || echo "70")
    fi
    if [[ -f ".metrics/compliance-latest.json" ]]; then
        compliance=$(grep -o '"value": [0-9.]*' ".metrics/compliance-latest.json" 2>/dev/null | head -1 | cut -d' ' -f2 || echo "80")
    fi
    if [[ -f ".metrics/multiplier-latest.json" ]]; then
        multiplier=$(grep -o '"value": [0-9.]*' ".metrics/multiplier-latest.json" 2>/dev/null | head -1 | cut -d' ' -f2 || echo "90")
    fi
    if [[ -f ".metrics/equity-latest.json" ]]; then
        equity=$(grep -o '"value": [0-9.]*' ".metrics/equity-latest.json" 2>/dev/null | head -1 | cut -d' ' -f2 || echo "35")
    fi
    
    # Store progress
    CRITERIA_PROGRESS[$iteration]="$success_rate,$compliance,$multiplier,$equity"
    
    # Count passed criteria
    local passed=0
    [[ $(echo "$success_rate >= $THRESHOLD_SUCCESS_RATE" | bc 2>/dev/null) -eq 1 ]] && ((passed++))
    [[ $(echo "$compliance >= $THRESHOLD_COMPLIANCE" | bc 2>/dev/null) -eq 1 ]] && ((passed++))
    [[ $(echo "$multiplier >= $THRESHOLD_MULTIPLIER" | bc 2>/dev/null) -eq 1 ]] && ((passed++))
    [[ $(echo "$equity <= $THRESHOLD_EQUITY" | bc 2>/dev/null) -eq 1 ]] && ((passed++))
    
    # Return verdict based on criteria
    if [[ $passed -ge 4 ]]; then
        echo "GO_CRITERIA_PASSED:$passed:4"
    elif [[ $passed -ge 2 ]]; then
        echo "CONTINUE_PARTIAL:$passed:4"
    else
        echo "NO_GO_INSUFFICIENT:$passed:4"
    fi
}

render_criteria_progress() {
    local success_rate=$1
    local compliance=$2
    local multiplier=$3
    local equity=$4
    local iteration=$5
    
    echo ""
    echo -e "${CYAN}${BOX_V} TEST CRITERIA PROGRESS (Iteration $iteration)${NC}"
    echo -e "${CYAN}${BOX_V}${NC}"
    
    # Success Rate
    local sr_color="$RED"
    [[ $(echo "$success_rate >= $THRESHOLD_SUCCESS_RATE" | bc 2>/dev/null) -eq 1 ]] && sr_color="$GREEN"
    echo -e "${CYAN}${BOX_V}${NC}   Success Rate:  $(render_progress_bar "$success_rate" 100) ${sr_color}${success_rate}%${NC} (need ≥${THRESHOLD_SUCCESS_RATE}%)"
    
    # Compliance
    local co_color="$RED"
    [[ $(echo "$compliance >= $THRESHOLD_COMPLIANCE" | bc 2>/dev/null) -eq 1 ]] && co_color="$GREEN"
    echo -e "${CYAN}${BOX_V}${NC}   Compliance:    $(render_progress_bar "$compliance" 100) ${co_color}${compliance}%${NC} (need ≥${THRESHOLD_COMPLIANCE}%)"
    
    # Multiplier
    local mu_color="$RED"
    [[ $(echo "$multiplier >= $THRESHOLD_MULTIPLIER" | bc 2>/dev/null) -eq 1 ]] && mu_color="$GREEN"
    echo -e "${CYAN}${BOX_V}${NC}   Multiplier:    $(render_progress_bar "$multiplier" 100) ${mu_color}${multiplier}%${NC} (need ≥${THRESHOLD_MULTIPLIER}%)"
    
    # Circle Equity
    local eq_color="$RED"
    [[ $(echo "$equity <= $THRESHOLD_EQUITY" | bc 2>/dev/null) -eq 1 ]] && eq_color="$GREEN"
    echo -e "${CYAN}${BOX_V}${NC}   Circle Equity: $(render_progress_bar "$equity" 50) ${eq_color}${equity}%${NC} (need ≤${THRESHOLD_EQUITY}%)"
    echo ""
}

validate_solution() {
    local mode="$1"
    
    # Re-analyze system state after mode execution
    local new_state
    new_state=$(analyze_system_state)
    
    local new_health=$(echo "$new_state" | grep "HEALTH_SCORE" | cut -d: -f2)
    local new_high=$(echo "$new_state" | grep "HIGH_CONFIDENCE" | cut -d: -f2)
    
    # Determine go/no-go based on configurable thresholds
    if [ "$new_health" -ge "$GO_THRESHOLD" ] && [ "$new_high" -ge 5 ]; then
        echo "GO"
        return 0
    elif [ "$new_health" -ge "$CONTINUE_THRESHOLD" ]; then
        echo "CONTINUE"
        return 0
    else
        echo "NO_GO"
        return 1
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# MAIN RENDERING LOOP
# ═══════════════════════════════════════════════════════════════════════════

render_dashboard() {
    local state="$1"
    local iteration="$2"
    local mode="$3"
    
    clear_screen
    
    # Header
    draw_box "AY AUTO-RESOLUTION - ADAPTIVE MODE CYCLING"
    echo -e "${BOX_V} ${CYAN}Circle:${NC} ${MAGENTA}$CIRCLE${NC} ${CYAN}│${NC} ${CYAN}Ceremony:${NC} ${MAGENTA}$CEREMONY${NC} ${CYAN}│${NC} ${CYAN}Iteration:${NC} ${YELLOW}$iteration${NC}/${MAX_ITERATIONS} $(printf '%*s' $((80 - 60)) '')${BOX_V}"
    
    # System Health
    draw_separator
    echo -e "${BOX_V} ${BOLD}SYSTEM HEALTH${NC}$(printf '%*s' $((80 - 15)) '')${BOX_V}"
    
    local health_score=$(echo "$state" | grep "HEALTH_SCORE" | cut -d: -f2)
    local high_conf=$(echo "$state" | grep "HIGH_CONFIDENCE" | cut -d: -f2)
    local fallback=$(echo "$state" | grep "FALLBACK_COUNT" | cut -d: -f2)
    
    local health_color="$RED"
    [ "$health_score" -ge 50 ] && health_color="$YELLOW"
    [ "$health_score" -ge 80 ] && health_color="$GREEN"
    
    echo -e "${BOX_V}   Health: ${health_color}${BOLD}${health_score}%${NC} $(render_progress_bar "$high_conf" 6)$(printf '%*s' $((80 - 70)) '')${BOX_V}"
    echo -e "${BOX_V}   Operational: ${GREEN}${high_conf}/6${NC} │ Fallback: ${RED}${fallback}/6${NC}$(printf '%*s' $((80 - 45)) '')${BOX_V}"
    
    # Current Mode
    draw_separator
    echo -e "${BOX_V} ${BOLD}CURRENT MODE${NC}$(printf '%*s' $((80 - 14)) '')${BOX_V}"
    
    local mode_icon="${ARROW}"
    [ -n "${MODE_STATUS[$mode]:-}" ] && [ "${MODE_STATUS[$mode]}" = "SUCCESS" ] && mode_icon="${CHECK}"
    [ -n "${MODE_STATUS[$mode]:-}" ] && [ "${MODE_STATUS[$mode]}" = "FAILED" ] && mode_icon="${CROSS}"
    
    echo -e "${BOX_V}   ${mode_icon} ${CYAN}${BOLD}$(printf '%-15s' "${mode^^}")${NC} ${DIM}(Score: ${MODE_SCORES[$mode]:-0})${NC}$(printf '%*s' $((80 - 40)) '')${BOX_V}"
    
    # Mode History
    draw_separator
    echo -e "${BOX_V} ${BOLD}MODE EXECUTION HISTORY${NC}$(printf '%*s' $((80 - 24)) '')${BOX_V}"
    
    local shown=0
    for m in init improve monitor divergence iterate; do
        if [ -n "${MODE_STATUS[$m]:-}" ]; then
            local status="${MODE_STATUS[$m]}"
            local score="${MODE_SCORES[$m]}"
            
            local status_color="$YELLOW"
            local status_icon="○"
            case "$status" in
                SUCCESS)
                    status_color="$GREEN"
                    status_icon="$CHECK"
                    ;;
                FAILED|NO_GO)
                    status_color="$RED"
                    status_icon="$CROSS"
                    ;;
                PARTIAL|NEEDS_DATA)
                    status_color="$YELLOW"
                    status_icon="▸"
                    ;;
            esac
            
            echo -e "${BOX_V}   ${status_color}${status_icon}${NC} $(printf '%-12s' "${m}") ${status_color}$(printf '%-12s' "$status")${NC} ${DIM}[${score}/100]${NC}$(printf '%*s' $((80 - 50)) '')${BOX_V}"
            shown=$((shown + 1))
        fi
    done
    
    [ "$shown" -eq 0 ] && echo -e "${BOX_V}   ${DIM}No modes executed yet${NC}$(printf '%*s' $((80 - 30)) '')${BOX_V}"
    
    # Recommended Actions
    draw_separator
    echo -e "${BOX_V} ${BOLD}RECOMMENDED ACTIONS${NC}$(printf '%*s' $((80 - 21)) '')${BOX_V}"
    
    local issues=$(echo "$state" | grep "ISSUES" | cut -d: -f2)
    
    if [[ "$issues" == *"INSUFFICIENT_DATA"* ]]; then
        echo -e "${BOX_V}   ${YELLOW}●${NC} Generate more episodes (${CYAN}init${NC})$(printf '%*s' $((80 - 45)) '')${BOX_V}"
    fi
    
    if [[ "$issues" == *"LOW_HEALTH"* ]]; then
        echo -e "${BOX_V}   ${RED}●${NC} Run continuous improvement (${CYAN}improve${NC})$(printf '%*s' $((80 - 50)) '')${BOX_V}"
    fi
    
    if [[ "$issues" == *"CASCADE_RISK"* ]]; then
        echo -e "${BOX_V}   ${YELLOW}●${NC} Monitor cascade status (${CYAN}monitor${NC})$(printf '%*s' $((80 - 50)) '')${BOX_V}"
    fi
    
    if [[ "$issues" == "NONE" ]]; then
        echo -e "${BOX_V}   ${GREEN}${CHECK}${NC} System healthy - optimize with ${CYAN}iterate${NC}$(printf '%*s' $((80 - 50)) '')${BOX_V}"
    fi
    
    # Footer
    draw_footer
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════════
# STAGE MANAGEMENT: BASELINE, GOVERNANCE, RETRO, LEARNING
# ═══════════════════════════════════════════════════════════════════════════

establish_baseline_stage() {
    # Skip if requested
    if [[ "${SKIP_BASELINE:-false}" == "true" ]]; then
        echo -e "${YELLOW}⚠${NC} Skipping baseline stage"
        return
    fi

    # Check frequency - skip if not appropriate
    if [[ "$BASELINE_FREQUENCY" != "per-cycle" ]] && [[ "$BASELINE_FREQUENCY" != "per-iteration" ]]; then
        return
    fi

    echo ""
    echo -e "${BLUE}${BOX_TL}$(printf '%*s' 76 | tr ' ' "$BOX_H")${BOX_TR}${NC}"
    echo -e "${BLUE}${BOX_V}${NC}  ${BOLD}STAGE 0: ESTABLISH BASELINE METRICS${NC}$(printf '%*s' $((80 - 38)) '')${BLUE}${BOX_V}${NC}"
    echo -e "${BLUE}${BOX_BL}$(printf '%*s' 76 | tr ' ' "$BOX_H")${BOX_BR}${NC}"
    
    mkdir -p ".ay-baselines" ".ay-state"
    
    # Establish baseline with timeout protection
    if [[ -x "$SCRIPT_DIR/baseline-metrics.sh" ]]; then
        echo -e "${CYAN}${ARROW}${NC} Running baseline-metrics.sh (60s timeout)..."
        if timeout 60 bash "$SCRIPT_DIR/baseline-metrics.sh" > ".ay-baselines/baseline-$(date +%s).json" 2>&1; then
            echo -e "${GREEN}${CHECK}${NC} Baseline metrics established"
        else
            echo -e "${YELLOW}⚠${NC} Baseline metrics timeout or failed (continuing with defaults)"
        fi
    fi
    
    if [[ -x "$SCRIPT_DIR/benchmarks/establish_baselines.py" ]]; then
        echo -e "${CYAN}${ARROW}${NC} Establishing Python baselines (30s timeout)..."
        if timeout 30 python3 "$SCRIPT_DIR/benchmarks/establish_baselines.py" > /dev/null 2>&1; then
            echo -e "${GREEN}${CHECK}${NC} Python baselines established"
        else
            echo -e "${YELLOW}⚠${NC} Python baselines timeout (continuing)"
        fi
    fi
    
    # Store baseline snapshot
    cat > ".ay-baselines/baseline-$(date +%s).json" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "initial_health": 0,
  "frequency": "$FREQUENCY",
  "circle": "$CIRCLE",
  "ceremony": "$CEREMONY"
}
EOF
    
    echo -e "${GREEN}${CHECK}${NC} Baseline established"
    echo ""
}

governance_review_stage() {
    # Skip if requested
    if [[ "${SKIP_GOVERNANCE:-false}" == "true" ]]; then
        echo -e "${YELLOW}⚠${NC} Skipping governance review"
        return
    fi

    # Check frequency
    if [[ "$REVIEW_FREQUENCY" != "per-iteration" ]] && [[ "$REVIEW_FREQUENCY" != "end-of-cycle" ]]; then
        return
    fi

    echo ""
    echo -e "${BLUE}${BOX_TL}$(printf '%*s' 76 | tr ' ' "$BOX_H")${BOX_TR}${NC}"
    echo -e "${BLUE}${BOX_V}${NC}  ${BOLD}STAGE 4.5: GOVERNANCE REVIEW${NC}$(printf '%*s' $((80 - 32)) '')${BLUE}${BOX_V}${NC}"
    echo -e "${BLUE}${BOX_BL}$(printf '%*s' 76 | tr ' ' "$BOX_H")${BOX_BR}${NC}"
    
    local review_pass=true
    
    if [[ -x "$SCRIPT_DIR/pre_cycle_script_review.py" ]]; then
        echo -e "${CYAN}${ARROW}${NC} Pre-cycle script review (30s timeout)..."
        if timeout 30 "$SCRIPT_DIR/pre_cycle_script_review.py" "$CIRCLE" >/dev/null 2>&1; then
            echo -e "${GREEN}${CHECK}${NC} Pre-cycle review passed"
        else
            echo -e "${YELLOW}⚠${NC} Pre-cycle review timeout or failed"
        fi
    fi
    
    if [[ -x "$SCRIPT_DIR/enforce_dt_quality_gates.py" ]]; then
        echo -e "${CYAN}${ARROW}${NC} Quality gate enforcement (30s timeout)..."
        if timeout 30 "$SCRIPT_DIR/enforce_dt_quality_gates.py" >/dev/null 2>&1; then
            echo -e "${GREEN}${CHECK}${NC} Quality gates passed"
        else
            echo -e "${YELLOW}⚠${NC} Quality gate warnings or timeout"
            review_pass=false
        fi
    fi
    
    if [[ "$review_pass" == "true" ]]; then
        echo -e "${GREEN}${CHECK}${NC} Governance review passed"
    else
        echo -e "${YELLOW}⚠${NC} Governance review complete with warnings"
    fi
    echo ""
}

retrospective_analysis_stage() {
    # Skip if requested
    if [[ "${SKIP_RETRO:-false}" == "true" ]]; then
        echo -e "${YELLOW}⚠${NC} Skipping retrospective analysis"
        return
    fi

    # Check frequency
    if [[ "$RETRO_FREQUENCY" != "end-of-cycle" ]]; then
        return
    fi

    echo ""
    echo -e "${BLUE}${BOX_TL}$(printf '%*s' 76 | tr ' ' "$BOX_H")${BOX_TR}${NC}"
    echo -e "${BLUE}${BOX_V}${NC}  ${BOLD}STAGE 5: RETROSPECTIVE ANALYSIS${NC}$(printf '%*s' $((80 - 36)) '')${BLUE}${BOX_V}${NC}"
    echo -e "${BLUE}${BOX_BL}$(printf '%*s' 76 | tr ' ' "$BOX_H")${BOX_BR}${NC}"
    
    mkdir -p ".ay-retro"
    
    if [[ -x "$SCRIPT_DIR/retrospective_analysis.py" ]]; then
        echo -e "${CYAN}${ARROW}${NC} Running retrospective analysis (60s timeout)..."
        if timeout 60 "$SCRIPT_DIR/retrospective_analysis.py" \
            --circle "$CIRCLE" --ceremony "$CEREMONY" \
            > ".ay-retro/retro-$(date +%s).json" 2>&1; then
            echo -e "${GREEN}${CHECK}${NC} Retrospective analysis complete"
        else
            echo -e "${YELLOW}⚠${NC} Retrospective analysis timeout"
        fi
    fi
    
    echo -e "${GREEN}${CHECK}${NC} Retrospective analysis complete"
    echo ""
}

learning_capture_stage() {
    echo ""
    echo -e "${BLUE}${BOX_TL}$(printf '%*s' 76 | tr ' ' "$BOX_H")${BOX_TR}${NC}"
    echo -e "${BLUE}${BOX_V}${NC}  ${BOLD}STAGE 6: LEARNING CAPTURE & SKILL VALIDATION${NC}$(printf '%*s' $((80 - 48)) '')${BLUE}${BOX_V}${NC}"
    echo -e "${BLUE}${BOX_BL}$(printf '%*s' 76 | tr ' ' "$BOX_H")${BOX_BR}${NC}"
    
    mkdir -p ".ay-learning"
    
    # Capture learning with timeout
    if [[ -x "$SCRIPT_DIR/learning_capture_parity.py" ]]; then
        echo -e "${CYAN}${ARROW}${NC} Capturing learning from cycle (60s timeout)..."
        if timeout 60 "$SCRIPT_DIR/learning_capture_parity.py" \
            --circle "$CIRCLE" --export-learning true \
            > ".ay-learning/capture-$(date +%s).json" 2>&1; then
            echo -e "${GREEN}${CHECK}${NC} Learning captured"
        else
            echo -e "${YELLOW}⚠${NC} Learning capture timeout"
        fi
    fi
    
    # Validate skills once with timeout
    if [[ -x "$SCRIPT_DIR/validate-learned-skills.sh" ]]; then
        echo -e "${CYAN}${ARROW}${NC} Validating learned skills (30s timeout)..."
        local validation_result
        if validation_result=$(timeout 30 bash "$SCRIPT_DIR/validate-learned-skills.sh" "$CIRCLE" 2>&1); then
            if echo "$validation_result" | grep -q "passed\|PASS\|All.*checks passed"; then
                echo -e "${GREEN}${CHECK}${NC} Skill validation passed"
            elif echo "$validation_result" | grep -q "failed\|FAIL\|❌"; then
                echo -e "${YELLOW}⚠${NC} Skill validation issues (review required)"
            fi
        else
            echo -e "${YELLOW}⚠${NC} Skill validation timeout"
        fi
    fi
    
    # Re-export skills
    if command -v npx &>/dev/null; then
        echo -e "${CYAN}${ARROW}${NC} Re-exporting skills data (20s timeout)..."
        if timeout 20 npx agentdb skill export --circle "$CIRCLE" > ".ay-learning/skills-$(date +%s).json" 2>/dev/null; then
            echo -e "${GREEN}${CHECK}${NC} Skills re-exported"
        fi
    fi
    
    # CIRCULATION: Wire learned skills to agentdb for next iteration
    echo -e "${CYAN}${ARROW}${NC} Wiring learning to knowledge base (30s timeout)..."
    if timeout 30 bash "$SCRIPT_DIR/ay-learning-circulation.sh" "$CIRCLE" "$CEREMONY" "$ITERATION" >/dev/null 2>&1; then
        echo -e "${GREEN}${CHECK}${NC} Knowledge circulated to agentdb"
    else
        echo -e "${YELLOW}⚠${NC} Learning circulation timeout or failed"
    fi
    
    echo -e "${GREEN}${CHECK}${NC} Learning capture complete"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS FOR SKILL-BASED EXECUTION
# ═══════════════════════════════════════════════════════════════════════════

load_learned_skills() {
    local circle="$1"
    local skills_file=".ay-learning/available-skills-${circle}.json"
    
    # EDIT 1: Load learned skills from circulation output
    if [[ -f "$skills_file" ]]; then
        LEARNED_SKILLS="$(cat "$skills_file" 2>/dev/null || echo "[]")"
        local skill_count=$(echo "$LEARNED_SKILLS" | jq 'length' 2>/dev/null || echo "0")
        echo -e "${GREEN}${CHECK}${NC} Loaded $skill_count learned skills from previous iteration"
        return 0
    else
        LEARNED_SKILLS="[]"
        echo -e "${YELLOW}⚠${NC} No learned skills available (first iteration or fresh start)"
        return 1
    fi
}

query_skill_confidence() {
    local mode_name="$1"
    local learned_skills="$2"
    local base_confidence="$3"
    
    # EDIT 3B: Query learned skills for mode-relevant patterns
    # Returns confidence factor (0.5-1.5) to multiply against base score
    
    if [[ "$learned_skills" == "[]" ]] || [[ -z "$learned_skills" ]]; then
        echo "$base_confidence"
        return
    fi
    
    # Find skills applicable to this mode
    local mode_skill_confidence=$(echo "$learned_skills" | jq \
        "map(select(.name | contains(\"$mode_name\") or contains(\"workflow\") or contains(\"cycle\"))) | \
         if length > 0 then map(.confidence) | add / length else 0.8 end" 2>/dev/null || echo "$base_confidence")
    
    # Return confidence, default to base if extraction fails
    if [[ -z "$mode_skill_confidence" ]] || [[ "$mode_skill_confidence" == "null" ]]; then
        echo "$base_confidence"
    else
        echo "$mode_skill_confidence"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# MAIN AUTO-RESOLUTION LOOP
# ═══════════════════════════════════════════════════════════════════════════

main() {
    echo -e "${BLUE}${BOLD}"
    cat << 'EOF'
    ___   __  __   ___   __  __ _______ ___  
   / _ | / / / /  / _ | / / / //_  __// _ \ 
  / __ |/ /_/ /  / __ |/ /_/ /  / /  / // / 
 /_/ |_|\____/  /_/ |_|\____/  /_/   \___/  
                                             
 Adaptive Auto-Resolution System v1.0
EOF
    echo -e "${NC}"
    sleep 1
    
    # STAGE 0: Establish Baselines (PRE-CYCLE)
    establish_baseline_stage
    
    # Initial analysis
    echo -e "${CYAN}${ARROW}${NC} Analyzing system state..."
    sleep 1
    
    local state
    state=$(analyze_system_state)
    
    local health_score=$(echo "$state" | grep "HEALTH_SCORE" | cut -d: -f2 | xargs)
    health_score=${health_score:-50}
    BASELINE_HEALTH=$health_score
    
    echo -e "${GREEN}${CHECK}${NC} Initial health: ${health_score}%"
    echo -e "${CYAN}${ARROW}${NC} Target health: ${GO_THRESHOLD}%"
    echo ""
    echo -e "${YELLOW}Press Enter to begin auto-resolution...${NC}"
    read -r
    
    # Iterative resolution loop
    for ((ITERATION=1; ITERATION<=MAX_ITERATIONS; ITERATION++)); do
        # EDIT 1: Load learned skills at start of iteration
        load_learned_skills "$CIRCLE"
        
        # Refresh state
        state=$(analyze_system_state)
        health_score=$(echo "$state" | grep "HEALTH_SCORE" | cut -d: -f2 | xargs)
        health_score=${health_score:-50}
        
        # Check if target achieved
        if [ "$health_score" -ge "$GO_THRESHOLD" ]; then
            VERDICT="GO"
            render_dashboard "$state" "$ITERATION" "complete"
            echo -e "${GREEN}${BOLD}${STAR} TARGET ACHIEVED! ${STAR}${NC}"
            echo -e "${GREEN}System health: ${health_score}% (target: ${GO_THRESHOLD}%)${NC}"
            echo ""
            
            # STAGE 4.5: Governance Review (PRE-VERDICT)
            if [[ "$REVIEW_FREQUENCY" == "per-iteration" || "$REVIEW_FREQUENCY" == "end-of-cycle" ]]; then
                governance_review_stage
            fi
            
            # STAGE 5: Retrospective Analysis (POST-VERDICT)
            if [[ "$RETRO_FREQUENCY" == "end-of-cycle" && "$RETRO_TRIGGERED" == "false" ]]; then
                retrospective_analysis_stage
                RETRO_TRIGGERED=true
            fi
            
            # STAGE 6: Learning Capture (POST-RETRO)
            learning_capture_stage
            
            echo -e "${CYAN}${CHECK}${NC} Auto-resolution complete in $ITERATION iterations"
            exit 0
        fi
        
        # Select optimal mode
        local mode
        mode=$(select_optimal_mode "$state" "$ITERATION")
        
        render_dashboard "$state" "$ITERATION" "$mode"
        
        echo -e "${CYAN}${ARROW}${NC} Executing ${BOLD}${mode}${NC} mode..."
        sleep 1
        
        # EDIT 2: Pass learned skills env var to execute_mode
        # Execute mode in background for progress indicator
        (LEARNED_SKILLS="$LEARNED_SKILLS" execute_mode "$mode" "$ITERATION") &
        local exec_pid=$!
        
        show_spinner "$exec_pid" "Processing $mode"
        wait "$exec_pid" || true
        local result="${MODE_STATUS[$mode]:-UNKNOWN}"
        
        # Validate solution
        echo -e "${CYAN}${ARROW}${NC} Validating solution..."
        local decision
        decision=$(validate_solution "$mode")
        
        # Test criteria validation
        echo -e "${CYAN}${ARROW}${NC} Validating test criteria..."
        local criteria_decision
        criteria_decision=$(validate_test_criteria "$ITERATION")
        local criteria_verdict=$(echo "$criteria_decision" | cut -d: -f1)
        
        # Parse criteria values for display
        local cr_success=$(echo "${CRITERIA_PROGRESS[$ITERATION]:-70,80,90,35}" | cut -d, -f1)
        local cr_compliance=$(echo "${CRITERIA_PROGRESS[$ITERATION]:-70,80,90,35}" | cut -d, -f2)
        local cr_multiplier=$(echo "${CRITERIA_PROGRESS[$ITERATION]:-70,80,90,35}" | cut -d, -f3)
        local cr_equity=$(echo "${CRITERIA_PROGRESS[$ITERATION]:-70,80,90,35}" | cut -d, -f4)
        
        # Render test criteria with progress bars
        render_criteria_progress "$cr_success" "$cr_compliance" "$cr_multiplier" "$cr_equity" "$ITERATION"
        
        render_dashboard "$(analyze_system_state)" "$ITERATION" "$mode"
        
        echo ""
        case "$decision" in
            GO)
                echo -e "${GREEN}${CHECK} ${BOLD}GO${NC} - Solution validated, thresholds operational"
                VERDICT="GO"
                ;;
            CONTINUE)
                echo -e "${YELLOW}▸ ${BOLD}CONTINUE${NC} - Progress made, continuing iteration"
                VERDICT="CONTINUE"
                ;;
            NO_GO)
                echo -e "${RED}${CROSS} ${BOLD}NO_GO${NC} - Solution ineffective, trying next strategy"
                VERDICT="NO_GO"
                ;;
        esac
        
        echo -e "${CYAN}Criteria Verdict: ${BOLD}${criteria_verdict}${NC}"
        
        # STAGE 4.5: Governance Review (PRE-VERDICT, per-iteration if set)
        if [[ "$REVIEW_FREQUENCY" == "per-iteration" ]]; then
            governance_review_stage
        fi
        
        sleep 2
    done
    
    # Max iterations reached
    state=$(analyze_system_state)
    render_dashboard "$state" "$MAX_ITERATIONS" "complete"
    
    echo ""
    echo -e "${YELLOW}⚠ ${BOLD}MAX ITERATIONS REACHED${NC}"
    echo -e "${YELLOW}Final health: $(echo "$state" | grep "HEALTH_SCORE" | cut -d: -f2)%${NC}"
    echo -e "${YELLOW}Last verdict: ${VERDICT}${NC}"
    echo ""
    
    # Final stages if not already triggered
    if [[ "$VERDICT" == "GO" && "$RETRO_TRIGGERED" == "false" ]]; then
        echo -e "${CYAN}${ARROW}${NC} Triggering end-of-cycle analysis..."
        retrospective_analysis_stage
        learning_capture_stage
    fi
    
    echo -e "${CYAN}Recommendations:${NC}"
    echo -e "  1. Review mode execution history above"
    echo -e "  2. Review test criteria progress per iteration"
    echo -e "  3. Run: ${CYAN}ay health${NC} for detailed analysis"
    echo -e "  4. Run: ${CYAN}ay retro${NC} to view retrospective insights"
    echo -e "  5. Manually execute failed modes with verbose logging"
    echo ""
}

# Run
main "$@"
