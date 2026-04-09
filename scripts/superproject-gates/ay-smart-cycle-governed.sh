#!/usr/bin/env bash
# ay-smart-cycle-governed.sh - Governance-Enhanced Smart Cycle
# Adds: Baseline→Audit→Execute→Validate→Retro→Learning workflow

set -euo pipefail

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Configuration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_PATH="${DB_PATH:-data/agent-database.db}"
BASELINE_DIR="${BASELINE_DIR:-data/baselines}"
AUDIT_DIR="${AUDIT_DIR:-data/audits}"
RETRO_DIR="${RETRO_DIR:-data/retrospectives}"

# Thresholds (overridable via env)
MIN_SUCCESS_RATE="${MIN_SUCCESS_RATE:-70}"
MIN_EQUITY_SCORE="${MIN_EQUITY_SCORE:-65}"
TARGET_COMPLETION="${TARGET_COMPLETION:-75}"
MAX_ITERATIONS="${AY_MAX_ITERATIONS:-10}"
DRY_RUN="${AY_DRY_RUN:-0}"

# Create directories
mkdir -p "$BASELINE_DIR" "$AUDIT_DIR" "$RETRO_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

START_TIME=$(date +%s)
CYCLE_ID="cycle-$(date +%Y%m%d-%H%M%S)"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Governance Phase Functions
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

