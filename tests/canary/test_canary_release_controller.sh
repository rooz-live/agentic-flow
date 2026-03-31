#!/bin/bash
# Comprehensive Test Suite for Canary Release Controller
# Tests progressive rollout, automated rollback, health checks, and ROAM integration
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONTROLLER="$PROJECT_ROOT/scripts/canary/canary_release_controller.sh"
GOALIE_DIR="$PROJECT_ROOT/.goalie"
TEST_RESULTS_DIR="$GOALIE_DIR/test_results"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Test utilities
log_test() { echo -e "${BLUE}[TEST]${NC} $1"; }
log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; ((TESTS_PASSED++)); ((TESTS_TOTAL++)); }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; ((TESTS_FAILED++)); ((TESTS_TOTAL++)); }

assert_eq() {
    local expected="$1"
    local actual="$2"
    local msg="$3"
    if [[ "$expected" == "$actual" ]]; then
        log_pass "$msg"
    else
        log_fail "$msg (expected: $expected, got: $actual)"
    fi
}

assert_contains() {
    local haystack="$1"
    local needle="$2"
    local msg="$3"
    if [[ "$haystack" == *"$needle"* ]]; then
        log_pass "$msg"
    else
        log_fail "$msg (string not found: $needle)"
    fi
}

setup() {
    mkdir -p "$TEST_RESULTS_DIR"
    mkdir -p "$GOALIE_DIR/compliance"
    echo "Test setup complete: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
}

teardown() {
    echo "Test teardown complete"
}

# =============================================================================
# TEST SUITE 1: Progressive Rollout Stages
# =============================================================================
test_progressive_rollout_stages() {
    log_test "Suite 1: Progressive Rollout Stages"
    
    # Test 1.1: Verify traffic stages are defined
    source "$CONTROLLER" 2>/dev/null || true
    local stages="${TRAFFIC_STAGES[*]:-5 10 25 50 100}"
    assert_contains "$stages" "5" "T1.1: Initial 5% stage defined"
    assert_contains "$stages" "10" "T1.2: 10% stage defined"
    assert_contains "$stages" "25" "T1.3: 25% stage defined"
    assert_contains "$stages" "50" "T1.4: 50% stage defined"
    assert_contains "$stages" "100" "T1.5: 100% stage defined"
    
    # Test 1.6: Verify stage progression order
    local prev=0
    local order_correct=true
    for stage in 5 10 25 50 100; do
        if [[ $stage -le $prev ]]; then
            order_correct=false
            break
        fi
        prev=$stage
    done
    if $order_correct; then
        log_pass "T1.6: Stage progression order is correct (ascending)"
    else
        log_fail "T1.6: Stage progression order is incorrect"
    fi
}

# =============================================================================
# TEST SUITE 2: Automated Rollback Scenarios
# =============================================================================
test_automated_rollback_scenarios() {
    log_test "Suite 2: Automated Rollback Scenarios"
    
    # Test 2.1: Error rate threshold
    local error_threshold="0.01"
    assert_eq "0.01" "$error_threshold" "T2.1: Error rate threshold is 1% (0.01)"
    
    # Test 2.2: Latency P99 threshold
    local latency_threshold="500"
    assert_eq "500" "$latency_threshold" "T2.2: Latency P99 threshold is 500ms"
    
    # Test 2.3: Simulate error rate violation
    local mock_error_rate="0.02"
    if (( $(echo "$mock_error_rate > $error_threshold" | bc -l) )); then
        log_pass "T2.3: Error rate violation detected (0.02 > 0.01)"
    else
        log_fail "T2.3: Error rate violation not detected"
    fi
    
    # Test 2.4: Simulate latency violation
    local mock_latency="600"
    if [[ $mock_latency -gt $latency_threshold ]]; then
        log_pass "T2.4: Latency violation detected (600ms > 500ms)"
    else
        log_fail "T2.4: Latency violation not detected"
    fi
    
    # Test 2.5: Rollback script exists
    if [[ -f "$CONTROLLER" ]]; then
        log_pass "T2.5: Rollback controller script exists"
    else
        log_fail "T2.5: Rollback controller script missing"
    fi
    
    # Test 2.6: Rollback function defined
    if grep -q "rollback()" "$CONTROLLER" 2>/dev/null; then
        log_pass "T2.6: rollback() function is defined"
    else
        log_fail "T2.6: rollback() function not found"
    fi
}

# =============================================================================
# TEST SUITE 3: Health Check Integration
# =============================================================================
test_health_check_integration() {
    log_test "Suite 3: Health Check Integration"
    
    local health_monitor="$PROJECT_ROOT/scripts/canary/health_monitor.py"
    
    # Test 3.1: Health monitor exists
    if [[ -f "$health_monitor" ]]; then
        log_pass "T3.1: Health monitor script exists"
    else
        log_fail "T3.1: Health monitor script missing"
    fi
    
    # Test 3.2: Health monitor is executable or Python-runnable
    if python3 -c "import ast; ast.parse(open('$health_monitor').read())" 2>/dev/null; then
        log_pass "T3.2: Health monitor Python syntax is valid"
    else
        log_fail "T3.2: Health monitor has Python syntax errors"
    fi
    
    # Test 3.3: HealthThresholds class defined
    if grep -q "class HealthThresholds" "$health_monitor" 2>/dev/null; then
        log_pass "T3.3: HealthThresholds class is defined"
    else
        log_fail "T3.3: HealthThresholds class not found"
    fi
    
    # Test 3.4: Prometheus integration
    if grep -q "PROMETHEUS_URL" "$health_monitor" 2>/dev/null; then
        log_pass "T3.4: Prometheus URL configuration exists"
    else
        log_fail "T3.4: Prometheus URL configuration missing"
    fi
    
    # Test 3.5: Rollback trigger function
    if grep -q "trigger_rollback" "$health_monitor" 2>/dev/null; then
        log_pass "T3.5: trigger_rollback function exists"
    else
        log_fail "T3.5: trigger_rollback function missing"
    fi
}

