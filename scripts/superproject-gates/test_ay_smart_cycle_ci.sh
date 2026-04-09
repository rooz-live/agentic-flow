#!/bin/bash
# --- CI Integration Tests for AY Smart Cycle Script ---


SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SMART_CYCLE_SCRIPT="$SCRIPT_DIR/../scripts/ay-smart-cycle.sh"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test helper functions
test_case() {
    local name="$1"
    echo -e "\n${YELLOW}Testing: $name${NC}"
    ((TESTS_RUN++))
}

assert_exit_code() {
    local expected="$1"
    local actual="$2"
    local test_name="$3"
    
    if [ "$expected" -eq "$actual" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $test_name (exit code: $actual)"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $test_name (expected: $expected, got: $actual)"
        ((TESTS_FAILED++))
    fi
}

assert_json_field() {
    local json="$1"
    local field="$2"
    local expected="$3"
    local test_name="$4"
    
    local actual=$(echo "$json" | grep -o "\"$field\":\s*[^,}]*" | head -1 | sed 's/.*:\s*//' | tr -d '"')
    
    if [ "$actual" = "$expected" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $test_name ($field = $actual)"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $test_name (expected $field=$expected, got $actual)"
        ((TESTS_FAILED++))
    fi
}

# --- Test Suite ---

echo "======================================"
echo "AY Smart Cycle CI Integration Tests"
echo "======================================"

# Test 1: NO_GO scenario (targets < threshold)
test_case "NO_GO scenario (1 target, threshold 2)"
output=$("$SMART_CYCLE_SCRIPT" --ci --targets 1 2>&1); exit_code=$?
assert_exit_code 2 $exit_code "NO_GO exits with code 2"
assert_json_field "$output" "verdict" "NO_GO" "NO_GO verdict in JSON"
assert_json_field "$output" "targets_met" "1" "targets_met field correct"
assert_json_field "$output" "threshold" "2" "threshold field correct"

# Test 2: GO scenario (targets >= threshold)
test_case "GO scenario (2 targets, threshold 2)"
output=$("$SMART_CYCLE_SCRIPT" --ci --targets 2 2>&1); exit_code=$?
assert_exit_code 0 $exit_code "GO exits with code 0"
assert_json_field "$output" "verdict" "GO" "GO verdict in JSON"
assert_json_field "$output" "targets_met" "2" "targets_met field correct"

# Test 3: GO scenario with more targets
test_case "GO scenario (5 targets, threshold 2)"
output=$("$SMART_CYCLE_SCRIPT" --ci --targets 5 2>&1); exit_code=$?
assert_exit_code 0 $exit_code "GO with excess targets exits with code 0"
assert_json_field "$output" "verdict" "GO" "GO verdict in JSON"
assert_json_field "$output" "targets_met" "5" "targets_met field correct"

# Test 4: Custom threshold
test_case "Custom threshold (3 targets, threshold 5)"
output=$("$SMART_CYCLE_SCRIPT" --ci --targets 3 --threshold 5 2>&1); exit_code=$?
assert_exit_code 2 $exit_code "NO_GO with custom threshold exits with code 2"
assert_json_field "$output" "verdict" "NO_GO" "NO_GO verdict in JSON"
assert_json_field "$output" "targets_met" "3" "targets_met field correct"
assert_json_field "$output" "threshold" "5" "threshold field correct"

# Test 5: Non-CI mode (should always exit 0)
test_case "Non-CI mode with NO_GO targets"
output=$("$SMART_CYCLE_SCRIPT" --targets 1 2>&1); exit_code=$?
assert_exit_code 0 $exit_code "Non-CI mode always exits 0"

# Test 6: Non-CI mode with GO targets
test_case "Non-CI mode with GO targets"
output=$("$SMART_CYCLE_SCRIPT" --targets 3 2>&1); exit_code=$?
assert_exit_code 0 $exit_code "Non-CI mode always exits 0"

# Test 7: JSON structure validation
test_case "JSON structure validation"
output=$("$SMART_CYCLE_SCRIPT" --ci --targets 2 2>&1); exit_code=$?
if echo "$output" | python3 -m json.tool >/dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}: JSON output is valid"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}: JSON output is not valid"
    ((TESTS_FAILED++))
fi

# Test 8: Timestamp field presence
test_case "Timestamp field in JSON output"
output=$("$SMART_CYCLE_SCRIPT" --ci --targets 2 2>&1)
timestamp=$(echo "$output" | grep -o "\"timestamp\":\s*\"[^\"]*\"" | sed 's/.*:\s*"//' | tr -d '"')
if [ -n "$timestamp" ]; then
    echo -e "${GREEN}✓ PASS${NC}: Timestamp field present ($timestamp)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}: Timestamp field missing"
    ((TESTS_FAILED++))
fi

# Test 9: Rationale field presence
test_case "Rationale field in JSON output"
output=$("$SMART_CYCLE_SCRIPT" --ci --targets 2 2>&1)
rationale=$(echo "$output" | grep -o "\"rationale\":\s*\"[^\"]*\"" | sed 's/.*:\s*"//' | tr -d '"')
if [ -n "$rationale" ]; then
    echo -e "${GREEN}✓ PASS${NC}: Rationale field present"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}: Rationale field missing"
    ((TESTS_FAILED++))
