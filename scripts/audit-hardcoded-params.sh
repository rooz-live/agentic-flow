#!/usr/bin/env bash
# scripts/audit-hardcoded-params.sh
# Systematic audit of hardcoded parameters requiring MCP/MPP dynamic calculation

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ═══════════════════════════════════════════════════════════════════════════
# Audit Categories
# ═══════════════════════════════════════════════════════════════════════════

audit_error_thresholds() {
    echo -e "${CYAN}━━━ ERROR THRESHOLDS ━━━${NC}"
    
    # Find hardcoded error/warning/failure thresholds
    local patterns=(
        "threshold.*=.*[0-9]"
        "MIN_.*=.*[0-9]"
        "MAX_.*=.*[0-9]"
        "WARNING_.*=.*[0-9]"
        "ERROR_.*=.*[0-9]"
        "FAILURE_.*=.*[0-9]"
        "SUCCESS_.*=.*[0-9]"
    )
    
    for pattern in "${patterns[@]}"; do
        echo -e "\n${YELLOW}Pattern: $pattern${NC}"
        grep -rn --include="*.sh" --include="*.ts" --include="*.js" \
            -E "$pattern" "$SCRIPT_DIR" 2>/dev/null | \
            grep -v "audit-hardcoded-params.sh" | \
            head -20 || true
    done
}

audit_frequency_parameters() {
    echo -e "\n${CYAN}━━━ FREQUENCY PARAMETERS ━━━${NC}"
    
    local patterns=(
        "CHECK_EVERY.*=.*[0-9]"
        "FREQUENCY.*=.*[0-9]"
        "INTERVAL.*=.*[0-9]"
        "RETRY.*=.*[0-9]"
        "TIMEOUT.*=.*[0-9]"
        "DELAY.*=.*[0-9]"
        "sleep [0-9]"
    )
    
    for pattern in "${patterns[@]}"; do
        echo -e "\n${YELLOW}Pattern: $pattern${NC}"
        grep -rn --include="*.sh" --include="*.ts" --include="*.js" \
            -E "$pattern" "$SCRIPT_DIR" 2>/dev/null | \
            grep -v "audit-hardcoded-params.sh" | \
            head -20 || true
    done
}

audit_baseline_assumptions() {
    echo -e "\n${CYAN}━━━ BASELINE ASSUMPTIONS ━━━${NC}"
    
    local patterns=(
        "DEFAULT_.*=.*[0-9]"
        "BASELINE_.*=.*[0-9]"
        "INITIAL_.*=.*[0-9]"
        "reward.*=.*[0-9]\.[0-9]"
        "REWARD.*=.*[0-9]\.[0-9]"
        "score.*=.*[0-9]\.[0-9]"
        "SCORE.*=.*[0-9]\.[0-9]"
    )
    
    for pattern in "${patterns[@]}"; do
        echo -e "\n${YELLOW}Pattern: $pattern${NC}"
        grep -rn --include="*.sh" --include="*.ts" --include="*.js" \
            -E "$pattern" "$SCRIPT_DIR" 2>/dev/null | \
            grep -v "audit-hardcoded-params.sh" | \
            head -20 || true
    done
}

audit_random_calculations() {
    echo -e "\n${CYAN}━━━ RANDOM CALCULATIONS (Should be Dynamic) ━━━${NC}"
    
    echo -e "\n${RED}🎲 Random reward calculations:${NC}"
    grep -rn --include="*.sh" --include="*.ts" --include="*.js" \
        -E "reward.*RANDOM|RANDOM.*reward" "$SCRIPT_DIR" 2>/dev/null | \
        grep -v "audit-hardcoded-params.sh" || true
    
    echo -e "\n${RED}🎲 Random threshold calculations:${NC}"
    grep -rn --include="*.sh" --include="*.ts" --include="*.js" \
        -E "\$RANDOM.*%.*[0-9]|\$\(.*RANDOM" "$SCRIPT_DIR" 2>/dev/null | \
        grep -v "audit-hardcoded-params.sh" | \
        head -20 || true
}

