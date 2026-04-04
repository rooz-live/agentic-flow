#!/usr/bin/env bash
set -euo pipefail

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# P0 Validation - Skill Persistence Test
# Two-run test to prove skills persist across runs
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Run 1: Setup and export skills
run1() {
    print_header "P0 Validation - Run 1: Setup Skills"
    
    echo "→ Running toolsets orchestrator with run1..."
    cd "$PROJECT_ROOT"
    
    if npm run toolsets:run "run1" 2>&1 | tee /tmp/p0-run1.log; then
        echo -e "${GREEN}✓${NC} Run 1 completed"
        
        # Check for skills export
        if [ -f "$PROJECT_ROOT/skills-run1-export.json" ] || [ -f "$PROJECT_ROOT/.goalie/skills-export.json" ]; then
            echo -e "${GREEN}✓${NC} Skills exported to JSON"
            SKILLS_FILE=$(ls "$PROJECT_ROOT"/skills-run1-export.json "$PROJECT_ROOT/.goalie/skills-export.json" 2>/dev/null | head -1)
            SKILL_COUNT=$(jq '.skills | length' "$SKILLS_FILE" 2>/dev/null || echo "0")
            echo -e "${CYAN}→${NC} Run 1: ${SKILL_COUNT} skills stored in agentdb + exported to JSON"
        else
            echo -e "${YELLOW}⚠${NC} Skills export file not found"
        fi
    else
        echo -e "${RED}✗${NC} Run 1 failed"
        return 1
    fi
}

# Run 2: Load and validate skills
run2() {
    print_header "P0 Validation - Run 2: Load and Validate Skills"
    
    echo "→ Running toolsets orchestrator with run2..."
    cd "$PROJECT_ROOT"
    
    if npm run toolsets:run "run2" 2>&1 | tee /tmp/p0-run2.log; then
        echo -e "${GREEN}✓${NC} Run 2 completed"
        
        # Check logs for skill loading
        if grep -q "Skills loaded" /tmp/p0-run2.log; then
            echo -e "${GREEN}✓${NC} Skills loaded at iteration start"
        else
            echo -e "${YELLOW}⚠${NC} Skills loading not confirmed in logs"
        fi
        
        # Check for dynamic mode scores
        if grep -q "mode scores are dynamic" /tmp/p0-run2.log; then
            echo -e "${GREEN}✓${NC} Mode scores reflect skill confidence (not hardcoded)"
        else
            echo -e "${YELLOW}⚠${NC} Mode scores may be hardcoded"
        fi
    else
        echo -e "${RED}✗${NC} Run 2 failed"
        return 1
    fi
}

# Compare runs
compare() {
    print_header "P0 Validation - Comparison"
    
    RUN1_SKILLS=$(jq '.skills | length' "$PROJECT_ROOT"/skills-run1-export.json 2>/dev/null || echo "0")
    RUN2_SKILLS=$(grep -oP 'Run 2: Skills loaded \(\K[0-9]+' /tmp/p0-run2.log 2>/dev/null || echo "0")
    
    if [ "$RUN1_SKILLS" -gt 0 ] && [ "$RUN2_SKILLS" -gt 0 ]; then
        PERSISTENCE_RATE=$((RUN2_SKILLS * 100 / RUN1_SKILLS))
        echo "Run 1 Skills: $RUN1_SKILLS"
        echo "Run 2 Skills: $RUN2_SKILLS"
        echo "Persistence Rate: ${PERSISTENCE_RATE}%"
        
        if [ "$PERSISTENCE_RATE" -ge 90 ]; then
            echo -e "${GREEN}✓${NC} P0 Validation PASSED: Skills persist across runs"
            return 0
        else
            echo -e "${YELLOW}⚠${NC} P0 Validation PARTIAL: Some skills may not have persisted"
            return 1
        fi
    else
        echo -e "${RED}✗${NC} P0 Validation FAILED: Cannot compare runs"
        return 1
    fi
}

# Main execution
COMMAND="${1:-all}"

case "$COMMAND" in
    run1|1)
        run1
        ;;
    run2|2)
        run2
        ;;
    compare|c)
        compare
        ;;
    all|a)
        run1 && run2 && compare
        ;;
    *)
        echo "Usage: $0 [run1|run2|compare|all]"
        exit 1
        ;;
esac
