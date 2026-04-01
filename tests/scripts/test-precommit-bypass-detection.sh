#!/bin/bash
# Test: Pre-commit bypass detection should log all bypass attempts
# Following TDD red-green-refactor pattern

set -euo pipefail

# Test constants
TEST_BYPASS_LOG=".goalie/bypass_audit.log"
TEST_REASON="Test bypass for verification"

echo "Testing pre-commit bypass detection..."

# RED: Test that bypass attempts are logged
setup() {
    # Create test environment
    rm -f "$TEST_BYPASS_LOG"
    touch test_file.txt
    git add test_file.txt
}

test_bypass_logging() {
    echo "  RED: Bypass should be logged with timestamp and reason"
    
    # Create a file to commit
    echo "test content" > test_file.txt
    git add test_file.txt
    
    # Simulate bypass with environment variable
    TRUST_INFRA_BYPASS_TS=$(date +%s) TRUST_INFRA_BYPASS_REASON="$TEST_REASON" git commit -m "test commit --no-verify" --no-verify 2>/dev/null || true
    
    # Check if bypass was logged
    if [[ -f "$TEST_BYPASS_LOG" ]]; then
        if grep -q "$TEST_REASON" "$TEST_BYPASS_LOG"; then
            echo "  ✓ GREEN: Bypass was logged"
            return 0
        fi
    fi
    
    echo "  ✗ RED: Bypass was not logged"
    return 1
}

test_bypass_audit_trail() {
    echo "  Testing audit trail completeness..."
    
    # Check for required fields
    if [[ -f "$TEST_BYPASS_LOG" ]]; then
        # Should contain timestamp, reason, and commit hash
        if grep -E "^[0-9]{10}\|[^|]+\|[a-f0-9]{7}" "$TEST_BYPASS_LOG" >/dev/null; then
            echo "  ✓ Audit trail format is correct"
            return 0
        fi
    fi
    
    echo "  ✗ Audit trail missing required fields"
    return 1
}

cleanup() {
    # Reset test state
    git reset HEAD test_file.txt 2>/dev/null || true
    rm -f test_file.txt "$TEST_BYPASS_LOG"
    # Clean up any test commits
    git log --oneline -n 5 | grep "test commit --no-verify" && git reset --hard HEAD~1 2>/dev/null || true
}

# Execute test
setup
if test_bypass_logging && test_bypass_audit_trail; then
    echo "✅ All tests passed"
    cleanup
    exit 0
else
    echo "❌ Tests failed - bypass detection needs implementation"
    cleanup
    exit 1
fi
