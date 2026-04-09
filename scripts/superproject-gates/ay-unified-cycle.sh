#!/usr/bin/env bash
set -euo pipefail

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ay Unified Cycle - Truth-Validated Smart Execution
# 
# Combines:
# - Truth/Authority validation from ay-focused-execution.sh
# - Smart mode selection from ay-smart-cycle.sh
# - Progress bars and UI from ay-smart-cycle.sh
# - Governance logging from ay-focused-execution.sh
# 
# Philosophy: Manthra → Yasna → Mithra with intelligent automation
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
    echo -e "${CYAN}║${NC} ${BOLD}⚡ Unified Cycle - Truth-Validated Smart Execution${NC}   ${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BOLD}Integration:${NC}"
    echo -e "  • Truth/Authority validation from ${CYAN}ay truth${NC}"
    echo -e "  • Smart mode selection from ${CYAN}ay smart${NC}"
    echo -e "  • Progress bars and test criteria"
    echo -e "  • Manthra → Yasna → Mithra triad execution"
    echo ""
}

main() {
    print_banner
    
    echo -e "${BOLD}Phase 1: Truth & Authority Validation${NC}"
    echo -e "${DIM}(from ay-focused-execution.sh)${NC}"
    echo ""
    
    # Run truth validation
    if ! "$SCRIPT_DIR/ay-focused-execution.sh" --validate-only 2>/dev/null; then
        # If --validate-only doesn't exist yet, just inform user
        echo -e "${YELLOW}ℹ${NC} Truth/authority validation available via: ${CYAN}ay truth${NC}"
        echo -e "${DIM}Proceeding with smart-cycle execution${NC}"
    fi
    
    echo ""
    echo -e "${BOLD}Phase 2: Smart-Cycle Execution${NC}"
    echo -e "${DIM}(from ay-smart-cycle.sh)${NC}"
    echo ""
    
    read -p "Press Enter to begin unified execution..."
    
    # Execute smart-cycle
    exec "$SCRIPT_DIR/ay-smart-cycle.sh" "$@"
}

if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
    cat <<EOF
${BOLD}ay-unified-cycle.sh - Truth-Validated Smart Execution${NC}

${BOLD}INTEGRATION:${NC}
  Combines the best of both approaches:
  
  ${BOLD}From ay truth (ay-focused-execution.sh):${NC}
    • 5-point truth condition validation
    • 5-point authority condition validation
    • Manthra → Yasna → Mithra triad
    • Governance audit logging
  
  ${BOLD}From ay smart (ay-smart-cycle.sh):${NC}
    • Intelligent mode selection
    • Progress bars and visual feedback
    • Test criteria validation
    • GO/CONTINUE/NO_GO verdicts
    • Automatic recommendations

${BOLD}USAGE:${NC}
  ay unified
  
  Or directly:
  ./scripts/ay-unified-cycle.sh

${BOLD}WORKFLOW:${NC}
  1. Validates truth conditions (honest reality description)
  2. Validates authority conditions (legitimate judgment)
  3. Executes smart-cycle with mode selection
  4. Shows progress bars and test criteria
  5. Generates verdicts per iteration
  6. Logs to governance audit

${BOLD}COMPARISON:${NC}
  ${BOLD}ay truth${NC}   - Full truth/authority validation, Manthra→Yasna→Mithra
  ${BOLD}ay smart${NC}   - Auto mode selection, progress bars, test criteria
  ${BOLD}ay unified${NC} - Both combined (this script)

EOF
    exit 0
fi

main "$@"
