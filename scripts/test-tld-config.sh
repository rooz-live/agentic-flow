#!/bin/bash
# Test Matrix for TLD Server Configuration Guard Clauses
# @business-context WSJF-9: Dashboard Guard Clauses
# @adr ADR-021: Strict Dependency and Precondition Checks

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TARGET_SCRIPT="$PROJECT_ROOT/_SYSTEM/_AUTOMATION/tld-server-config.sh"

if [[ ! -f "$TARGET_SCRIPT" ]]; then
    echo "❌ Target script not found: $TARGET_SCRIPT"
    exit 1
fi

# We will test the check_tld_readiness function
# We need to source it, but we also need to mock `command`, `dig`, and `lsof`.

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Test registry
total_tests=0
passed_tests=0

run_test() {
    local test_name="$1"
    local setup_func="$2"
    local expected_status="$3"
    
    total_tests=$((total_tests + 1))
    
    # Run in subshell to isolate mocks
    (
        source "$TARGET_SCRIPT" >/dev/null 2>&1
        $setup_func
        
        # Capture output and status
        set +e
        output=$(check_tld_readiness 2>&1)
        status=$?
        set -e
        
        if [[ $status -eq $expected_status ]]; then
            echo -e "${GREEN}✅ PASS:${NC} $test_name"
            return 0
        else
            echo -e "${RED}❌ FAIL:${NC} $test_name (Expected $expected_status, got $status)"
            echo "   Output: $output"
            return 1
        fi
    )
    
    if [[ $? -eq 0 ]]; then
        passed_tests=$((passed_tests + 1))
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TLD GUARD CLAUSES: RED/GREEN TDD MATRIX"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 1: Missing 'dig' dependency
setup_missing_dig() {
    command() {
        if [[ "$2" == "dig" ]]; then return 1; fi
        return 0
    }
    export -f command
}
run_test "Missing 'dig' dependency triggers Early Exit" setup_missing_dig 1

# Test 2: Missing 'lsof' dependency
setup_missing_lsof() {
    command() {
        if [[ "$2" == "lsof" ]]; then return 1; fi
        return 0
    }
    export -f command
}
run_test "Missing 'lsof' dependency triggers Early Exit" setup_missing_lsof 1

# Test 3: Domain resolution failure
setup_domain_fail() {
    command() { return 0; }
    dig() { return 0; } # dig succeeds but returns empty
    lsof() { return 1; }
    export DASHBOARD_DOMAIN="bad.domain.local"
    export DASHBOARD_SSL="false"
    export DASHBOARD_PORT=8080
    export -f command dig lsof
}
run_test "Domain not resolving triggers Early Exit" setup_domain_fail 1

# Test 4: SSL Certificate missing when enabled
setup_no_ssl() {
    command() { return 0; }
    dig() { echo "127.0.0.1"; return 0; }
    lsof() { return 1; }
    export DASHBOARD_DOMAIN="good.domain.local"
    export DASHBOARD_SSL="true"
    export DASHBOARD_PORT=8080
    
    # Mock specific dir check by creating a fake path and failing it
    # We can't mock [[ -d ]] easily, so we rely on the fact /etc/letsencrypt/live/good.domain.local doesn't exist on tests
    export -f command dig lsof
}
run_test "Missing SSL certificates with DASHBOARD_SSL=true triggers Early Exit" setup_no_ssl 1

# Test 5: Port already in use
setup_port_in_use() {
    command() { return 0; }
    dig() { echo "127.0.0.1"; return 0; }
    # Succeeds meaning port is in use
    lsof() { return 0; }
    
    export DASHBOARD_DOMAIN="good.domain.local"
    export DASHBOARD_SSL="false"
    export DASHBOARD_PORT=8080
    export -f command dig lsof
}
run_test "Port already in use triggers Early Exit" setup_port_in_use 1

# Test 6: Happy Path
setup_happy_path() {
    command() { return 0; }
    dig() { echo "127.0.0.1"; return 0; }
    lsof() { return 1; } # Normal failing means port NOT in use
    
    export DASHBOARD_DOMAIN="good.domain.local"
    export DASHBOARD_SSL="false"
    export DASHBOARD_PORT=8080
    export -f command dig lsof
}
run_test "Valid configuration passes all guard clauses" setup_happy_path 0

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ $passed_tests -eq $total_tests ]]; then
    echo -e "${GREEN}✅ All tests passed ($passed_tests/$total_tests)${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed ($passed_tests/$total_tests)${NC}"
    exit 1
fi
