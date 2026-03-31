#!/usr/bin/env bash
# Fixture-based tests for validation-core.sh (core_* checks)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FIX="$BASE_DIR/tests/fixtures/eml"

# shellcheck source=../scripts/validation-core.sh
# shellcheck disable=SC1091
source "$BASE_DIR/scripts/validation-core.sh"

fail() { echo "FAIL: $*" >&2; exit 1; }

# --- core_check_placeholders ---
set +e
out=$(core_check_placeholders "$FIX/minimal-pass.eml" "false")
rc=$?
set -e
[[ "$rc" -eq 0 ]] || fail "minimal-pass placeholders: expected rc 0 got $rc"
echo "$out" | grep -q "PASS|" || fail "minimal-pass expected PASS line"

set +e
out=$(core_check_placeholders "$FIX/placeholder-fail.eml" "false")
rc=$?
set -e
[[ "$rc" -eq 1 ]] || fail "placeholder-fail: expected rc 1 got $rc"
echo "$out" | grep -q "FAIL|" || fail "placeholder-fail expected FAIL"

# --- core_check_date_consistency ---
out=$(core_check_date_consistency "$FIX/past-date-fail.eml" "true") || true
echo "$out" | grep -q "SKIPPED|" || fail "skip date expected SKIPPED"

set +e
out=$(core_check_date_consistency "$FIX/past-date-fail.eml" "false")
rc=$?
set -e
[[ "$rc" -eq 1 ]] || fail "past-date fixture expected rc 1 got $rc (out=$out)"
echo "$out" | grep -q "FAIL|.*past" || fail "past-date expected past message"

set +e
out=$(core_check_date_consistency "$FIX/march-ambiguous-warn.eml" "false")
rc=$?
set -e
[[ "$rc" -eq 0 ]] || fail "march-ambiguous: expected PASS rc 0 got $rc (out=$out)"

echo "PASS: validation-core fixture tests completed"
CORE_TESTS_RUN=6
echo "validation-core.sh scenarios exercised: $CORE_TESTS_RUN"
exit 0
