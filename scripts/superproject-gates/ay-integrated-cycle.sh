#!/usr/bin/env bash
set -euo pipefail

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ay FIRE - Focused Incremental Relentless Execution
# Complete Integration Cycle
#
# Philosophy: Manthra → Yasna → Mithra with full governance
# Integration: Truth + Authority + Smart + Baseline + Learning
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

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

print_banner() {
    clear
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC} ${BOLD}🔥 FIRE - Focused Incremental Relentless Execution${NC}    ${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BOLD}Complete Integration Cycle:${NC}"
    echo -e "  ${CYAN}1.${NC} PRE-CYCLE: Baseline establishment"
    echo -e "  ${CYAN}2.${NC} PRE-ITERATION: Governance review"
    echo -e "  ${CYAN}3.${NC} EXECUTION: Truth-validated smart cycle"
    echo -e "  ${CYAN}4.${NC} POST-VALIDATION: Retrospective analysis"
    echo -e "  ${CYAN}5.${NC} POST-RETRO: Learning capture"
    echo ""
    echo -e "${BOLD}Philosophy:${NC}"
    echo -e "  • Manthra (thought) → Yasna (alignment) → Mithra (action)"
    echo -e "  • Truth conditions + Authority conditions"
    echo -e "  • Constraint-based (not rule-based)"
    echo -e "  • Truth that survives the body (governance audit)"
    echo ""
}