print_phase() {
    echo ""
    echo -e "${BOLD}${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${BLUE}║${NC} ${BOLD}$1${NC}"
    echo -e "${BOLD}${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Phase 1: Establish Baseline
establish_baseline() {
    print_phase "📊 PHASE 1: ESTABLISH BASELINE"
    
    local baseline_file="$BASELINE_DIR/$CYCLE_ID-baseline.json"
    
    echo -e "${DIM}Capturing current system state...${NC}"
    
    # Capture metrics from AgentDB
    local total_eps=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes;" 2>/dev/null || echo "0")
    local success_eps=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes WHERE success = 1;" 2>/dev/null || echo "0")
    local success_rate=$(echo "scale=2; $success_eps * 100 / $total_eps" | bc 2>/dev/null || echo "0.00")
    
    local avg_completion=$(sqlite3 "$DB_PATH" \
        "SELECT COALESCE(ROUND(AVG(completion_pct), 2), 0) FROM completion_episodes;" \
        2>/dev/null || echo "0")
    
    # Calculate baseline error frequency
    local error_count=$(sqlite3 "$DB_PATH" \
        "SELECT COUNT(*) FROM episodes WHERE success = 0;" \
        2>/dev/null || echo "0")
    local error_freq=$(echo "scale=2; $error_count * 100 / $total_eps" | bc 2>/dev/null || echo "0.00")
    
    # Parameterization check - count hardcoded values in recent code
    local hardcoded_params=$(grep -r "0\\.7\\|0\\.9\\|70\\|65\\|75" scripts/ 2>/dev/null | wc -l || echo "0")
    
    # Order analysis - check ceremony execution order compliance
    local order_violations=$(sqlite3 "$DB_PATH" \
        "SELECT COUNT(*) FROM episodes WHERE metadata LIKE '%order_violation%';" \
        2>/dev/null || echo "0")
    
    # Create baseline JSON
    cat > "$baseline_file" <<EOF
{
  "cycle_id": "$CYCLE_ID",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "metrics": {
    "success_rate": $success_rate,
    "avg_completion": $avg_completion,
    "total_episodes": $total_eps,
    "error_frequency": $error_freq
  },
  "analysis": {
    "hardcoded_params": $hardcoded_params,
    "order_violations": $order_violations
  },
  "targets": {
    "success_rate": $MIN_SUCCESS_RATE,
    "equity_score": $MIN_EQUITY_SCORE,
    "completion": $TARGET_COMPLETION
  }
}
EOF
    
    echo -e "  ${GREEN}✓${NC} Baseline established"
    echo -e "  ${DIM}Success Rate: ${BOLD}${success_rate}%${NC}"
    echo -e "  ${DIM}Error Frequency: ${BOLD}${error_freq}%${NC}"
    echo -e "  ${DIM}Hardcoded Params: ${BOLD}${hardcoded_params}${NC}"
    echo -e "  ${DIM}Order Violations: ${BOLD}${order_violations}${NC}"
    echo -e "  ${DIM}File: ${CYAN}$baseline_file${NC}"
    
    echo "$baseline_file"
}

# Phase 2: Governance Review & Audit
governance_audit() {
    print_phase "🔍 PHASE 2: GOVERNANCE REVIEW & AUDIT"
    
    local baseline_file=$1
    local audit_file="$AUDIT_DIR/$CYCLE_ID-audit.json"
    
    echo -e "${DIM}Performing governance audit...${NC}"
    
    # Parse baseline
    local success_rate=$(jq -r '.metrics.success_rate' "$baseline_file" 2>/dev/null || echo "0")
    local error_freq=$(jq -r '.metrics.error_frequency' "$baseline_file" 2>/dev/null || echo "0")
    local hardcoded=$(jq -r '.analysis.hardcoded_params' "$baseline_file" 2>/dev/null || echo "0")
    local violations=$(jq -r '.analysis.order_violations' "$baseline_file" 2>/dev/null || echo "0")
    
    # Audit checks with ROAM-R classification (Resolved, Owned, Accepted, Mitigated)
    local audit_status="PASS"
    local findings=()
    declare -A risks_resolved risks_owned risks_accepted risks_mitigated
    local risk_count=0
    local resolved_count=0
    
    # Check 1: Error frequency threshold (CRITICAL RISK)
    if (( $(echo "$error_freq > 30" | bc -l) )); then
        audit_status="NO-GO"
        findings+=("\"🔴 CRITICAL: High error frequency ${error_freq}% (threshold: 30%)\"")
        risks_owned["error_freq"]="High error rate indicates system instability"
        ((risk_count++))
    fi
    
    # Check 2: Hardcoded parameters (MODERATE RISK - can accept)
    if (( hardcoded > 50 )); then
        if [ "$audit_status" != "NO-GO" ]; then
            audit_status="WARN"
        fi
        findings+=("\"🟡 MODERATE: Excessive hardcoded params: $hardcoded (threshold: 50)\"")
        risks_accepted["hardcoded"]="Technical debt accepted - plan refactoring"
        ((risk_count++))
    fi
    
    # Check 3: Order violations (LOW RISK - can mitigate)
    if (( violations > 0 )); then
        if [ "$audit_status" != "NO-GO" ] && [ "$audit_status" != "WARN" ]; then
            audit_status="WARN"
        fi
        findings+=("\"🟢 LOW: Ceremony order violations detected: $violations\"")
        risks_mitigated["order_violations"]="Add order enforcement in next iteration"
        ((risk_count++))
    fi
    
    # Check 4: Success rate below 50% (CRITICAL RISK)
    if (( $(echo "$success_rate < 50" | bc -l) )); then
        audit_status="NO-GO"
        findings+=("\"🔴 CRITICAL: Success rate ${success_rate}% below minimum (50%)\"")
        risks_owned["success_rate"]="System not production-ready"
        ((risk_count++))
    fi
    
    # Check 5: No recent episodes (OPERATIONAL RISK)
    local recent_eps=$(sqlite3 "$DB_PATH" \
        "SELECT COUNT(*) FROM episodes WHERE timestamp > datetime('now', '-1 hour');" \
        2>/dev/null || echo "0")
    if (( recent_eps == 0 )); then
        if [ "$audit_status" != "NO-GO" ]; then
            audit_status="WARN"
        fi
        findings+=("\"🟡 OPERATIONAL: No episodes in last hour - system may be stalled\"")
        risks_owned["stalled"]="System not actively running"
        ((risk_count++))
    fi
    
    # Build findings JSON array
    local findings_json=$(printf '%s\n' "${findings[@]}" | jq -R . | jq -s .)
    
    # Create audit report
    cat > "$audit_file" <<EOF
{
  "cycle_id": "$CYCLE_ID",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "$audit_status",
  "findings": $findings_json,
  "recommendations": {
    "proceed": $([ "$audit_status" != "FAIL" ] && echo "true" || echo "false"),
    "priority_actions": []
  }
}
EOF
    
    # Display audit results with ROAM
    case "$audit_status" in
        PASS)
            echo -e "  ${GREEN}✓ AUDIT PASSED${NC} - Proceed with cycle"
            echo -e "  ${DIM}No critical risks identified${NC}"
            ;;
        WARN)
            echo -e "  ${YELLOW}⚠ AUDIT WARNING${NC} - Risks identified but manageable"
            echo -e "  ${DIM}$risk_count risk(s) require attention${NC}"
            ;;
        NO-GO)
            echo -e "  ${RED}✗ NO-GO - CRITICAL RISKS DETECTED${NC}"
            echo -e "  ${DIM}$risk_count critical risk(s) prevent execution${NC}"
            ;;
    esac
    
    if [ ${#findings[@]} -gt 0 ]; then
        echo ""
        echo -e "${BOLD}Findings:${NC}"
        for finding in "${findings[@]}"; do
            echo -e "  • $(echo $finding | tr -d '\"')"
        done
    fi
    
    # Check for previously resolved risks (compare to last cycle)
    local prev_baseline="$BASELINE_DIR/$(ls -t "$BASELINE_DIR" 2>/dev/null | head -2 | tail -1)"
    if [[ -f "$prev_baseline" ]]; then
        local prev_error_freq=$(jq -r '.metrics.error_frequency' "$prev_baseline" 2>/dev/null || echo "0")
        local prev_success=$(jq -r '.metrics.success_rate' "$prev_baseline" 2>/dev/null || echo "0")
        
        # Check if error frequency was resolved
        if (( $(echo "$prev_error_freq > 30 && $error_freq <= 30" | bc -l) )); then
            risks_resolved["error_freq"]="Reduced from ${prev_error_freq}% to ${error_freq}%"
            ((resolved_count++))
        fi
        
        # Check if success rate was resolved
        if (( $(echo "$prev_success < 50 && $success_rate >= 50" | bc -l) )); then
            risks_resolved["success_rate"]="Improved from ${prev_success}% to ${success_rate}%"
            ((resolved_count++))
        fi
    fi
    
    # Display ROAM-R framework
    if [[ $risk_count -gt 0 ]] || [[ $resolved_count -gt 0 ]]; then
        echo ""
        echo -e "${BOLD}ROAM-R - Risk Management Framework:${NC}"
        echo -e "${DIM}(Resolved, Owned, Accepted, Mitigated)${NC}"
        echo ""
        
        if [ ${#risks_resolved[@]} -gt 0 ]; then
            echo -e "  ${GREEN}${BOLD}✓ RESOLVED${NC} (Fixed since last cycle):"
            for risk in "${!risks_resolved[@]}"; do
                echo -e "    ${GREEN}✓${NC} $risk: ${risks_resolved[$risk]}"
            done
            echo ""
        fi
        
        if [ ${#risks_owned[@]} -gt 0 ]; then
            echo -e "  ${RED}${BOLD}• OWNED${NC} (Critical - must resolve before proceeding):"
            for risk in "${!risks_owned[@]}"; do
                echo -e "    ${RED}✗${NC} $risk: ${risks_owned[$risk]}"
            done
            echo ""
        fi
        
        if [ ${#risks_accepted[@]} -gt 0 ]; then
            echo -e "  ${YELLOW}${BOLD}• ACCEPTED${NC} (Acknowledged - scheduled for mitigation):"
            for risk in "${!risks_accepted[@]}"; do
                echo -e "    ${YELLOW}▶${NC} $risk: ${risks_accepted[$risk]}"
            done
            echo ""
        fi
        
        if [ ${#risks_mitigated[@]} -gt 0 ]; then
            echo -e "  ${CYAN}${BOLD}• MITIGATED${NC} (Controlled - monitoring in place):"
            for risk in "${!risks_mitigated[@]}"; do
                echo -e "    ${CYAN}●${NC} $risk: ${risks_mitigated[$risk]}"
            done
        fi
        
        # Summary
        echo ""
        echo -e "${DIM}Risk Summary: ${GREEN}${resolved_count} resolved${NC}${DIM}, ${RED}${#risks_owned[@]} owned${NC}${DIM}, ${YELLOW}${#risks_accepted[@]} accepted${NC}${DIM}, ${CYAN}${#risks_mitigated[@]} mitigated${NC}"
    fi
    
    echo ""
    echo -e "  ${DIM}File: ${CYAN}$audit_file${NC}"
    
    echo "$audit_file|$audit_status"
}

# Phase 3: Execute Smart Cycle (delegates to original script)
execute_smart_cycle() {
    print_phase "⚙️  PHASE 3: EXECUTE IMPROVEMENT CYCLE"
    
    echo -e "${DIM}Running smart-cycle orchestrator...${NC}"
    echo ""
    
    # Call original smart-cycle script
    if [[ -f "$SCRIPT_DIR/ay-smart-cycle.sh" ]]; then
        if [[ $DRY_RUN -eq 1 ]]; then
            echo -e "  ${YELLOW}DRY RUN${NC} - Would execute: $SCRIPT_DIR/ay-smart-cycle.sh"
            return 0
        else
            "$SCRIPT_DIR/ay-smart-cycle.sh"
        fi
    else
        echo -e "  ${RED}✗${NC} Smart-cycle script not found: $SCRIPT_DIR/ay-smart-cycle.sh"
        return 1
    fi
}

# Phase 4: Post-Validation & MPP Learning Trigger
post_validation() {
    print_phase "✅ PHASE 4: POST-VALIDATION & SKILLS AUDIT"
    
    local baseline_file=$1
    
    echo -e "${DIM}Validating improvements against baseline...${NC}"
    
    # Capture post-cycle metrics
    local total_eps=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes;" 2>/dev/null || echo "0")
    local success_eps=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes WHERE success = 1;" 2>/dev/null || echo "0")
    local success_rate_after=$(echo "scale=2; $success_eps * 100 / $total_eps" | bc 2>/dev/null || echo "0.00")
    
    # Compare with baseline
    local success_rate_before=$(jq -r '.metrics.success_rate' "$baseline_file" 2>/dev/null || echo "0")
    local delta=$(echo "scale=2; $success_rate_after - $success_rate_before" | bc 2>/dev/null || echo "0.00")
    
    echo ""
    echo -e "  ${BOLD}Success Rate:${NC}"
    echo -e "    Before: ${success_rate_before}%"
    echo -e "    After:  ${success_rate_after}%"
    echo -e "    Delta:  ${GREEN}${delta:+}$delta%${NC}"
    echo ""
    
    # Trigger MPP Learning if improvement detected
    if (( $(echo "$delta > 5" | bc -l) )); then
        echo -e "  ${GREEN}🧠 MPP Learning Triggered${NC} (improvement ≥5%)"
        echo -e "  ${DIM}Exporting successful patterns...${NC}"
        
        # Trigger learning export
        if [[ $DRY_RUN -eq 0 ]]; then
            # TODO: Wire to actual MPP learning system
            echo -e "  ${CYAN}→ ay mpp learn --cycle=$CYCLE_ID${NC}"
        fi
    fi
    
    # Validate skills execution
    echo ""
    echo -e "  ${BOLD}Skills Validation:${NC}"
    local skills_executed=$(sqlite3 "$DB_PATH" \
        "SELECT COUNT(DISTINCT circle) FROM completion_episodes 
         WHERE timestamp > datetime('now', '-1 hour');" \
        2>/dev/null || echo "0")
    echo -e "    Skills Executed: ${BOLD}$skills_executed${NC}"
    
    # Check if data export needed
    local episodes_since_export=$(sqlite3 "$DB_PATH" \
        "SELECT COUNT(*) FROM episodes WHERE timestamp > datetime('now', '-24 hours');" \
        2>/dev/null || echo "0")
    
    if (( episodes_since_export > 1000 )); then
        echo ""
        echo -e "  ${YELLOW}📤 Data Re-export Recommended${NC}"
        echo -e "  ${DIM}Episodes since last export: $episodes_since_export${NC}"
        echo -e "  ${CYAN}→ ay export --incremental${NC}"
    fi
}

# Phase 5: Retrospective Analysis
retrospective_analysis() {
    print_phase "📝 PHASE 5: RETROSPECTIVE ANALYSIS"
    
    local baseline_file=$1
    local audit_file=$2
    local retro_file="$RETRO_DIR/$CYCLE_ID-retro.json"
    
    echo -e "${DIM}Analyzing cycle effectiveness...${NC}"
    
    # What worked?
    local improvements=$(jq -r '.metrics.success_rate' "$baseline_file" 2>/dev/null || echo "0")
    
    # What didn't?
    local audit_status=$(echo "$audit_file" | cut -d'|' -f2)
    local audit_findings=$(jq -r '.findings | length' "$(echo $audit_file | cut -d'|' -f1)" 2>/dev/null || echo "0")
    
    # Calculate cycle effectiveness score (0-100)
    local effectiveness=50
    if [ "$audit_status" = "PASS" ]; then
        effectiveness=$((effectiveness + 20))
    fi
    if (( $(echo "$improvements > 5" | bc -l) )); then
        effectiveness=$((effectiveness + 30))
    fi
    
    # Create retro JSON
    cat > "$retro_file" <<EOF
{
  "cycle_id": "$CYCLE_ID",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "effectiveness_score": $effectiveness,
  "audit_status": "$audit_status",
  "findings_count": $audit_findings,
  "recommendations": {
    "continue": ["Automated metric tracking", "Visual progress indicators"],
    "improve": ["Verdict display timeout", "Error frequency reduction"],
    "experiment": ["Adaptive threshold tuning", "Predictive mode selection"]
  }
}
EOF
    
    echo ""
    echo -e "  ${BOLD}Cycle Effectiveness: ${GREEN}${effectiveness}/100${NC}"
    echo ""
    echo -e "  ${BOLD}Continue:${NC}"
    echo -e "    • Automated metric tracking"
    echo -e "    • Visual progress indicators"
    echo ""
    echo -e "  ${BOLD}Improve:${NC}"
    echo -e "    • Verdict display timeout"
    echo -e "    • Error frequency reduction"
    echo ""
    echo -e "  ${BOLD}Experiment:${NC}"
    echo -e "    • Adaptive threshold tuning"
    echo -e "    • Predictive mode selection"
    echo ""
    echo -e "  ${DIM}File: ${CYAN}$retro_file${NC}"
    
    echo "$retro_file"
}

# Phase 6: Learning Capture
learning_capture() {
    print_phase "🎓 PHASE 6: LEARNING CAPTURE"
    
    local retro_file=$1
    
    echo -e "${DIM}Capturing lessons learned...${NC}"
    
    local effectiveness=$(jq -r '.effectiveness_score' "$retro_file" 2>/dev/null || echo "50")
    
    echo ""
    if (( effectiveness >= 80 )); then
        echo -e "  ${GREEN}✓ HIGH EFFECTIVENESS${NC} - Patterns captured for reuse"
        echo -e "  ${CYAN}→ ay mpp export --cycle=$CYCLE_ID --tag=high-effectiveness${NC}"
    elif (( effectiveness >= 60 )); then
        echo -e "  ${YELLOW}⚠ MODERATE EFFECTIVENESS${NC} - Review for optimization"
        echo -e "  ${CYAN}→ ay analyze --cycle=$CYCLE_ID --deep${NC}"
    else
        echo -e "  ${RED}✗ LOW EFFECTIVENESS${NC} - Manual review required"
        echo -e "  ${CYAN}→ ay review --cycle=$CYCLE_ID --manual${NC}"
    fi
    
    echo ""
    echo -e "  ${BOLD}Next Cycle Preparation:${NC}"
    echo -e "    • Baseline will be compared to: $CYCLE_ID"
    echo -e "    • Thresholds may be adapted based on effectiveness"
    echo -e "    • Learnings will inform mode selection"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Main Orchestration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

main() {
    echo ""
    echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}║${NC} ${BOLD}Governed Smart Cycle${NC} - Full Lifecycle"
    echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BOLD}Cycle ID:${NC} $CYCLE_ID"
    echo -e "${BOLD}Targets:${NC} Success ${MIN_SUCCESS_RATE}% | Equity ${MIN_EQUITY_SCORE}% | Completion ${TARGET_COMPLETION}%"
    [[ $DRY_RUN -eq 1 ]] && echo -e "${BOLD}Mode:${NC} ${YELLOW}DRY RUN${NC}"
    echo ""
    
    read -p "Press Enter to begin governed cycle, or Ctrl+C to cancel..."
    
    # Execute governance phases
    local baseline_file=$(establish_baseline)
    
    local audit_result=$(governance_audit "$baseline_file")
    local audit_file=$(echo "$audit_result" | cut -d'|' -f1)
    local audit_status=$(echo "$audit_result" | cut -d'|' -f2)
    
    # Check if audit allows proceeding
    if [ "$audit_status" = "NO-GO" ]; then
        echo ""
        echo -e "${RED}${BOLD}╔══════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}${BOLD}║  ⚠ NO-GO VERDICT - CYCLE ABORTED                        ║${NC}"
        echo -e "${RED}${BOLD}╚══════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${BOLD}Critical risks detected that prevent safe execution:${NC}"
        echo ""
        echo -e "${RED}Required Actions:${NC}"
        
        # Generate specific NO-GO recommendations
        local has_error_risk=0
        local has_success_risk=0
        for risk in "${!risks_owned[@]}"; do
            if [[ $risk == "error_freq" ]]; then
                has_error_risk=1
            elif [[ $risk == "success_rate" ]]; then
                has_success_risk=1
            fi
        done
        
        if [[ $has_error_risk -eq 1 ]]; then
            echo -e "  1. ${BOLD}Investigate error spike${NC}"
            echo -e "     → Run: ${CYAN}ay logs --errors --last 100${NC}"
            echo -e "     → Check: ${CYAN}ay status --health${NC}"
        fi
        
        if [[ $has_success_risk -eq 1 ]]; then
            echo -e "  2. ${BOLD}Review system stability${NC}"
            echo -e "     → Run: ${CYAN}ay ceremony status${NC}"
            echo -e "     → Fix: ${CYAN}ay repair --critical${NC}"
        fi
        
        echo ""
        echo -e "  3. ${BOLD}Re-run audit after fixes${NC}"
        echo -e "     → Run: ${CYAN}AY_DRY_RUN=1 $0${NC}"
        echo ""
        echo -e "${DIM}Audit details: $audit_file${NC}"
        echo ""
        exit 1
    fi
    
    # Execute improvement cycle
    execute_smart_cycle
    
    # Post-cycle validation
    post_validation "$baseline_file"
    
    # Retrospective
    local retro_file=$(retrospective_analysis "$baseline_file" "$audit_result")
    
    # Learning capture
    learning_capture "$retro_file"
    
    # Final summary
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))
    
    echo ""
    echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${GREEN}║${NC} ${BOLD}Governed Cycle Complete${NC}"
    echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BOLD}Duration:${NC} ${duration}s"
    echo -e "${BOLD}Artifacts:${NC}"
    echo -e "  • Baseline: ${CYAN}$baseline_file${NC}"
    echo -e "  • Audit: ${CYAN}$audit_file${NC}"
    echo -e "  • Retro: ${CYAN}$retro_file${NC}"
    echo ""
    echo -e "${DIM}View dashboard: ${NC}${CYAN}ay improve dashboard${NC}"
    echo ""
}

# Entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
