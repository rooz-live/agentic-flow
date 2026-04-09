#!/usr/bin/env bash
set -euo pipefail

# ay-yo Integration Script
# Unified interface for ay-prod DoR/DoD cycles + yo.life dimensional analysis

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# ==========================================
# Initialize System
# ==========================================
init_system() {
    print_header "🚀 ay-yo Integration - System Initialization"
    
    echo "Initializing agentic-flow continuous improvement system..."
    echo ""
    
    # Check dependencies
    echo "▶ 1/5: Checking dependencies..."
    
    local deps_ok=true
    
    if ! command -v jq &>/dev/null; then
        echo -e "  ${RED}✗${NC} jq not found - install with: brew install jq"
        deps_ok=false
    else
        echo -e "  ${GREEN}✓${NC} jq installed"
    fi
    
    if ! command -v sqlite3 &>/dev/null; then
        echo -e "  ${RED}✗${NC} sqlite3 not found"
        deps_ok=false
    else
        echo -e "  ${GREEN}✓${NC} sqlite3 installed"
    fi
    
    if ! command -v npx &>/dev/null; then
        echo -e "  ${YELLOW}⚠${NC} npx not found - some features unavailable"
    else
        echo -e "  ${GREEN}✓${NC} npx installed"
    fi
    
    if [ "$deps_ok" = false ]; then
        echo ""
        echo -e "${RED}❌ Missing required dependencies${NC}"
        exit 1
    fi
    
    # Check configuration
    echo ""
    echo "▶ 2/5: Checking configuration..."
    
    if [ ! -f "$PROJECT_ROOT/config/dor-budgets.json" ]; then
        echo -e "  ${RED}✗${NC} config/dor-budgets.json not found"
        exit 1
    else
        echo -e "  ${GREEN}✓${NC} DoR budgets configuration found"
    fi
    
    # Initialize AgentDB if needed
    echo ""
    echo "▶ 3/5: Initializing AgentDB..."
    
    if [ ! -f "$PROJECT_ROOT/agentdb.db" ]; then
        echo "  Creating agentdb.db..."
        if command -v npx &>/dev/null; then
            npx agentdb init --preset production 2>/dev/null || echo "  ⚠️  agentdb init failed - will create manually"
        fi
    else
        echo -e "  ${GREEN}✓${NC} AgentDB exists"
    fi
    
    # Verify scripts are executable
    echo ""
    echo "▶ 4/5: Verifying scripts..."
    
    local scripts=(
        "ay-prod-dor-lookup.sh"
        "ay-prod-cycle.sh"
        "ay-yo-enhanced.sh"
        "ay-continuous-improve.sh"
        "validate-dor-dod.sh"
    )
    
    for script in "${scripts[@]}"; do
        if [ -f "$SCRIPT_DIR/$script" ]; then
            chmod +x "$SCRIPT_DIR/$script" 2>/dev/null || true
            echo -e "  ${GREEN}✓${NC} $script"
        else
            echo -e "  ${YELLOW}⚠${NC} $script not found"
        fi
    done
    
    # Create necessary directories
    echo ""
    echo "▶ 5/5: Creating directories..."
    
    mkdir -p "$PROJECT_ROOT/.db" 2>/dev/null || true
    mkdir -p "$PROJECT_ROOT/.goalie" 2>/dev/null || true
    mkdir -p "/tmp/ay-episodes" 2>/dev/null || true
    
    echo -e "  ${GREEN}✓${NC} Directories created"
    
    echo ""
    echo -e "${GREEN}✅ System initialized successfully${NC}"
    echo ""
    echo "Next steps:"
    echo "  • Run: $0 exec orchestrator standup advisory"
    echo "  • View: $0 dashboard"
    echo "  • Monitor: $0 continuous"
    echo ""
}

# ==========================================
# Execute Single Ceremony
# ==========================================
exec_ceremony() {
    local circle="${1:-orchestrator}"
    local ceremony="${2:-standup}"
    local mode="${3:-advisory}"
    
    print_header "🎯 Execute Ceremony: ${circle}/${ceremony}"
    
    # Step 1: DoR Budget Lookup
    echo "▶ 1/4: DoR Budget Lookup"
    echo ""
    
    if [ -f "$SCRIPT_DIR/ay-prod-dor-lookup.sh" ]; then
        "$SCRIPT_DIR/ay-prod-dor-lookup.sh" "$circle" "$ceremony"
    else
        echo -e "${YELLOW}⚠ DoR lookup script not found${NC}"
    fi
    
    # Step 2: Execute with DoR/DoD validation
    echo ""
    echo "▶ 2/4: Execute Time-Boxed Ceremony"
    echo ""
    
    if [ -f "$SCRIPT_DIR/ay-prod-cycle.sh" ]; then
        "$SCRIPT_DIR/ay-prod-cycle.sh" "$circle" "$ceremony" "$mode"
    else
        echo -e "${RED}✗ ay-prod-cycle.sh not found${NC}"
        exit 1
    fi
    
    # Step 3: yo.life dimensional analysis
    echo ""
    echo "▶ 3/4: yo.life Dimensional Analysis"
    echo ""
    
    # Map ceremony to yo.life dimension
    local dimension="temporal"
    case "$ceremony" in
        standup) dimension="temporal" ;;
        wsjf) dimension="goal" ;;
        review) dimension="event" ;;
        retro) dimension="barrier" ;;
        refine) dimension="mindset" ;;
        replenish) dimension="cockpit" ;;
        synthesis) dimension="psychological" ;;
    esac
    
    echo "  Ceremony: $ceremony"
    echo "  Dimension: $dimension"
    echo "  Integration: ay-prod ↔ yo.life"
    
    # Step 4: Dashboard update
    echo ""
    echo "▶ 4/4: Updated Dashboard"
    echo ""
    
    if [ -f "$SCRIPT_DIR/ay-yo-enhanced.sh" ]; then
        "$SCRIPT_DIR/ay-yo-enhanced.sh" dashboard
    fi
    
    echo ""
    echo -e "${GREEN}✅ Ceremony execution complete${NC}"
}

