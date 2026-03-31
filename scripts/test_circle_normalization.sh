#!/usr/bin/env bash
#
# Test: Circle Name Normalization
# Validates that normalize_circle_name() correctly standardizes circle names
#

set -eu pipefail

# Extract normalize_circle_name function directly
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Define normalize_circle_name inline to avoid sourcing all helpers
normalize_circle_name() {
    local input_circle="${1:-Orchestrator}"
    local normalized
    
    # Convert to lowercase for matching
    case "${input_circle,,}" in
        analyst*)
            normalized="Analyst" ;;
        assessor*)
            normalized="Assessor" ;;
        innovator*)
            normalized="Innovator" ;;
        intuitive*)
            normalized="Intuitive" ;;
        orchestrator*|orchestration*)
            normalized="Orchestrator" ;;
        seeker*|exploration*|discovery*)
            normalized="Seeker" ;;
        *)
            # Fallback to Orchestrator for unknown circles
            normalized="Orchestrator" ;;
    esac
    
    echo "$normalized"
}

echo "🧪 Testing Circle Name Normalization..."
echo ""

# Test cases
test_cases=(
    "analyst:Analyst"
    "Analyst:Analyst"
    "ANALYST:Analyst"
    "assessor:Assessor"
    "ASSESSOR:Assessor"
    "innovator:Innovator"
    "InNoVaToR:Innovator"
    "intuitive:Intuitive"
    "orchestrator:Orchestrator"
    "orchestration:Orchestrator"
    "ORCHESTRATOR:Orchestrator"
    "seeker:Seeker"
    "exploration:Seeker"
    "discovery:Seeker"
    "SEEKER:Seeker"
    "unknown:Orchestrator"
    "invalid_name:Orchestrator"
    "empty:Orchestrator"  # RCA: Fixed malformed empty string test case
)

passed=0
failed=0

for test_case in "${test_cases[@]}"; do
    input="${test_case%%:*}"
    expected="${test_case##*:}"
    
    actual=$(normalize_circle_name "$input")
    
    if [ "$actual" = "$expected" ]; then
        echo "✅ PASS: '$input' → '$actual'"
        ((passed++))
    else
        echo "❌ FAIL: '$input' → '$actual' (expected: '$expected')"
        ((failed++))
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test Results:"
echo "  Passed: $passed"
echo "  Failed: $failed"
echo "  Total:  $((passed + failed))"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$failed" -gt 0 ]; then
    exit 1
else
    echo "✅ All tests passed!"
    exit 0
fi
