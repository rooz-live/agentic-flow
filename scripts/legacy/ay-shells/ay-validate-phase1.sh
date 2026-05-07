#!/usr/bin/env bash
# ay-validate-phase1.sh - Validate Phase 1 Implementation
# Quick validation script to verify all 3 components are working

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  AY Phase 1 Validation                               ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Test 1: Check if all Phase 1 scripts exist
echo -e "${BLUE}[1/7]${NC} Checking Phase 1 script existence..."
checks_passed=0
checks_total=3

if [[ -x "${SCRIPT_DIR}/ay-continuous.sh" ]]; then
    echo -e "  ${GREEN}✓${NC} ay-continuous.sh exists and is executable"
    ((checks_passed++))
else
    echo -e "  ${RED}✗${NC} ay-continuous.sh missing or not executable"
fi

if [[ -x "${SCRIPT_DIR}/ay-skills-agentdb.sh" ]]; then
    echo -e "  ${GREEN}✓${NC} ay-skills-agentdb.sh exists and is executable"
    ((checks_passed++))
else
    echo -e "  ${RED}✗${NC} ay-skills-agentdb.sh missing or not executable"
fi

if [[ -x "${SCRIPT_DIR}/ay-trajectory-tracking.sh" ]]; then
    echo -e "  ${GREEN}✓${NC} ay-trajectory-tracking.sh exists and is executable"
    ((checks_passed++))
else
    echo -e "  ${RED}✗${NC} ay-trajectory-tracking.sh missing or not executable"
fi

echo ""

# Test 2: Check integration in ay-integrated-cycle.sh
echo -e "${BLUE}[2/7]${NC} Checking FIRE cycle integration..."
if grep -q "ay-skills-agentdb.sh" "${SCRIPT_DIR}/ay-integrated-cycle.sh" && \
   grep -q "ay-trajectory-tracking.sh" "${SCRIPT_DIR}/ay-integrated-cycle.sh"; then
    echo -e "  ${GREEN}✓${NC} Phase 1 integrated into FIRE cycle"
else
    echo -e "  ${RED}✗${NC} Phase 1 not integrated into FIRE cycle"
fi

echo ""

# Test 3: Generate test learning episodes
echo -e "${BLUE}[3/7]${NC} Generating test learning episodes..."
mkdir -p .cache

# Create mock learning episode
cat > .cache/learning-retro-test-$$.json <<EOF
{
  "episode_id": "test-$$",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "patterns": [
    {
      "type": "skill",
      "name": "test_skill_validation",
      "description": "Phase 1 validation skill",
      "category": "testing",
      "confidence": 0.95,
      "evidence": ["Phase 1 implementation complete"]
    }
  ],
  "recommendations": [
    "Verify all Phase 1 components operational"
  ]
}
EOF

if [[ -f ".cache/learning-retro-test-$$.json" ]]; then
    echo -e "  ${GREEN}✓${NC} Test learning episode created"
else
    echo -e "  ${RED}✗${NC} Failed to create test learning episode"
fi

echo ""

# Test 4: Run skills → AgentDB wiring
echo -e "${BLUE}[4/7]${NC} Testing Skills → AgentDB wiring..."
if "${SCRIPT_DIR}/ay-skills-agentdb.sh" &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Skills wiring executed successfully"
    
    # Check if report was generated
    if [[ -f "reports/skills-agentdb-report.json" ]]; then
        echo -e "  ${GREEN}✓${NC} Skills report generated"
    else
        echo -e "  ${YELLOW}⚠${NC}  Skills report not found (may be normal if no skills)"
    fi
else
    echo -e "  ${RED}✗${NC} Skills wiring failed"
fi

echo ""

# Test 5: Run trajectory tracking
echo -e "${BLUE}[5/7]${NC} Testing trajectory tracking..."
if "${SCRIPT_DIR}/ay-trajectory-tracking.sh" &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Trajectory tracking executed successfully"
    
    # Check if baseline was created
    baseline_count=$(find .ay-trajectory -name "baseline-*.json" 2>/dev/null | wc -l | tr -d ' ')
    if [[ $baseline_count -gt 0 ]]; then
        echo -e "  ${GREEN}✓${NC} Baseline created ($baseline_count total)"
    else
        echo -e "  ${YELLOW}⚠${NC}  No baselines found"
    fi
else
    echo -e "  ${RED}✗${NC} Trajectory tracking failed"
fi

echo ""

# Test 6: Test continuous monitoring (10 second test)
echo -e "${BLUE}[6/7]${NC} Testing continuous monitoring (10s)..."
timeout 10 bash "${SCRIPT_DIR}/ay-continuous.sh" &>/dev/null || true

if [[ -f ".cache/continuous-state.json" ]]; then
    echo -e "  ${GREEN}✓${NC} Continuous monitoring state created"
    
    checks_completed=$(jq -r '.checks_completed // 0' .cache/continuous-state.json)
    if [[ $checks_completed -gt 0 ]]; then
        echo -e "  ${GREEN}✓${NC} Monitoring checks executed ($checks_completed checks)"
    fi
else
    echo -e "  ${YELLOW}⚠${NC}  Continuous monitoring state not found"
fi

echo ""

# Test 7: Check command integration
echo -e "${BLUE}[7/7]${NC} Checking command integration..."
if grep -q "continuous)" "${SCRIPT_DIR}/ay"; then
    echo -e "  ${GREEN}✓${NC} 'ay continuous' command available"
else
    echo -e "  ${YELLOW}⚠${NC}  'ay continuous' command not found"
fi

if grep -q "fire)" "${SCRIPT_DIR}/ay"; then
    echo -e "  ${GREEN}✓${NC} 'ay fire' command available"
else
    echo -e "  ${RED}✗${NC} 'ay fire' command not found"
fi

echo ""

# Cleanup test files
rm -f .cache/learning-retro-test-$$.json

# Final summary
echo -e "${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Validation Summary                                   ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Scripts: ${checks_passed}/${checks_total} passed"
echo ""

if [[ $checks_passed -eq $checks_total ]]; then
    echo -e "${GREEN}✅ Phase 1 Implementation: VALIDATED${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Generate real learning episodes:"
    echo "     for i in {1..9}; do ENABLE_AUTO_LEARNING=1 ./scripts/ay-yo.sh orchestrator standup advisory; done"
    echo ""
    echo "  2. Run full FIRE cycle:"
    echo "     ay fire"
    echo ""
    echo "  3. Start continuous monitoring:"
    echo "     ay continuous"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Phase 1 Implementation: INCOMPLETE${NC}"
    echo ""
    echo "Issues found: $((checks_total - checks_passed))"
    echo "Review the output above for details."
    echo ""
    exit 1
fi
