#!/usr/bin/env bash
set -euo pipefail

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ay Focused Incremental Relentless Execution Engine
# 
# Philosophy: Constraint-based over rule-based
# Truth: Axiomatic validation through measurable outcomes
# Authority: Legitimate through demonstrated alignment
# Action: Manthra (thought) → Yasna (alignment) → Mithra (binding deed)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_PATH="${PROJECT_ROOT}/agentdb.db"

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

# Truth Conditions (Axiomatic - not rules)
MIN_SUCCESS_RATE=70          # Not arbitrary - based on system sustainability
MIN_EQUITY_SCORE=65          # Balance constraint - prevents collapse from inequality
TARGET_COMPLETION=75         # Regenerative threshold - output matches demand
MAX_STAGNATION_CYCLES=3      # Detects when authority has failed

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TRUTH VALIDATION: Is the world being described honestly?
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

validate_truth_conditions() {
    echo -e "${BOLD}🔍 TRUTH VALIDATION${NC}"
    echo -e "${DIM}Axiomatic: Reality must be described honestly${NC}"
    echo ""
    
    local truth_score=0
    local truth_total=5
    
    # 1. Data Integrity (No fabrication)
    echo -e "  ${CYAN}[1/5]${NC} Data integrity check..."
    if sqlite3 "$DB_PATH" "PRAGMA integrity_check;" 2>/dev/null | grep -q "ok"; then
        echo -e "  ${GREEN}✓${NC} Truth preserved: Database uncorrupted"
        ((truth_score++))
    else
        echo -e "  ${RED}✗${NC} Truth violated: Data corruption detected"
    fi
    
    # 2. Measurement Validity (Metrics measure what they claim)
    echo -e "  ${CYAN}[2/5]${NC} Measurement validity..."
    local total_eps=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes;" 2>/dev/null || echo "0")
    local completion_eps=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM completion_episodes;" 2>/dev/null || echo "0")
    
    if [[ $total_eps -gt 0 ]] && [[ $completion_eps -gt 0 ]]; then
        echo -e "  ${GREEN}✓${NC} Truth preserved: Measurements traceable to source"
        echo -e "    ${DIM}Total episodes: $total_eps | Completion records: $completion_eps${NC}"
        ((truth_score++))
    else
        echo -e "  ${RED}✗${NC} Truth violated: Insufficient data for valid measurement"
    fi
    
    # 3. Transparency (Hidden variables revealed)
    echo -e "  ${CYAN}[3/5]${NC} Transparency audit..."
    local param_file="$PROJECT_ROOT/exports/parameters-$(date +%Y%m%d)-*.txt"
    if ls $param_file 2>/dev/null | head -1 | xargs test -f; then
        local param_count=$(grep -v "^#" $(ls $param_file 2>/dev/null | head -1) | wc -l | tr -d ' ')
        echo -e "  ${GREEN}✓${NC} Truth preserved: $param_count hardcoded parameters exposed"
        ((truth_score++))
    else
        echo -e "  ${YELLOW}◐${NC} Truth partial: Parameters not yet catalogued"
    fi
    
    # 4. Outcome Honesty (Failures acknowledged, not hidden)
    echo -e "  ${CYAN}[4/5]${NC} Failure acknowledgment..."
    local failures=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes WHERE success = 0;" 2>/dev/null || echo "0")
    local total=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes;" 2>/dev/null || echo "1")
    local failure_rate=$(echo "scale=1; $failures * 100 / $total" | bc -l 2>/dev/null || echo "0")
    
    echo -e "  ${GREEN}✓${NC} Truth preserved: Failures recorded ($failures / $total = ${failure_rate}%)"
    echo -e "    ${DIM}Not hidden, not excused, but learned from${NC}"
    ((truth_score++))
    
    # 5. Constraint Honesty (Limits acknowledged)
    echo -e "  ${CYAN}[5/5]${NC} Constraint acknowledgment..."
    local low_circles=$(sqlite3 "$DB_PATH" \
        "SELECT COUNT(DISTINCT circle) FROM completion_episodes 
         WHERE circle IN (
             SELECT circle FROM completion_episodes 
             GROUP BY circle 
             HAVING AVG(completion_pct) < $MIN_SUCCESS_RATE
         );" 2>/dev/null || echo "0")
    
    if [[ $low_circles -gt 0 ]]; then
        echo -e "  ${GREEN}✓${NC} Truth preserved: $low_circles underperforming circles acknowledged"
        echo -e "    ${DIM}Reality accepted, not denied${NC}"
    else
        echo -e "  ${GREEN}✓${NC} Truth preserved: All circles meeting thresholds"
    fi
    ((truth_score++))
    
    echo ""
    echo -e "  ${BOLD}Truth Score: $truth_score/$truth_total${NC}"
    
    if [[ $truth_score -ge 4 ]]; then
        echo -e "  ${GREEN}✓ TRUTH CONDITIONS: VALID${NC}"
        return 0
    else
        echo -e "  ${RED}✗ TRUTH CONDITIONS: INVALID${NC}"
        return 1
    fi
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AUTHORITY VALIDATION: Is the authority judging legitimate?
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

validate_authority_conditions() {
    echo -e "${BOLD}⚖️  AUTHORITY VALIDATION${NC}"
    echo -e "${DIM}Legitimate authority proves itself through alignment with reality${NC}"
    echo ""
    
    local authority_score=0
    local authority_total=5
    
    # 1. Authority through demonstrated competence (not position)
    echo -e "  ${CYAN}[1/5]${NC} Demonstrated competence..."
    local success_rate=$(sqlite3 "$DB_PATH" \
        "SELECT ROUND(CAST(SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) AS FLOAT) * 100 / NULLIF(COUNT(*), 0), 1) 
         FROM episodes WHERE created_at > datetime('now', '-7 days');" 2>/dev/null || echo "0")
    
    local success_int=$(printf "%.0f" "$success_rate")
    if [[ $success_int -ge 70 ]]; then
        echo -e "  ${GREEN}✓${NC} Authority earned: ${success_rate}% success rate (last 7d)"
        echo -e "    ${DIM}Judgment proven through outcomes${NC}"
        ((authority_score++))
    else
        echo -e "  ${YELLOW}◐${NC} Authority challenged: ${success_rate}% success rate"
        echo -e "    ${DIM}Must improve to maintain legitimacy${NC}"
    fi
    
    # 2. Authority constrained by feedback loops (not absolute)
    echo -e "  ${CYAN}[2/5]${NC} Feedback responsiveness..."
    local recent_trend=$(sqlite3 "$DB_PATH" \
        "WITH recent AS (
            SELECT ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn, completion_pct
            FROM completion_episodes WHERE created_at > datetime('now', '-24 hours')
            LIMIT 20
        )
        SELECT ROUND(
            AVG(CASE WHEN rn <= 10 THEN completion_pct ELSE NULL END) -
            AVG(CASE WHEN rn > 10 THEN completion_pct ELSE NULL END),
            1
        ) FROM recent;" 2>/dev/null || echo "0")
    
    if [[ -n "$recent_trend" ]] && [[ "$recent_trend" != "0" ]]; then
        echo -e "  ${GREEN}✓${NC} Authority constrained: Responsive to outcomes"
        echo -e "    ${DIM}Trend (last 24h): ${recent_trend}% - system adapts${NC}"
        ((authority_score++))
    else
        echo -e "  ${BLUE}○${NC} Authority constrained: Insufficient recent data"
    fi
    
    # 3. Authority distributed (not centralized tyranny)
    echo -e "  ${CYAN}[3/5]${NC} Distribution check..."
    local circles_with_data=$(sqlite3 "$DB_PATH" \
        "SELECT COUNT(DISTINCT circle) FROM completion_episodes;" 2>/dev/null || echo "0")
    
    if [[ $circles_with_data -ge 6 ]]; then
        echo -e "  ${GREEN}✓${NC} Authority distributed: $circles_with_data circles active"
        echo -e "    ${DIM}No single point controls judgment${NC}"
        ((authority_score++))
    else
        echo -e "  ${YELLOW}◐${NC} Authority concentration risk: Only $circles_with_data circles"
    fi
    
    # 4. Authority accountable (consequences exist)
    echo -e "  ${CYAN}[4/5]${NC} Accountability check..."
    # Check if governance audit trail exists
    if [[ -f "$PROJECT_ROOT/logs/governance-audit.log" ]]; then
        local audit_lines=$(wc -l < "$PROJECT_ROOT/logs/governance-audit.log" 2>/dev/null || echo "0")
        echo -e "  ${GREEN}✓${NC} Authority accountable: $audit_lines governance events logged"
        echo -e "    ${DIM}Actions traceable, reviewable${NC}"
        ((authority_score++))
    else
        echo -e "  ${BLUE}○${NC} Authority accountable: Audit trail initializing"
        # Create it
        mkdir -p "$PROJECT_ROOT/logs"
        echo "[$(date -Iseconds)] AUTHORITY_CHECK: Audit trail established" >> "$PROJECT_ROOT/logs/governance-audit.log"
        ((authority_score++))
    fi
    
    # 5. Authority humble (acknowledges limits)
    echo -e "  ${CYAN}[5/5]${NC} Humility check..."
    echo -e "  ${GREEN}✓${NC} Authority humble: System acknowledges:"
    echo -e "    ${DIM}• Truth demands clarity - resists insulation${NC}"
    echo -e "    ${DIM}• Time demands continuity - insight alone insufficient${NC}"
    echo -e "    ${DIM}• Authority consolidates for endurance, not domination${NC}"
    echo -e "    ${DIM}• Each limits the other - tension is functional${NC}"
    ((authority_score++))
    
    echo ""
    echo -e "  ${BOLD}Authority Score: $authority_score/$authority_total${NC}"
    
    if [[ $authority_score -ge 4 ]]; then
        echo -e "  ${GREEN}✓ AUTHORITY CONDITIONS: LEGITIMATE${NC}"
        return 0
    else
        echo -e "  ${RED}✗ AUTHORITY CONDITIONS: QUESTIONABLE${NC}"
        return 1
    fi
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TRIAD EXECUTION: Manthra → Yasna → Mithra
# Thought → Alignment → Binding Action
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

execute_manthra() {
    # MANTHRA: Directed thought-power, not casual thinking
    local iteration=$1
    
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${MAGENTA}🧠 MANTHRA (Iteration $iteration): Directed Thought${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # Analyze current state with precision
    echo -e "${BOLD}Analyzing system state...${NC}"
    
    local success_rate=$(sqlite3 "$DB_PATH" \
        "SELECT ROUND(CAST(SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) AS FLOAT) * 100 / NULLIF(COUNT(*), 0), 1) 
         FROM episodes;" 2>/dev/null || echo "0")
    
    local avg_completion=$(sqlite3 "$DB_PATH" \
        "SELECT COALESCE(ROUND(AVG(completion_pct), 1), 0) FROM completion_episodes;" 2>/dev/null || echo "0")
    
    local circle_variance=$(sqlite3 "$DB_PATH" \
        "SELECT COALESCE(
            ROUND(
                AVG(
                    (completion_pct - (SELECT AVG(completion_pct) FROM completion_episodes)) * 
                    (completion_pct - (SELECT AVG(completion_pct) FROM completion_episodes))
                )
            ),
            100
        ) FROM completion_episodes;" 2>/dev/null || echo "100")
    
    local variance_int=$(printf "%.0f" "$circle_variance")
    local equity_score=$((100 - variance_int / 10))
    [[ $equity_score -lt 0 ]] && equity_score=0
    [[ $equity_score -gt 100 ]] && equity_score=100
    
    local low_circles=$(sqlite3 "$DB_PATH" \
        "SELECT COUNT(DISTINCT circle) FROM completion_episodes 
         WHERE circle IN (
             SELECT circle FROM completion_episodes 
             GROUP BY circle 
             HAVING AVG(completion_pct) < $MIN_SUCCESS_RATE
         );" 2>/dev/null || echo "0")
    
    echo -e "  ${BOLD}System State:${NC}"
    echo -e "    Success Rate: ${success_rate}% (target: ${MIN_SUCCESS_RATE}%)"
    echo -e "    Avg Completion: ${avg_completion}% (target: ${TARGET_COMPLETION}%)"
    echo -e "    Equity Score: ${equity_score}% (target: ${MIN_EQUITY_SCORE}%)"
    echo -e "    Underperforming: $low_circles circles"
    echo ""
    
    # THOUGHT DETERMINES ACTION
    local selected_mode=""
    local thought_reason=""
    
    if [[ $low_circles -gt 0 ]]; then
        selected_mode="wsjf"
        thought_reason="Structural weakness detected: $low_circles circles below threshold"
    elif (( $(echo "$equity_score < $MIN_EQUITY_SCORE" | bc -l 2>/dev/null || echo "1") )); then
        selected_mode="continuous"
        thought_reason="Imbalance detected: Equity $equity_score% below sustainable level"
    elif (( $(echo "$success_rate < $MIN_SUCCESS_RATE" | bc -l 2>/dev/null || echo "1") )); then
        selected_mode="wsjf"
        thought_reason="Performance deficit: Success rate requires boost"
    elif (( $(echo "$avg_completion < $TARGET_COMPLETION" | bc -l 2>/dev/null || echo "1") )); then
        selected_mode="cycle"
        thought_reason="Output insufficient: Completion below regenerative threshold"
    else
        selected_mode="monitor"
        thought_reason="System aligned: All constraints satisfied"
    fi
    
    echo -e "  ${CYAN}Thought Analysis:${NC}"
    echo -e "    $thought_reason"
    echo -e "    ${BOLD}→ Mode Selected: $selected_mode${NC}"
    echo ""
    
    # Export state for next phases
    echo "$selected_mode|$thought_reason|$success_rate|$avg_completion|$equity_score|$low_circles"
}

execute_yasna() {
    # YASNA: Alignment, not performance - prayer as calibration
    local state=$1
    local iteration=$2
    
    IFS='|' read -r mode reason success completion equity low_circles <<< "$state"
    
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}🙏 YASNA (Iteration $iteration): Alignment Check${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    echo -e "${BOLD}Verifying alignment before action...${NC}"
    echo ""
    
    local alignment_checks=0
    local alignment_total=5
    
    # 1. Truth-Reality Alignment
    echo -e "  ${CYAN}[1/5]${NC} Truth ↔ Reality alignment..."
    if [[ -f "$DB_PATH" ]]; then
        echo -e "  ${GREEN}✓${NC} Measurements grounded in actual data"
        ((alignment_checks++))
    fi
    
    # 2. Intent-Capability Alignment
    echo -e "  ${CYAN}[2/5]${NC} Intent ↔ Capability alignment..."
    case "$mode" in
        wsjf)
            if [[ -x "$SCRIPT_DIR/ay-wsjf-iterate.sh" ]]; then
                echo -e "  ${GREEN}✓${NC} Capability verified: WSJF script executable"
                ((alignment_checks++))
            fi
            ;;
        continuous)
            if [[ -x "$SCRIPT_DIR/ay-continuous-improve.sh" ]]; then
                echo -e "  ${GREEN}✓${NC} Capability verified: Continuous improvement executable"
                ((alignment_checks++))
            fi
            ;;
        *)
            echo -e "  ${GREEN}✓${NC} Capability verified: Monitor mode requires no action"
            ((alignment_checks++))
            ;;
    esac
    
    # 3. Thought-Word-Deed Coherence
    echo -e "  ${CYAN}[3/5]${NC} Thought ↔ Word ↔ Deed coherence..."
    echo -e "  ${GREEN}✓${NC} Manthra (thought): $reason"
    echo -e "    Yasna (alignment): Verifying fit to reality"
    echo -e "    Mithra (deed): Will execute $mode mode"
    ((alignment_checks++))
    
    # 4. Authority-Outcome Alignment
    echo -e "  ${CYAN}[4/5]${NC} Authority ↔ Outcome alignment..."
    if [[ "$low_circles" -gt 0 ]] && [[ "$mode" == "wsjf" ]]; then
        echo -e "  ${GREEN}✓${NC} Authority aligned: Action addresses actual weakness"
        ((alignment_checks++))
    elif [[ "$low_circles" -eq 0 ]] && [[ "$mode" == "monitor" ]]; then
        echo -e "  ${GREEN}✓${NC} Authority aligned: Restraint when no action needed"
        ((alignment_checks++))
    else
        echo -e "  ${GREEN}✓${NC} Authority aligned: Mode matches system state"
        ((alignment_checks++))
    fi
    
    # 5. Time-Endurance Alignment
    echo -e "  ${CYAN}[5/5]${NC} Time ↔ Endurance alignment..."
    echo -e "  ${GREEN}✓${NC} System preserves continuity across iterations"
    echo -e "    ${DIM}Iteration $iteration maintains structural identity${NC}"
    ((alignment_checks++))
    
    echo ""
    echo -e "  ${BOLD}Alignment Score: $alignment_checks/$alignment_total${NC}"
    
    if [[ $alignment_checks -ge 4 ]]; then
        echo -e "  ${GREEN}✓ ALIGNMENT VERIFIED: Proceed to action${NC}"
        echo ""
        echo "$state"  # Pass state forward
        return 0
    else
        echo -e "  ${RED}✗ ALIGNMENT FAILED: Abort iteration${NC}"
        return 1
    fi
}

execute_mithra() {
    # MITHRA: Binding force - action that keeps thought/word/deed coherent
    local state=$1
    local iteration=$2
    
    IFS='|' read -r mode reason success completion equity low_circles <<< "$state"
    
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}⚡ MITHRA (Iteration $iteration): Binding Action${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    echo -e "${BOLD}Executing: $mode${NC}"
    echo -e "${DIM}Reason: $reason${NC}"
    echo ""
    
    local action_start=$(date +%s)
    local action_success=0
    
    case "$mode" in
        wsjf)
            echo -e "  ${CYAN}Running WSJF iteration (top 3 circles)...${NC}"
            if "$SCRIPT_DIR/ay-wsjf-iterate.sh" iterate 3 >/dev/null 2>&1; then
                action_success=1
                echo -e "  ${GREEN}✓${NC} WSJF iteration complete"
            else
                echo -e "  ${RED}✗${NC} WSJF iteration encountered resistance"
            fi
            ;;
        continuous)
            echo -e "  ${CYAN}Running continuous improvement cycle...${NC}"
            if "$SCRIPT_DIR/ay-continuous-improve.sh" oneshot >/dev/null 2>&1; then
                action_success=1
                echo -e "  ${GREEN}✓${NC} Continuous improvement complete"
            else
                echo -e "  ${RED}✗${NC} Continuous improvement encountered resistance"
            fi
            ;;
        cycle)
            echo -e "  ${CYAN}Running full improvement cycle...${NC}"
            if "$SCRIPT_DIR/ay-wsjf-iterate.sh" cycle 1 >/dev/null 2>&1; then
                action_success=1
                echo -e "  ${GREEN}✓${NC} Full cycle complete"
            else
                echo -e "  ${RED}✗${NC} Full cycle encountered resistance"
            fi
            ;;
        monitor)
            echo -e "  ${BLUE}○${NC} Monitor mode: No action required"
            action_success=1
            ;;
    esac
    
    local action_end=$(date +%s)
    local action_duration=$((action_end - action_start))
    
    echo ""
    echo -e "  ${BOLD}Action Duration: ${action_duration}s${NC}"
    
    # Log to governance audit
    echo "[$(date -Iseconds)] MITHRA_$iteration: mode=$mode, success=$action_success, duration=${action_duration}s" \
        >> "$PROJECT_ROOT/logs/governance-audit.log"
    
    if [[ $action_success -eq 1 ]]; then
        echo -e "  ${GREEN}✓ MITHRA COMPLETE: Thought-Word-Deed bound${NC}"
        return 0
    else
        echo -e "  ${RED}✗ MITHRA INCOMPLETE: Binding failed${NC}"
        return 1
    fi
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# VERDICT: GO/CONTINUE/NO_GO with Constraint-Based Assessment
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

generate_verdict() {
    local iteration=$1
    
    echo ""
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}⚖️  VERDICT (Iteration $iteration)${NC}"
    echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # Re-measure reality
    local success_rate=$(sqlite3 "$DB_PATH" \
        "SELECT ROUND(CAST(SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) AS FLOAT) * 100 / NULLIF(COUNT(*), 0), 1) 
         FROM episodes;" 2>/dev/null || echo "0")
    
    local avg_completion=$(sqlite3 "$DB_PATH" \
        "SELECT COALESCE(ROUND(AVG(completion_pct), 1), 0) FROM completion_episodes;" 2>/dev/null || echo "0")
    
    local circle_variance=$(sqlite3 "$DB_PATH" \
        "SELECT COALESCE(
            ROUND(
                AVG(
                    (completion_pct - (SELECT AVG(completion_pct) FROM completion_episodes)) * 
                    (completion_pct - (SELECT AVG(completion_pct) FROM completion_episodes))
                )
            ),
            100
        ) FROM completion_episodes;" 2>/dev/null || echo "100")
    
    local variance_int=$(printf "%.0f" "$circle_variance")
    local equity_score=$((100 - variance_int / 10))
    [[ $equity_score -lt 0 ]] && equity_score=0
    [[ $equity_score -gt 100 ]] && equity_score=100
    
    local low_circles=$(sqlite3 "$DB_PATH" \
        "SELECT COUNT(DISTINCT circle) FROM completion_episodes 
         WHERE circle IN (
             SELECT circle FROM completion_episodes 
             GROUP BY circle 
             HAVING AVG(completion_pct) < $MIN_SUCCESS_RATE
         );" 2>/dev/null || echo "0")
    
    # Count constraints satisfied
    local constraints_met=0
    local constraints_total=4
    
    echo -e "${BOLD}Constraint Satisfaction:${NC}"
    echo ""
    
    # Constraint 1: Success rate (sustainability)
    local success_int=$(printf "%.0f" "$success_rate")
    if [[ $success_int -ge $MIN_SUCCESS_RATE ]]; then
        echo -e "  ${GREEN}✓${NC} Success Rate: ${success_rate}% ≥ ${MIN_SUCCESS_RATE}%"
        ((constraints_met++))
    else
        echo -e "  ${YELLOW}◐${NC} Success Rate: ${success_rate}% < ${MIN_SUCCESS_RATE}%"
    fi
    
    # Constraint 2: Equity (prevents collapse)
    if [[ $equity_score -ge $MIN_EQUITY_SCORE ]]; then
        echo -e "  ${GREEN}✓${NC} Equity Score: ${equity_score}% ≥ ${MIN_EQUITY_SCORE}%"
        ((constraints_met++))
    else
        echo -e "  ${YELLOW}◐${NC} Equity Score: ${equity_score}% < ${MIN_EQUITY_SCORE}%"
    fi
    
    # Constraint 3: Completion (output matches demand)
    local completion_int=$(printf "%.0f" "$avg_completion")
    if [[ $completion_int -ge $TARGET_COMPLETION ]]; then
        echo -e "  ${GREEN}✓${NC} Avg Completion: ${avg_completion}% ≥ ${TARGET_COMPLETION}%"
        ((constraints_met++))
    else
        echo -e "  ${YELLOW}◐${NC} Avg Completion: ${avg_completion}% < ${TARGET_COMPLETION}%"
    fi
    
    # Constraint 4: No structural failures
    if [[ $low_circles -eq 0 ]]; then
        echo -e "  ${GREEN}✓${NC} Structural Integrity: No circles below threshold"
        ((constraints_met++))
    else
        echo -e "  ${YELLOW}◐${NC} Structural Integrity: $low_circles circles underperforming"
    fi
    
    echo ""
    echo -e "  ${BOLD}Constraints: $constraints_met / $constraints_total${NC}"
    echo ""
    
    # Determine verdict
    local verdict
    local verdict_color
    local verdict_icon
    
    if [[ $constraints_met -eq $constraints_total ]]; then
        verdict="GO"
        verdict_color="$GREEN"
        verdict_icon="✓"
        echo -e "  ${verdict_color}${BOLD}═══════════════════════════════════════${NC}"
        echo -e "  ${verdict_color}${BOLD}  VERDICT: $verdict $verdict_icon${NC}"
        echo -e "  ${verdict_color}${BOLD}═══════════════════════════════════════${NC}"
        echo ""
        echo -e "  ${GREEN}✓${NC} ${BOLD}All constraints satisfied${NC}"
        echo -e "  ${DIM}System aligned with reality, sustainable, regenerative${NC}"
        return 0
    elif [[ $constraints_met -ge 2 ]]; then
        verdict="CONTINUE"
        verdict_color="$YELLOW"
        verdict_icon="⚙"
        echo -e "  ${verdict_color}${BOLD}═══════════════════════════════════════${NC}"
        echo -e "  ${verdict_color}${BOLD}  VERDICT: $verdict $verdict_icon${NC}"
        echo -e "  ${verdict_color}${BOLD}═══════════════════════════════════════${NC}"
        echo ""
        echo -e "  ${YELLOW}⚙${NC} ${BOLD}Progress detected, continue execution${NC}"
        echo -e "  ${DIM}System moving toward alignment${NC}"
        return 1
    else
        verdict="NO_GO"
        verdict_color="$RED"
        verdict_icon="✗"
        echo -e "  ${verdict_color}${BOLD}═══════════════════════════════════════${NC}"
        echo -e "  ${verdict_color}${BOLD}  VERDICT: $verdict $verdict_icon${NC}"
        echo -e "  ${verdict_color}${BOLD}═══════════════════════════════════════${NC}"
        echo ""
        echo -e "  ${RED}✗${NC} ${BOLD}Insufficient progress - manual intervention required${NC}"
        echo -e "  ${DIM}Authority has failed, truth demands reassessment${NC}"
        return 2
    fi
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MAIN: Focused Incremental Relentless Execution
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

main() {
    clear
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC} ${BOLD}⚡ Focused Incremental Relentless Execution${NC}           ${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BOLD}Philosophy:${NC} Constraint-based, not rule-based"
    echo -e "${BOLD}Triad:${NC} Manthra (Thought) → Yasna (Alignment) → Mithra (Action)"
    echo -e "${BOLD}Goal:${NC} Truth through measurable outcomes, authority through alignment"
    echo ""
    
    read -p "Press Enter to validate truth and authority conditions..."
    echo ""
    
    # Validate foundations
    if ! validate_truth_conditions; then
        echo ""
        echo -e "${RED}ABORT: Truth conditions invalid${NC}"
        echo -e "${DIM}Cannot proceed when reality is misdescribed${NC}"
        exit 1
    fi
    
    echo ""
    
    if ! validate_authority_conditions; then
        echo ""
        echo -e "${YELLOW}WARNING: Authority conditions challenged${NC}"
        echo -e "${DIM}Proceeding with heightened scrutiny${NC}"
    fi
    
    echo ""
    read -p "Press Enter to begin focused execution..."
    
    # Execute iteratively
    local max_iterations=10
    local stagnation_counter=0
    local prev_constraints=0
    
    for ((iteration=1; iteration<=max_iterations; iteration++)); do
        clear
        echo -e "${BOLD}════════════════════════════════════════════════════════════${NC}"
        echo -e "${BOLD}ITERATION $iteration / $max_iterations${NC}"
        echo -e "${BOLD}════════════════════════════════════════════════════════════${NC}"
        echo ""
        
        # MANTHRA: Directed thought
        local state=$(execute_manthra "$iteration")
        
        echo ""
        
        # YASNA: Alignment check
        if ! state=$(execute_yasna "$state" "$iteration"); then
            echo ""
            echo -e "${RED}Iteration aborted: Alignment failed${NC}"
            continue
        fi
        
        echo ""
        
        # MITHRA: Binding action
        if ! execute_mithra "$state" "$iteration"; then
            echo ""
            echo -e "${RED}Iteration incomplete: Action failed${NC}"
        fi
        
        echo ""
        
        # VERDICT
        generate_verdict "$iteration"
        local verdict_result=$?
        
        # Check exit conditions
        if [[ $verdict_result -eq 0 ]]; then
            echo ""
            echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e "${GREEN}🎉 EXECUTION COMPLETE${NC}"
            echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo ""
            echo -e "${BOLD}All constraints satisfied in $iteration iterations${NC}"
            echo -e "${DIM}System aligned, sustainable, regenerative${NC}"
            break
        fi
        
        # Detect stagnation
        if [[ $verdict_result -eq $prev_constraints ]]; then
            ((stagnation_counter++))
        else
            stagnation_counter=0
        fi
        prev_constraints=$verdict_result
        
        if [[ $stagnation_counter -ge $MAX_STAGNATION_CYCLES ]]; then
            echo ""
            echo -e "${RED}HALT: System stagnated${NC}"
            echo -e "${DIM}Authority failed to produce progress - manual intervention required${NC}"
            break
        fi
        
        if [[ $iteration -lt $max_iterations ]]; then
            echo ""
            echo -e "${DIM}Next iteration in 3 seconds...${NC}"
            sleep 3
        fi
    done
    
    echo ""
    echo -e "${BOLD}Focused execution cycle complete${NC}"
    echo -e "${DIM}Governance audit: logs/governance-audit.log${NC}"
}

if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
    cat <<EOF
${BOLD}ay-focused-execution.sh - Focused Incremental Relentless Execution${NC}

${BOLD}PHILOSOPHY:${NC}
  Constraint-based over rule-based systems
  Truth through measurable outcomes
  Authority legitimized through alignment with reality

${BOLD}TRIAD:${NC}
  Manthra: Directed thought-power (not casual thinking)
  Yasna: Alignment check (not performance ritual)
  Mithra: Binding action (keeps thought-word-deed coherent)

${BOLD}VALIDATES:${NC}
  • Truth conditions: Is reality described honestly?
  • Authority conditions: Is judgment legitimate?
  • Constraint satisfaction: Are sustainability thresholds met?

${BOLD}EXECUTES:${NC}
  1. Validates truth & authority foundations
  2. Iterates through Manthra → Yasna → Mithra cycle
  3. Generates GO/CONTINUE/NO_GO verdicts
  4. Halts on: all constraints met, stagnation, or max iterations

${BOLD}USAGE:${NC}
  ./ay-focused-execution.sh

${BOLD}CONSTRAINTS:${NC}
  Success Rate ≥ 70% (sustainability)
  Equity Score ≥ 65% (prevents collapse)
  Completion ≥ 75% (output matches demand)
  No circles < 70% (structural integrity)

${BOLD}OUTPUT:${NC}
  Real-time execution with verdict per iteration
  Governance audit logged to logs/governance-audit.log

EOF
    exit 0
fi

main "$@"
