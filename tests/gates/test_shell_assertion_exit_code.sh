#!/usr/bin/env bash
# Regression test: assertion.sh-based shell tests must exit non-zero on failure.
# TDD: ensures a failing test suite cannot be misread as green by a caller.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/../helpers/assertions.sh"

TMPROOT=$(mktemp -d)
trap 'rm -rf "$TMPROOT"' EXIT

FAILING_SCRIPT="$TMPROOT/failing_test.sh"
cat > "$FAILING_SCRIPT" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
source tests/helpers/assertions.sh

test_always_fails() {
    assert_equals "expected" "actual" "intentional failure"
}

main() {
    test_always_fails
    if ! print_test_summary; then
        exit 1
    fi
}
main "$@"
EOF
chmod +x "$FAILING_SCRIPT"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TDD: shell assertion exit-code contract"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 1: failing script exits non-zero
set +e
bash "$FAILING_SCRIPT" > "$TMPROOT/out.txt" 2>&1
LAST_RC=$?
set -e

TESTS_RUN=$((TESTS_RUN + 1))
if [[ $LAST_RC -ne 0 ]]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "\033[32m✓\033[0m  failing shell test exits non-zero (exit $LAST_RC)"
else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "\033[31m✗\033[0m  failing shell test should exit non-zero but got 0"
fi

# Test 2: passing script exits zero
PASSING_SCRIPT="$TMPROOT/passing_test.sh"
cat > "$PASSING_SCRIPT" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
source tests/helpers/assertions.sh

test_always_passes() {
    assert_equals "ok" "ok" "intentional pass"
}

main() {
    test_always_passes
    if ! print_test_summary; then
        exit 1
    fi
}
main "$@"
EOF
chmod +x "$PASSING_SCRIPT"

set +e
bash "$PASSING_SCRIPT" > "$TMPROOT/out2.txt" 2>&1
LAST_RC=$?
set -e

TESTS_RUN=$((TESTS_RUN + 1))
if [[ $LAST_RC -eq 0 ]]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "\033[32m✓\033[0m  passing shell test exits 0"
else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "\033[31m✗\033[0m  passing shell test should exit 0 but got $LAST_RC"
fi

print_test_summary