fi

# Test 10: Exit code field in JSON
test_case "Exit code field in JSON output"
output=$("$SMART_CYCLE_SCRIPT" --ci --targets 1 2>&1); exit_code=$?
json_exit_code=$(echo "$output" | grep -o "\"exit_code\":\s*[0-9]*" | sed 's/.*:\s*//')
if [ "$json_exit_code" = "$exit_code" ]; then
    echo -e "${GREEN}✓ PASS${NC}: Exit code field matches actual exit code"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}: Exit code field mismatch (JSON: $json_exit_code, actual: $exit_code)"
    ((TESTS_FAILED++))
fi

# Test 11: Verbose mode
test_case "Verbose mode output"
output=$("$SMART_CYCLE_SCRIPT" --verbose --targets 2 2>&1)
if echo "$output" | grep -q "Smart Cycle Verdict"; then
    echo -e "${GREEN}✓ PASS${NC}: Verbose mode shows verdict header"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}: Verbose mode missing expected output"
    ((TESTS_FAILED++))
fi

# Test 12: Help flag
test_case "Help flag"
"$SMART_CYCLE_SCRIPT" --help >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: Help flag exits successfully"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}: Help flag failed"
    ((TESTS_FAILED++))
fi

# Test 13: Invalid argument
test_case "Invalid argument handling"
"$SMART_CYCLE_SCRIPT" --invalid-arg >/dev/null 2>&1
if [ $? -eq 1 ]; then
    echo -e "${GREEN}✓ PASS${NC}: Invalid argument exits with code 1"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}: Invalid argument should exit with code 1"
    ((TESTS_FAILED++))
fi

# Reset exit code before next test
exit_code=0

# Test 14: CONTINUE scenario (same as GO for CI)
test_case "CONTINUE scenario (targets >= threshold)"
output=$("$SMART_CYCLE_SCRIPT" --ci --targets 3 2>&1) || exit_code=$?
assert_exit_code 0 $exit_code "CONTINUE exits with code 0"
assert_json_field "$output" "verdict" "GO" "CONTINUE mapped to GO in JSON"

# Test 15: Zero targets
test_case "Zero targets (NO_GO)"
output=$("$SMART_CYCLE_SCRIPT" --ci --targets 0 2>&1) || exit_code=$?
assert_exit_code 2 $exit_code "Zero targets exits with code 2"
assert_json_field "$output" "verdict" "NO_GO" "Zero targets verdict is NO_GO"

# --- Summary ---
echo ""
echo "======================================"
echo "Test Summary"
echo "======================================"
echo "Tests Run:    $TESTS_RUN"
echo -e "Tests Passed:  ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed:  ${RED}$TESTS_FAILED${NC}"
echo "======================================"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
fi