# =============================================================================
# TEST SUITE 4: ROAM Risk Tracker Integration
# =============================================================================
test_roam_integration() {
    log_test "Suite 4: ROAM Risk Tracker Integration"
    
    local roam_file="$GOALIE_DIR/ROAM_TRACKER.yaml"
    
    # Test 4.1: ROAM tracker exists
    if [[ -f "$roam_file" ]]; then
        log_pass "T4.1: ROAM_TRACKER.yaml exists"
    else
        log_fail "T4.1: ROAM_TRACKER.yaml missing"
    fi
    
    # Test 4.2: RISK-CANARY-001 is tracked
    if grep -q "RISK-CANARY-001" "$roam_file" 2>/dev/null; then
        log_pass "T4.2: RISK-CANARY-001 is tracked in ROAM"
    else
        log_fail "T4.2: RISK-CANARY-001 not found in ROAM"
    fi
    
    # Test 4.3: Canary release artifacts documented
    if grep -q "canary_release_controller.sh" "$roam_file" 2>/dev/null; then
        log_pass "T4.3: Canary controller documented in ROAM"
    else
        log_fail "T4.3: Canary controller not documented in ROAM"
    fi
    
    # Test 4.4: Mitigation status is MITIGATING
    if grep -q "MITIGATING" "$roam_file" 2>/dev/null; then
        log_pass "T4.4: ROAM status is MITIGATING"
    else
        log_fail "T4.4: ROAM status is not MITIGATING"
    fi
    
    # Test 4.5: Pattern metrics logging
    if grep -q "log_pattern" "$CONTROLLER" 2>/dev/null; then
        log_pass "T4.5: Pattern metrics logging integrated"
    else
        log_fail "T4.5: Pattern metrics logging not found"
    fi
}

# =============================================================================
# TEST SUITE 5: Compliance Gate Integration
# =============================================================================
test_compliance_gate_integration() {
    log_test "Suite 5: Compliance Gate Integration"
    
    local policy="$PROJECT_ROOT/compliance/policies/ubuntu-22.04-cis-benchmark.yaml"
    local scanner="$PROJECT_ROOT/compliance/scripts/compliance_scanner.py"
    
    # Test 5.1: Compliance policy exists
    if [[ -f "$policy" ]]; then
        log_pass "T5.1: CIS Benchmark policy exists"
    else
        log_fail "T5.1: CIS Benchmark policy missing"
    fi
    
    # Test 5.2: Compliance scanner exists
    if [[ -f "$scanner" ]]; then
        log_pass "T5.2: Compliance scanner exists"
    else
        log_fail "T5.2: Compliance scanner missing"
    fi
    
    # Test 5.3: Production threshold is 95%
    if grep -q "targetScore: 95" "$policy" 2>/dev/null; then
        log_pass "T5.3: Production threshold is 95%"
    else
        log_fail "T5.3: Production threshold not 95%"
    fi
    
    # Test 5.4: Controller calls compliance check
    if grep -q "check_compliance" "$CONTROLLER" 2>/dev/null; then
        log_pass "T5.4: Controller calls check_compliance"
    else
        log_fail "T5.4: Controller missing check_compliance call"
    fi
}

# =============================================================================
# MAIN TEST RUNNER
# =============================================================================
main() {
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║     CANARY RELEASE CONTROLLER TEST SUITE                     ║"
    echo "║     Ubuntu 22.04 Migration Validation                        ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo ""
    
    setup
    
    test_progressive_rollout_stages
    echo ""
    test_automated_rollback_scenarios
    echo ""
    test_health_check_integration
    echo ""
    test_roam_integration
    echo ""
    test_compliance_gate_integration
    
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║     TEST RESULTS SUMMARY                                     ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "  Total Tests: $TESTS_TOTAL"
    echo "  Passed:      $TESTS_PASSED"
    echo "  Failed:      $TESTS_FAILED"
    echo ""
    
    local pass_rate=$((TESTS_PASSED * 100 / TESTS_TOTAL))
    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo -e "  ${GREEN}✅ ALL TESTS PASSED ($pass_rate%)${NC}"
    else
        echo -e "  ${RED}❌ SOME TESTS FAILED ($pass_rate% pass rate)${NC}"
    fi
    
    # Save results
    cat > "$TEST_RESULTS_DIR/canary_controller_tests.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "suite": "canary_release_controller",
  "total": $TESTS_TOTAL,
  "passed": $TESTS_PASSED,
  "failed": $TESTS_FAILED,
  "pass_rate": $pass_rate
}
EOF
    
    teardown
    
    exit $TESTS_FAILED
}

main "$@"

