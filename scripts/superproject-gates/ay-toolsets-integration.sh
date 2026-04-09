#!/usr/bin/env bash
set -euo pipefail

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AY Toolsets Integration Wrapper
# Integrates AISP, agentic-qe, claude-flow, and llm-observatory
# into ay runs with comprehensive metrics tracking
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

print_header() {
    echo -e "${BOLD}${CYAN}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  AY Toolsets Integration"
    echo "  AISP | agentic-qe | claude-flow | llm-observatory"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${NC}"
}

check_dependencies() {
    echo -e "${BOLD}Checking dependencies...${NC}"
    
    local missing=0
    
    # Check npm/node
    if ! command -v npm >/dev/null 2>&1; then
        echo -e "  ${YELLOW}⚠${NC}  npm not found"
        missing=1
    else
        echo -e "  ${GREEN}✓${NC}  npm available"
    fi
    
    # Check agentic-qe
    if ! command -v npx >/dev/null 2>&1 || ! npx agentic-qe --version >/dev/null 2>&1; then
        echo -e "  ${YELLOW}⚠${NC}  agentic-qe not found"
        echo -e "     Install: ${CYAN}npx install -g agentic-qe@latest${NC}"
        missing=1
    else
        echo -e "  ${GREEN}✓${NC}  agentic-qe available"
    fi
    
    # Check claude-flow
    if ! command -v npx >/dev/null 2>&1 || ! npx claude-flow@v3alpha --version >/dev/null 2>&1; then
        echo -e "  ${YELLOW}⚠${NC}  claude-flow not found"
        echo -e "     Install: ${CYAN}npm install claude-flow@v3alpha${NC}"
        missing=1
    else
        echo -e "  ${GREEN}✓${NC}  claude-flow available"
    fi
    
    # Check llm-observatory (optional)
    if [ -d "$PROJECT_ROOT/node_modules/@llm-observatory" ]; then
        echo -e "  ${GREEN}✓${NC}  @llm-observatory/sdk installed"
    else
        echo -e "  ${YELLOW}⚠${NC}  @llm-observatory/sdk not installed (optional)"
        echo -e "     Install: ${CYAN}npm install @llm-observatory/sdk${NC}"
    fi
    
    if [ $missing -eq 1 ]; then
        echo ""
        echo -e "${YELLOW}Some dependencies are missing. Install them for full functionality.${NC}"
        echo ""
    fi
}

run_toolsets() {
    local run_id="${1:-run_$(date +%s)}"
    
    print_header
    check_dependencies
    
    echo ""
    echo -e "${BOLD}Running toolsets orchestrator...${NC}"
    echo ""
    
    cd "$PROJECT_ROOT"
    
    # Run the orchestrator
    if npm run toolsets:run "$run_id"; then
        echo ""
        echo -e "${GREEN}✓${NC} Toolsets integration completed successfully"
        
        # Show report if available
        local report_file="$PROJECT_ROOT/toolsets-report-${run_id}.md"
        if [ -f "$report_file" ]; then
            echo ""
            echo -e "${BOLD}Report generated:${NC} $report_file"
            echo ""
            head -30 "$report_file"
        fi
        
        return 0
    else
        echo ""
        echo -e "${YELLOW}⚠${NC}  Toolsets integration completed with issues"
        echo "   Review the output above for details"
        return 1
    fi
}

# Main execution
COMMAND="${1:-run}"

case "$COMMAND" in
    run|r)
        run_toolsets "${2:-}"
        ;;
    
    check|c)
        print_header
        check_dependencies
        ;;
    
    install|i)
        echo -e "${BOLD}Installing toolsets dependencies...${NC}"
        echo ""
        
        echo "Installing agentic-qe..."
        npx install -g agentic-qe@latest || echo "Failed to install agentic-qe globally"
        
        echo ""
        echo "Installing claude-flow..."
        cd "$PROJECT_ROOT" && npm install claude-flow@v3alpha || echo "Failed to install claude-flow"
        
        echo ""
        echo "Installing @llm-observatory/sdk..."
        cd "$PROJECT_ROOT" && npm install @llm-observatory/sdk || echo "Failed to install llm-observatory"
        
        echo ""
        echo "Initializing claude-flow..."
        cd "$PROJECT_ROOT" && npm run cf:init || echo "Failed to initialize claude-flow"
        
        echo ""
        echo -e "${GREEN}✓${NC} Installation complete"
        ;;
    
    help|h|--help|-h)
        cat << EOF
AY Toolsets Integration

Usage: ay-toolsets-integration.sh [command] [options]

Commands:
  run, r [run_id]    Run toolsets orchestrator (default)
  check, c           Check dependency availability
  install, i         Install all toolsets dependencies
  help, h            Show this help

Examples:
  ./scripts/ay-toolsets-integration.sh run
  ./scripts/ay-toolsets-integration.sh run my-test-run
  ./scripts/ay-toolsets-integration.sh check
  ./scripts/ay-toolsets-integration.sh install

Integration:
  The toolsets orchestrator integrates:
  - AISP (AI Symbolic Protocol) for formal verification
  - agentic-qe for comprehensive quality assurance
  - claude-flow for agent coordination
  - llm-observatory for observability

  It automatically runs as part of 'ay' cycles in assess, improve, and monitor modes.

EOF
        ;;
    
    *)
        echo "Unknown command: $COMMAND"
        echo "Use 'ay-toolsets-integration.sh help' for usage"
        exit 1
        ;;
esac
