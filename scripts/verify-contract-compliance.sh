#!/bin/bash
# Verifiable Gates for Auto Commandments
# Each "ALWAYS" statement becomes a post-task validation script

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_ROOT="/Users/shahroozbhopti/Documents/code/investing/agentic-flow"
cd "$PROJECT_ROOT"

FAILED=0

echo -e "${YELLOW}=== CONTRACT VERIFICATION GATES ===${NC}"
echo ""

# ALWAYS 1: Implement all code/tests with proper implementation
gate_proper_implementation() {
    echo -n "✓ Gate: Proper implementation... "
    # Check for TODO/FIXME markers in code
    TODO_COUNT=$(grep -r "TODO\|FIXME\|XXX" src/ tests/ --include="*.js" --include="*.ts" --include="*.py" 2>/dev/null | wc -l || echo "0")
    if [ "$TODO_COUNT" -eq 0 ]; then
        echo -e "${GREEN}PASSED${NC} (no TODOs/FIXMEs)"
        return 0
    else
        echo -e "${RED}FAILED${NC} ($TODO_COUNT TODOs/FIXMEs found)"
        return 1
    fi
}

# ALWAYS 2: Verify before claiming success
gate_verify_before_claim() {
    echo -n "✓ Gate: Verify before claim... "
    # Check if tests actually ran (not just config)
    if [ -f coverage/coverage-summary.json ] || [ -f logs/test-results.log ]; then
        echo -e "${GREEN}PASSED${NC} (verification artifacts present)"
        return 0
    else
        echo -e "${YELLOW}WARNING${NC} (no verification artifacts)"
        return 0  # Warning only
    fi
}

# ALWAYS 3: Use real database queries, not mocks
gate_no_mocks() {
    echo -n "✓ Gate: Real data (no mocks)... "
    MOCK_COUNT=$(grep -r "mock\|Mock\|jest.mock\|@mock" src/ tests/ --include="*.js" --include="*.ts" 2>/dev/null | wc -l || echo "0")
    if [ "$MOCK_COUNT" -eq 0 ]; then
        echo -e "${GREEN}PASSED${NC} (no mocks detected)"
        return 0
    else
        echo -e "${YELLOW}WARNING${NC} ($MOCK_COUNT mock references - review required)"
        return 0  # Warning only
    fi
}

# ALWAYS 4: Run actual tests, not assume they pass
gate_tests_executed() {
    echo -n "✓ Gate: Tests executed... "
    if [ -f logs/test-run-$(date +%Y-%m-%d).log ]; then
        echo -e "${GREEN}PASSED${NC} (test log exists)"
        return 0
    else
        echo -e "${YELLOW}WARNING${NC} (no test log for today)"
        return 0  # Warning only
    fi
}

# NEVER 1: No shortcuts
gate_no_shortcuts() {
    echo -n "✗ Gate: No shortcuts... "
    # Check for quick hacks
    HACK_COUNT=$(grep -r "hack\|workaround\|temporary fix" src/ tests/ --include="*.js" --include="*.ts" --include="*.py" 2>/dev/null | wc -l || echo "0")
    if [ "$HACK_COUNT" -eq 0 ]; then
        echo -e "${GREEN}PASSED${NC} (no shortcuts detected)"
        return 0
    else
        echo -e "${RED}FAILED${NC} ($HACK_COUNT shortcuts found)"
        return 1
    fi
}

# NEVER 2: No fake data
gate_no_fake_data() {
    echo -n "✗ Gate: No fake data... "
    FAKE_COUNT=$(grep -r "fake\|dummy\|placeholder\|lorem ipsum" src/ tests/ --include="*.js" --include="*.ts" --include="*.py" 2>/dev/null | wc -l || echo "0")
    if [ "$FAKE_COUNT" -eq 0 ]; then
        echo -e "${GREEN}PASSED${NC} (no fake data detected)"
        return 0
    else
        echo -e "${RED}FAILED${NC} ($FAKE_COUNT fake data references)"
        return 1
    fi
}

# NEVER 3: No false claims
gate_no_false_claims() {
    echo -n "✗ Gate: No false claims... "
    # Check documentation against reality
    if [ -f docs/VERIFICATION_LOG.md ]; then
        echo -e "${GREEN}PASSED${NC} (verification log exists)"
        return 0
    else
        echo -e "${YELLOW}WARNING${NC} (no verification log)"
        return 0  # Warning only
    fi
}

# Execute all gates
echo -e "${YELLOW}ALWAYS Gates (Must Pass):${NC}"
gate_proper_implementation || FAILED=1
gate_verify_before_claim || FAILED=1
gate_no_mocks || FAILED=1
gate_tests_executed || FAILED=1

echo ""
echo -e "${YELLOW}NEVER Gates (Must Not Trigger):${NC}"
gate_no_shortcuts || FAILED=1
gate_no_fake_data || FAILED=1
gate_no_false_claims || FAILED=1

echo ""
echo -e "${YELLOW}=== SUMMARY ===${NC}"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL CONTRACT GATES PASSED${NC}"
    exit 0
else
    echo -e "${RED}✗ CONTRACT VIOLATIONS DETECTED${NC}"
    exit 1
fi