# ==========================================
# Dashboard View
# ==========================================
show_dashboard() {
    if [ -f "$SCRIPT_DIR/ay-yo-enhanced.sh" ]; then
        "$SCRIPT_DIR/ay-yo-enhanced.sh" dashboard
    else
        echo -e "${RED}✗ ay-yo-enhanced.sh not found${NC}"
        exit 1
    fi
}

# ==========================================
# Continuous Improvement Mode
# ==========================================
continuous_mode() {
    if [ -f "$SCRIPT_DIR/ay-continuous-improve.sh" ]; then
        "$SCRIPT_DIR/ay-continuous-improve.sh" continuous
    else
        echo -e "${RED}✗ ay-continuous-improve.sh not found${NC}"
        exit 1
    fi
}

# ==========================================
# Run All Circles (One Cycle Each)
# ==========================================
run_all_circles() {
    print_header "🔄 Running All Circles - One Cycle Each"
    
    local circles=("orchestrator:standup" "assessor:wsjf" "analyst:refine" "innovator:retro" "seeker:replenish" "intuitive:synthesis")
    
    for entry in "${circles[@]}"; do
        IFS=':' read -r circle ceremony <<< "$entry"
        
        echo ""
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}Circle: $circle | Ceremony: $ceremony${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        
        if [ -f "$SCRIPT_DIR/ay-prod-cycle.sh" ]; then
            "$SCRIPT_DIR/ay-prod-cycle.sh" "$circle" "$ceremony" advisory 2>&1 | \
                grep -E "✅|Episode|DoR|DoD|Learning" | head -5 || true
        fi
        
        echo ""
        echo -e "${GREEN}✓${NC} $circle/$ceremony complete"
        
        # Brief pause between circles
        sleep 2
    done
    
    echo ""
    echo -e "${GREEN}✅ All circles executed${NC}"
    echo ""
    echo "View results: $0 dashboard"
}

# ==========================================
# Quick Test
# ==========================================
quick_test() {
    print_header "🧪 Quick Test - Single Ceremony"
    
    echo "Running orchestrator/standup (5-minute budget)..."
    echo ""
    
    exec_ceremony "orchestrator" "standup" "advisory"
}

# ==========================================
# Main Command Router
# ==========================================
COMMAND="${1:-help}"

case "$COMMAND" in
    init|i)
        init_system
        ;;
        
    exec|e)
        shift
        exec_ceremony "$@"
        ;;
        
    dashboard|d)
        show_dashboard
        ;;
        
    continuous|c)
        continuous_mode
        ;;
        
    all|a)
        run_all_circles
        ;;
        
    test|t)
        quick_test
        ;;
        
    help|h)
        print_header "ay-yo Integration - Help"
        echo ""
        echo "Usage: $0 <command> [options]"
        echo ""
        echo "Commands:"
        echo "  init (i)                     Initialize system"
        echo "  exec (e) <circle> <ceremony> Execute single ceremony"
        echo "  dashboard (d)                Show dashboard"
        echo "  continuous (c)               Start continuous improvement"
        echo "  all (a)                      Run all circles once"
        echo "  test (t)                     Quick test (orchestrator/standup)"
        echo "  help (h)                     Show this help"
        echo ""
        echo "Circle/Ceremony Mappings:"
        echo "  orchestrator → standup    (5 min budget)"
        echo "  assessor     → wsjf       (15 min budget)"
        echo "  analyst      → refine     (30 min budget)"
        echo "  innovator    → retro      (10 min budget)"
        echo "  seeker       → replenish  (20 min budget)"
        echo "  intuitive    → synthesis  (25 min budget)"
        echo ""
        echo "Examples:"
        echo "  $0 init                                    # One-time setup"
        echo "  $0 exec orchestrator standup advisory     # Single ceremony"
        echo "  $0 dashboard                               # View metrics"
        echo "  $0 continuous                              # Auto-improve loop"
        echo "  $0 all                                     # Run all circles"
        echo ""
        echo "Quick Start:"
        echo "  $0 init && $0 exec orchestrator standup advisory && $0 dashboard"
        echo ""
        ;;
        
    *)
        echo -e "${RED}Unknown command: $COMMAND${NC}"
        echo "Run: $0 help"
        exit 1
        ;;
esac