audit_order_dependencies() {
    echo -e "\n${CYAN}━━━ ORDER-OF-EXECUTION DEPENDENCIES ━━━${NC}"
    
    # Find ceremony/circle execution order assumptions
    echo -e "\n${YELLOW}Ceremony execution order:${NC}"
    grep -rn --include="*.sh" --include="*.ts" \
        -E "ceremonies=|CEREMONIES=|ceremony_order" "$SCRIPT_DIR" 2>/dev/null | \
        grep -v "audit-hardcoded-params.sh" | \
        head -20 || true
    
    echo -e "\n${YELLOW}Circle execution order:${NC}"
    grep -rn --include="*.sh" --include="*.ts" \
        -E "circles=|CIRCLES=|circle_order" "$SCRIPT_DIR" 2>/dev/null | \
        grep -v "audit-hardcoded-params.sh" | \
        head -20 || true
    
    echo -e "\n${YELLOW}Hardcoded loops:${NC}"
    grep -rn --include="*.sh" \
        -E "for .* in (orchestrator|assessor|analyst)" "$SCRIPT_DIR" 2>/dev/null | \
        grep -v "audit-hardcoded-params.sh" | \
        head -20 || true
}

audit_circuit_breaker_params() {
    echo -e "\n${CYAN}━━━ CIRCUIT BREAKER PARAMETERS ━━━${NC}"
    
    local patterns=(
        "CIRCUIT_BREAKER.*=.*[0-9]"
        "circuit.*threshold"
        "breaker.*threshold"
        "DIVERGENCE_RATE.*=.*[0-9]"
        "divergence.*rate"
    )
    
    for pattern in "${patterns[@]}"; do
        echo -e "\n${YELLOW}Pattern: $pattern${NC}"
        grep -rn --include="*.sh" --include="*.ts" --include="*.js" \
            -E "$pattern" "$SCRIPT_DIR" 2>/dev/null | \
            grep -v "audit-hardcoded-params.sh" | \
            head -20 || true
    done
}

audit_learning_params() {
    echo -e "\n${CYAN}━━━ LEARNING HYPERPARAMETERS ━━━${NC}"
    
    local patterns=(
        "learning_rate.*=.*[0-9]"
        "LEARNING_RATE.*=.*[0-9]"
        "alpha.*=.*[0-9]\.[0-9]"
        "ALPHA.*=.*[0-9]\.[0-9]"
        "gamma.*=.*[0-9]\.[0-9]"
        "GAMMA.*=.*[0-9]\.[0-9]"
        "epsilon.*=.*[0-9]\.[0-9]"
        "EPSILON.*=.*[0-9]\.[0-9]"
    )
    
    for pattern in "${patterns[@]}"; do
        echo -e "\n${YELLOW}Pattern: $pattern${NC}"
        grep -rn --include="*.sh" --include="*.ts" --include="*.js" \
            -E "$pattern" "$SCRIPT_DIR" 2>/dev/null | \
            grep -v "audit-hardcoded-params.sh" | \
            head -20 || true
    done
}

audit_percentile_params() {
    echo -e "\n${CYAN}━━━ PERCENTILE/STATISTICAL PARAMETERS ━━━${NC}"
    
    local patterns=(
        "p[0-9]+.*=.*[0-9]"
        "percentile.*=.*[0-9]"
        "PERCENTILE.*=.*[0-9]"
        "quantile.*=.*[0-9]"
        "QUANTILE.*=.*[0-9]"
    )
    
    for pattern in "${patterns[@]}"; do
        echo -e "\n${YELLOW}Pattern: $pattern${NC}"
        grep -rn --include="*.sh" --include="*.ts" --include="*.js" \
            -E "$pattern" "$SCRIPT_DIR" 2>/dev/null | \
            grep -v "audit-hardcoded-params.sh" | \
            head -20 || true
    done
}