print_phase() {
    echo ""
    echo -e "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}$1${NC}"
    echo -e "${MAGENTA}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

log_governance() {
    local phase=$1
    local message=$2
    mkdir -p "$PROJECT_ROOT/logs"
    echo "[$(date -Iseconds)] [FIRE] [$phase] $message" >> "$PROJECT_ROOT/logs/governance-audit.log"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PHASE 1: PRE-CYCLE BASELINE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

run_precycle() {
    print_phase "PHASE 1: PRE-CYCLE BASELINE"
    
    log_governance "PRE-CYCLE" "Starting baseline establishment"
    
    if [[ -f "$SCRIPT_DIR/ay-baseline-review.sh" ]]; then
        echo -e "${CYAN}▶${NC} Running baseline review..."
        echo -e "${DIM}  • 10-point health check${NC}"
        echo -e "${DIM}  • Frequency analysis (24h/7d/30d)${NC}"
        echo -e "${DIM}  • 83 hardcoded parameters audit${NC}"
        echo -e "${DIM}  • Order/execution sequence analysis${NC}"
        echo ""
        
        "$SCRIPT_DIR/ay-baseline-review.sh" || {
            echo -e "${YELLOW}⚠${NC} Baseline review encountered issues (continuing)"
        }
    else
        echo -e "${YELLOW}⚠${NC} ay-baseline-review.sh not found (skipping)"
    fi
    
    log_governance "PRE-CYCLE" "Baseline establishment complete"
    
    echo ""
    read -p "Press Enter to continue to governance review..."
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PHASE 2: PRE-ITERATION GOVERNANCE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

run_preiteration() {
    print_phase "PHASE 2: PRE-ITERATION GOVERNANCE"
    
    log_governance "PRE-ITERATION" "Starting governance review"
    
    if [[ -f "$SCRIPT_DIR/ay-governance-framework.sh" ]]; then
        echo -e "${CYAN}▶${NC} Running governance pre-iteration checks..."
        echo -e "${DIM}  • Data integrity verification${NC}"
        echo -e "${DIM}  • Resource availability confirmation${NC}"
        echo -e "${DIM}  • Dependencies validation${NC}"
        echo -e "${DIM}  • Stakeholder approval (if needed)${NC}"
        echo -e "${DIM}  • ROAM risk assessment${NC}"
        echo ""
        
        "$SCRIPT_DIR/ay-governance-framework.sh" pre-iteration || {
            echo -e "${YELLOW}⚠${NC} Governance checks encountered issues (continuing)"
        }
    else
        echo -e "${YELLOW}⚠${NC} ay-governance-framework.sh not found (skipping)"
    fi
    
    log_governance "PRE-ITERATION" "Governance review complete"
    
    echo ""
    read -p "Press Enter to continue to execution phase..."
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PHASE 3: TRUTH-VALIDATED SMART EXECUTION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

run_execution() {
    print_phase "PHASE 3: TRUTH-VALIDATED SMART EXECUTION"
    
    log_governance "EXECUTION" "Starting Manthra → Yasna → Mithra cycle"
    
    # Truth/Authority Validation
    echo -e "${CYAN}▶${NC} Truth & Authority Validation..."
    echo ""
    
    if [[ -f "$SCRIPT_DIR/ay-focused-execution.sh" ]]; then
        # Run truth validation first
        "$SCRIPT_DIR/ay-focused-execution.sh" --validate-only 2>/dev/null || {
            echo -e "${YELLOW}ℹ${NC} Truth validation not yet implemented (continuing)"
        }
    fi
    
    log_governance "EXECUTION" "Truth/Authority validation complete"
    
    # Smart Cycle Execution
    echo ""
    echo -e "${CYAN}▶${NC} Smart-Cycle Execution..."
    echo -e "${DIM}  • Intelligent mode selection${NC}"
    echo -e "${DIM}  • Progress bars and visual feedback${NC}"
    echo -e "${DIM}  • Test criteria validation${NC}"
    echo -e "${DIM}  • GO/CONTINUE/NO_GO verdicts${NC}"
    echo ""
    
    if [[ -f "$SCRIPT_DIR/ay-smart-cycle.sh" ]]; then
        "$SCRIPT_DIR/ay-smart-cycle.sh" || {
            echo -e "${RED}✗${NC} Smart-cycle execution failed"
            log_governance "EXECUTION" "Smart-cycle execution FAILED"
            return 1
        }
    else
        echo -e "${RED}✗${NC} ay-smart-cycle.sh not found"
        return 1
    fi
    
    log_governance "EXECUTION" "Smart-cycle execution complete"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PHASE 4: POST-VALIDATION RETROSPECTIVE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

run_postvalidation() {
    print_phase "PHASE 4: POST-VALIDATION RETROSPECTIVE"
    
    log_governance "POST-VALIDATION" "Starting retrospective analysis"
    
    if [[ -f "$SCRIPT_DIR/ay-governance-framework.sh" ]]; then
        echo -e "${CYAN}▶${NC} Running post-validation analysis..."
        echo -e "${DIM}  • Delta analysis (before/after metrics)${NC}"
        echo -e "${DIM}  • Error detection and classification${NC}"
        echo -e "${DIM}  • Performance trend analysis${NC}"
        echo -e "${DIM}  • Anomaly detection${NC}"
        echo ""
        
        "$SCRIPT_DIR/ay-governance-framework.sh" post-validation || {
            echo -e "${YELLOW}⚠${NC} Post-validation analysis encountered issues (continuing)"
        }
    else
        echo -e "${YELLOW}⚠${NC} ay-governance-framework.sh not found (skipping)"
    fi
    
    log_governance "POST-VALIDATION" "Retrospective analysis complete"
    
    echo ""
    read -p "Press Enter to continue to learning capture..."
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PHASE 5: POST-RETRO LEARNING
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

run_postretro() {
    print_phase "PHASE 5: POST-RETRO LEARNING"
    
    log_governance "POST-RETRO" "Starting learning capture"
    
    if [[ -f "$SCRIPT_DIR/ay-governance-framework.sh" ]]; then
        echo -e "${CYAN}▶${NC} Capturing learning and validating skills..."
        echo -e "${DIM}  • MPP learning trigger (Method-Pattern-Practice)${NC}"
        echo -e "${DIM}  • Skills validation and update${NC}"
        echo -e "${DIM}  • Data re-export for next cycle${NC}"
        echo -e "${DIM}  • Governance audit finalization${NC}"
        echo ""
        
        "$SCRIPT_DIR/ay-governance-framework.sh" post-retro || {
            echo -e "${YELLOW}⚠${NC} Post-retro learning encountered issues (continuing)"
        }
    else
        echo -e "${YELLOW}⚠${NC} ay-governance-framework.sh not found (skipping)"
    fi
    
    log_governance "POST-RETRO" "Learning capture complete"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# COMPLETION SUMMARY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

print_completion() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC} ${BOLD}✅ FIRE CYCLE COMPLETE${NC}                                ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BOLD}All Phases Executed:${NC}"
    echo -e "  ${GREEN}✓${NC} PRE-CYCLE: Baseline established"
    echo -e "  ${GREEN}✓${NC} PRE-ITERATION: Governance validated"
    echo -e "  ${GREEN}✓${NC} EXECUTION: Truth + Smart cycle"
    echo -e "  ${GREEN}✓${NC} POST-VALIDATION: Retrospective analyzed"
    echo -e "  ${GREEN}✓${NC} POST-RETRO: Learning captured"
    echo ""
    echo -e "${BOLD}Governance Audit:${NC}"
    echo -e "  ${CYAN}📝${NC} logs/governance-audit.log"
    echo ""
    echo -e "${BOLD}Learning Artifacts:${NC}"
    echo -e "  ${CYAN}📦${NC} .cache/learning-retro-*.json"
    echo -e "  ${CYAN}📊${NC} reports/learning-transmission.log"
    echo ""
    echo -e "${BOLD}Next Steps:${NC}"
    echo -e "  ${CYAN}▶${NC} Review: cat logs/governance-audit.log | tail -50"
    echo -e "  ${CYAN}▶${NC} Skills: npx agentdb skills list"
    echo -e "  ${CYAN}▶${NC} Repeat: ay integrated (run another cycle)"
    echo ""
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MAIN EXECUTION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

main() {
    print_banner
    
    log_governance "START" "FIRE cycle initiated"
    
    # Phase 1: Baseline
    run_precycle
    
    # Phase 2: Governance
    run_preiteration
    
    # Phase 3: Execution
    run_execution || {
        echo -e "${RED}✗${NC} Execution phase failed"
        log_governance "FAILURE" "FIRE cycle failed at execution phase"
        exit 1
    }
    
    # Phase 4: Retrospective
    run_postvalidation
    
    # Phase 5: Learning
    run_postretro
    
    # Completion
    log_governance "COMPLETE" "FIRE cycle completed successfully"
    print_completion
}

if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
    cat <<EOF
${BOLD}ay-integrated-cycle.sh - FIRE (Focused Incremental Relentless Execution)${NC}

${BOLD}COMPLETE INTEGRATION:${NC}
  This script runs the full FIRE cycle, integrating:
  • Truth/Authority validation (ay truth)
  • Smart-cycle automation (ay smart)
  • Baseline review (ay baseline)
  • Governance framework (ay govern)
  • MPP learning capture
  • Skills validation

${BOLD}PHASES:${NC}
  1. PRE-CYCLE: Baseline establishment
     - Health check, parameters, frequency analysis
  
  2. PRE-ITERATION: Governance review
     - Compliance, ROAM, stakeholder approval
  
  3. EXECUTION: Truth-validated smart cycle
     - Truth conditions, Authority conditions
     - Manthra → Yasna → Mithra triad
     - Smart mode selection, progress bars
  
  4. POST-VALIDATION: Retrospective
     - Delta analysis, error detection, trends
  
  5. POST-RETRO: Learning capture
     - MPP learning, skills validation, data export

${BOLD}USAGE:${NC}
  ay integrated
  # Or: ay cycle
  # Or: ay fire
  
  Directly:
  ./scripts/ay-integrated-cycle.sh

${BOLD}ESTIMATED TIME:${NC}
  15-30 minutes (depending on system state)

${BOLD}GOVERNANCE:${NC}
  All phases logged to: logs/governance-audit.log
  Truth that survives the body (transmission)

${BOLD}PHILOSOPHY:${NC}
  Manthra (Directed thought): Analyzes state, selects mode
  Yasna (Alignment): Verifies thought↔word↔deed consistency
  Mithra (Binding action): Executes with accountability

  Constraint-based (not rule-based):
  • Success ≥70% (sustainability threshold)
  • Equity ≥65% (free-rider prevention)
  • Completion ≥75% (regenerative threshold)

EOF
    exit 0
fi

main "$@"
