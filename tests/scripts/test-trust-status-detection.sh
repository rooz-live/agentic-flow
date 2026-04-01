#!/bin/bash
# Test: trust-status.sh correctly detects Date Semantics in pre-commit hook
# Following TDD red-green-refactor pattern

set -euo pipefail

echo "Testing trust-status Date Semantics detection..."

# RED: Test should fail - trust-status reports Date Semantics as not found
test_date_semantics_detection() {
    echo "  RED: trust-status should detect Date Semantics correctly"
    
    # Run trust-status and capture output
    OUTPUT=$(bash scripts/trust-status.sh 2>&1)
    
    # Check if Date Semantics is incorrectly reported as not found
    if echo "$OUTPUT" | grep -q "Date Semantics:.*Not found in hook"; then
        echo "  ✗ RED: Date Semantics falsely reported as not found"
        return 1
    fi
    
    # Check if Date Semantics is correctly reported as configured
    if echo "$OUTPUT" | grep -q "Date Semantics:.*Configured"; then
        echo "  ✓ GREEN: Date Semantics correctly detected"
        return 0
    fi
    
    echo "  ? UNCLEAR: Could not determine Date Semantics status"
    return 1
}

# Verify the pre-commit hook actually has Date Semantics
verify_precommit_has_date_semantics() {
    echo "  Verifying pre-commit hook contains Date Semantics..."
    
    if grep -q "validate-dates.sh" .git/hooks/pre-commit; then
        echo "  ✓ Pre-commit hook has validate-dates.sh"
        return 0
    else
        echo "  ✗ Pre-commit hook missing validate-dates.sh"
        return 1
    fi
}

# Execute tests
echo "Running RED phase tests..."
if verify_precommit_has_date_semantics; then
    if test_date_semantics_detection; then
        echo "✅ Tests passed - no fix needed"
        exit 0
    else
        echo "❌ Test failed - detection needs fixing"
        exit 1
    fi
else
    echo "❌ Pre-commit hook issue - cannot proceed"
    exit 1
fi
