#!/usr/bin/env bash
# Unit tests for process_result + integration tests for validation-runner CLI JSON contract.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
RUNNER="$BASE_DIR/scripts/validators/file/validation-runner.sh"
FIX="$BASE_DIR/tests/fixtures/eml"

# shellcheck source=../scripts/validators/file/validation-runner.sh
# shellcheck disable=SC1091
source "$RUNNER"

fail() { echo "FAIL: $*" >&2; exit 1; }

# --- process_result (sourced) ---
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0
FIX_HINTS=()
JSON_OUTPUT="false"

process_result "Test Check" 0 "PASS|Looks good"
[[ "$PASS_COUNT" == "1" ]] || fail "pass count expected 1 got $PASS_COUNT"

process_result "Warning Check" 2 "WARN|Minor issue"
[[ "$WARN_COUNT" == "1" ]] || fail "warn count"

process_result "Fail Check" 1 "FAIL|Critical issue"
[[ "$FAIL_COUNT" == "1" ]] || fail "fail count"
[[ "${#FIX_HINTS[@]}" -eq 2 ]] || fail "fix hints count"

# --- CLI JSON: minimal-pass fixture ---
if ! command -v python3 >/dev/null 2>&1; then
  echo "SKIP: python3 required for JSON assertions"
  exit 0
fi

json=$(SKIP_SEMANTIC_VALIDATION=true bash "$RUNNER" --json -f "$FIX/minimal-pass.eml" 2>/dev/null) || true

printf '%s\n' "$json" | python3 -c '
import json, sys
j = json.load(sys.stdin)
assert "rca_trace" in j, "missing rca_trace"
assert "wsjf_hint" in j["rca_trace"]
assert "%/#" in j
assert "checks_passed" in j["%/#"]
assert "RUNNER_EXIT" in j or "exit_code" in j
print("ok")
'

echo "PASS: validation-runner tests (process_result + JSON contract)"
exit 0