generate_summary() {
    echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}AUDIT SUMMARY${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    echo -e "\n${CYAN}Hardcoded Parameters Found:${NC}"
    
    local threshold_count=$(grep -r --include="*.sh" --include="*.ts" -E "threshold.*=.*[0-9]|MIN_.*=.*[0-9]|MAX_.*=.*[0-9]" "$SCRIPT_DIR" 2>/dev/null | grep -v audit-hardcoded-params.sh | wc -l)
    echo "  Error Thresholds: $threshold_count"
    
    local freq_count=$(grep -r --include="*.sh" --include="*.ts" -E "CHECK_EVERY.*=.*[0-9]|FREQUENCY.*=.*[0-9]|INTERVAL.*=.*[0-9]" "$SCRIPT_DIR" 2>/dev/null | grep -v audit-hardcoded-params.sh | wc -l)
    echo "  Frequency Parameters: $freq_count"
    
    local baseline_count=$(grep -r --include="*.sh" --include="*.ts" -E "DEFAULT_.*=.*[0-9]|BASELINE_.*=.*[0-9]" "$SCRIPT_DIR" 2>/dev/null | grep -v audit-hardcoded-params.sh | wc -l)
    echo "  Baseline Assumptions: $baseline_count"
    
    local random_count=$(grep -r --include="*.sh" --include="*.ts" -E "RANDOM" "$SCRIPT_DIR" 2>/dev/null | grep -v audit-hardcoded-params.sh | wc -l)
    echo "  Random Calculations: $random_count"
    
    local circuit_count=$(grep -r --include="*.sh" --include="*.ts" -E "CIRCUIT_BREAKER.*=.*[0-9]|DIVERGENCE_RATE.*=.*[0-9]" "$SCRIPT_DIR" 2>/dev/null | grep -v audit-hardcoded-params.sh | wc -l)
    echo "  Circuit Breaker Parameters: $circuit_count"
    
    echo -e "\n${YELLOW}Priority Wiring Candidates:${NC}"
    echo "  1. ${RED}ay-prod-cycle.sh lines 256, 260${NC} - Random rewards"
    echo "  2. ${RED}divergence-test.sh${NC} - Hardcoded thresholds (partially wired)"
    echo "  3. ${RED}ay-assess.sh${NC} - Threshold comparisons (partially wired)"
    echo "  4. ${YELLOW}Ceremony execution order${NC} - Could be dynamic based on context"
    echo "  5. ${YELLOW}Learning hyperparameters${NC} - Could adapt based on convergence"
    
    echo -e "\n${GREEN}Recommendations:${NC}"
    echo "  ✓ Wire ay-prod-cycle.sh to use ay-reward-calculator.sh"
    echo "  ✓ Parameterize ceremony execution order via AgentDB patterns"
    echo "  ✓ Make learning rates adaptive based on convergence metrics"
    echo "  ✓ Convert static sleep delays to dynamic based on system load"
    echo "  ✓ Use percentile-based thresholds from historical episode data"
}

# ═══════════════════════════════════════════════════════════════════════════
# Main Execution
# ═══════════════════════════════════════════════════════════════════════════

main() {
    local output_file="${1:-reports/hardcoded-params-audit.log}"
    
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║       HARDCODED PARAMETER AUDIT - MCP/MPP WIRING ANALYSIS     ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Scanning: $SCRIPT_DIR${NC}"
    echo -e "${BLUE}Output: $output_file${NC}"
    echo ""
    
    # Create reports directory if needed
    mkdir -p "$(dirname "$output_file")"
    
    {
        audit_error_thresholds
        audit_frequency_parameters
        audit_baseline_assumptions
        audit_random_calculations
        audit_order_dependencies
        audit_circuit_breaker_params
        audit_learning_params
        audit_percentile_params
        generate_summary
    } | tee "$output_file"
    
    echo -e "\n${GREEN}✓ Audit complete: $output_file${NC}"
}

# ═══════════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════════

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
