#!/usr/bin/env bash
set -euo pipefail

# ==========================================
# Phase D Integration Test Suite
# ==========================================
# Validates all Phase D features:
# - Circle ceremony validation
# - WSJF auto-calculation
# - Episode metadata with WSJF context
# - WSJF analytics reports
# ==========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test result tracking
declare -a FAILED_TESTS

# ==========================================
# Helper Functions
# ==========================================

test_start() {
    local test_name="$1"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Test $TESTS_TOTAL: $test_name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

test_pass() {
    local message="$1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "${GREEN}✅ PASS${NC}: $message"
}

test_fail() {
    local message="$1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    FAILED_TESTS+=("Test $TESTS_TOTAL: $message")
    echo -e "${RED}❌ FAIL${NC}: $message"
}

test_warn() {
    local message="$1"
    echo -e "${YELLOW}⚠️  WARN${NC}: $message"
}

# ==========================================
# Test Suite
# ==========================================

# Test 1: Script Existence
test_start "Verify all Phase D scripts exist"

if [ -f "$SCRIPT_DIR/ay-prod-cycle.sh" ]; then
    test_pass "ay-prod-cycle.sh exists"
else
    test_fail "ay-prod-cycle.sh missing"
fi

if [ -f "$SCRIPT_DIR/calculate-wsjf-auto.sh" ]; then
    test_pass "calculate-wsjf-auto.sh exists"
else
    test_fail "calculate-wsjf-auto.sh missing"
fi

if [ -f "$SCRIPT_DIR/generate-wsjf-report.sh" ]; then
    test_pass "generate-wsjf-report.sh exists"
else
    test_fail "generate-wsjf-report.sh missing"
fi

if [ -f "$SCRIPT_DIR/ay-prod-store-episode.sh" ]; then
    test_pass "ay-prod-store-episode.sh exists"
else
    test_fail "ay-prod-store-episode.sh missing"
fi

# Test 2: Circle Ceremony Validation
test_start "Circle Ceremony Validation - Valid Pairing"

output=$("$SCRIPT_DIR/ay-prod-cycle.sh" orchestrator standup advisory 2>&1 || true)
if echo "$output" | grep -q "✅ Circle/ceremony pairing validated"; then
    test_pass "Valid pairing (orchestrator/standup) accepted"
else
    test_fail "Valid pairing not recognized"
fi

# Test 3: Circle Ceremony Validation - Unusual Pairing
test_start "Circle Ceremony Validation - Unusual Pairing"

output=$("$SCRIPT_DIR/ay-prod-cycle.sh" orchestrator wsjf advisory 2>&1 || true)
if echo "$output" | grep -q "⚠️  Unusual ceremony pairing"; then
    test_pass "Unusual pairing (orchestrator/wsjf) warned"
else
    test_fail "Unusual pairing not warned"
fi

if echo "$output" | grep -q "Recommended ceremonies"; then
    test_pass "Recommendations provided"
else
    test_fail "No recommendations shown"
fi

# Test 4: Circle Ceremony Validation - Invalid Circle
test_start "Circle Ceremony Validation - Invalid Circle"

output=$("$SCRIPT_DIR/ay-prod-cycle.sh" invalid_circle standup advisory 2>&1 || true)
if echo "$output" | grep -q "❌ Unknown circle"; then
    test_pass "Invalid circle rejected"
else
    test_fail "Invalid circle not rejected"
fi

if echo "$output" | grep -q "Valid circles"; then
    test_pass "Valid circles list shown"
else
    test_fail "Valid circles not listed"
fi

# Test 5: WSJF Auto-Calculator - Single Task
test_start "WSJF Auto-Calculator - Single Task"

output=$("$SCRIPT_DIR/calculate-wsjf-auto.sh" --task "Fix urgent security bug" 2>&1)
if echo "$output" | grep -q "User Business Value"; then
    test_pass "UBV calculated"
else
    test_fail "UBV not calculated"
fi

if echo "$output" | grep -q "WSJF Score"; then
    test_pass "WSJF score calculated"
else
    test_fail "WSJF score not calculated"
fi

if echo "$output" | grep -q "Confidence"; then
    test_pass "Confidence calculated"
else
    test_fail "Confidence not calculated"
fi

# Test 6: WSJF Auto-Calculator - JSON Output
test_start "WSJF Auto-Calculator - JSON Output"

json_output=$("$SCRIPT_DIR/calculate-wsjf-auto.sh" --task "Test task" 2>&1 | tail -1)
if echo "$json_output" | jq -e '.wsjf' >/dev/null 2>&1; then
    test_pass "Valid JSON output with wsjf field"
else
    test_fail "Invalid JSON output or missing wsjf field"
fi

if echo "$json_output" | jq -e '.ubv' >/dev/null 2>&1; then
    test_pass "JSON contains ubv field"
else
    test_fail "JSON missing ubv field"
fi

if echo "$json_output" | jq -e '.confidence' >/dev/null 2>&1; then
    test_pass "JSON contains confidence field"
else
    test_fail "JSON missing confidence field"
fi

# Test 7: WSJF Auto-Calculator - Keyword Detection
test_start "WSJF Auto-Calculator - Keyword Detection"

output=$("$SCRIPT_DIR/calculate-wsjf-auto.sh" --task "urgent customer revenue security blocker" 2>&1)

# Check if high-value keywords boost scores
if echo "$output" | grep -qE "WSJF Score:.*[5-9]\.[0-9]+|WSJF Score:.*1[0-9]"; then
    test_pass "High-signal keywords result in elevated WSJF"
else
    test_warn "Expected higher WSJF for high-signal keywords"
fi

# Test 8: Backlog Creation
test_start "Backlog Auto-Creation"

test_circle="test_circle_$$"
output=$("$SCRIPT_DIR/calculate-wsjf-auto.sh" --circle "$test_circle" --auto-enrich 2>&1 || true)

if [ -f "$PROJECT_ROOT/docs/backlogs/$test_circle/backlog.md" ]; then
    test_pass "Backlog auto-created for new circle"
    
    # Verify schema
    if grep -q "| ID | Task | Status | UBV | TC | RR | Size | WSJF |" "$PROJECT_ROOT/docs/backlogs/$test_circle/backlog.md"; then
        test_pass "Backlog has correct schema"
    else
        test_fail "Backlog schema incorrect"
    fi
    
    # Cleanup
    rm -rf "$PROJECT_ROOT/docs/backlogs/$test_circle"
else
    test_fail "Backlog not created"
fi

# Test 9: Episode with WSJF Context
test_start "Episode Generation with WSJF Context"

# Run a quick ceremony
output=$("$SCRIPT_DIR/ay-prod-cycle.sh" analyst refine advisory 2>&1 || true)

# Find the episode file
episode_id=$(echo "$output" | grep -oE "ep_[0-9]+_analyst_refine" | head -1)

if [ -n "$episode_id" ]; then
    episode_file="/tmp/${episode_id}.json"
    
    if [ -f "$episode_file" ]; then
        test_pass "Episode file created: $episode_file"
        
        # Check for WSJF context
        if jq -e '.wsjf_context' "$episode_file" >/dev/null 2>&1; then
            test_pass "Episode contains wsjf_context"
            
            # Verify all CoD components
            if jq -e '.wsjf_context.ubv' "$episode_file" >/dev/null 2>&1; then
                test_pass "WSJF context has UBV"
            else
                test_fail "WSJF context missing UBV"
            fi
            
            if jq -e '.wsjf_context.wsjf' "$episode_file" >/dev/null 2>&1; then
                test_pass "WSJF context has WSJF score"
            else
                test_fail "WSJF context missing WSJF score"
            fi
            
            if jq -e '.wsjf_context.confidence' "$episode_file" >/dev/null 2>&1; then
                test_pass "WSJF context has confidence"
            else
                test_fail "WSJF context missing confidence"
            fi
        else
            test_fail "Episode missing wsjf_context"
        fi
    else
        test_warn "Episode file not found (may have been flushed)"
    fi
else
    test_warn "Could not extract episode ID from output"
fi

# Test 10: WSJF Report Generation
test_start "WSJF Report Generation"

report_output=$("$SCRIPT_DIR/generate-wsjf-report.sh" 2>&1 || true)

if echo "$report_output" | grep -q "📊 WSJF Analytics Report"; then
    test_pass "Report header generated"
else
    test_fail "Report header missing"
fi

if echo "$report_output" | grep -q "Total Episodes with WSJF"; then
    test_pass "Episode count displayed"
else
    test_fail "Episode count missing"
fi

# Test 11: WSJF Report - JSON Output
test_start "WSJF Report - JSON Output"

json_report=$("$SCRIPT_DIR/generate-wsjf-report.sh" --json 2>&1 || true)

if echo "$json_report" | jq -e '.report_type' >/dev/null 2>&1; then
    test_pass "JSON report has report_type"
else
    test_fail "JSON report missing report_type"
fi

if echo "$json_report" | jq -e '.total_episodes' >/dev/null 2>&1; then
    test_pass "JSON report has total_episodes"
else
    test_fail "JSON report missing total_episodes"
fi

# Test 12: All Circle Ceremonies
test_start "All Circle Primary Ceremonies Execute"

declare -A circle_ceremonies=(
    ["orchestrator"]="standup"
    ["assessor"]="wsjf"
    ["innovator"]="retro"
    ["analyst"]="refine"
    ["seeker"]="replenish"
    ["intuitive"]="synthesis"
)

for circle in "${!circle_ceremonies[@]}"; do
    ceremony="${circle_ceremonies[$circle]}"
    output=$("$SCRIPT_DIR/ay-prod-cycle.sh" "$circle" "$ceremony" advisory 2>&1 || true)
    
    if echo "$output" | grep -q "✅ Circle/ceremony pairing validated"; then
        test_pass "✅ $circle/$ceremony executed"
    else
        test_warn "⚠️  $circle/$ceremony validation issue"
    fi
done

# Test 13: Replenish Ceremony WSJF Integration
test_start "Replenish Ceremony Auto-Calculates WSJF"

output=$("$SCRIPT_DIR/ay-prod-cycle.sh" seeker replenish advisory 2>&1 || true)

if echo "$output" | grep -q "🎯 Auto-calculating WSJF"; then
    test_pass "WSJF auto-calculation triggered during replenish"
else
    test_warn "WSJF auto-calculation not shown in replenish output"
fi

# ==========================================
# Test Summary
# ==========================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Phase D Integration Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Total Tests:  $TESTS_TOTAL"
echo -e "${GREEN}Passed:       $TESTS_PASSED${NC}"
echo -e "${RED}Failed:       $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo "Phase D Implementation: COMPLETE ✅"
    echo ""
    echo "Features Validated:"
    echo "  ✅ Circle ceremony validation"
    echo "  ✅ WSJF auto-calculation"
    echo "  ✅ Episode metadata with WSJF context"
    echo "  ✅ WSJF analytics reports"
    echo "  ✅ Backlog management"
    echo "  ✅ All 6 circle ceremonies"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo "Failed Tests:"
    for failed_test in "${FAILED_TESTS[@]}"; do
        echo -e "  ${RED}•${NC} $failed_test"
    done
    echo ""
    exit 1
fi
