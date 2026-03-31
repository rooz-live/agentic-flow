#!/usr/bin/env bash
# @business-context WSJF: Enforce unified send-readiness JSON contract
# verify-send-readiness-contract.sh — validates runner JSON against required keys

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RUNNER="$PROJECT_ROOT/scripts/validators/file/validation-runner.sh"
FIXTURE="${1:-$PROJECT_ROOT/tests/fixtures/minimal-pass-email.txt}"

if [[ ! -f "$FIXTURE" ]]; then
  echo "Fixture missing: $FIXTURE" >&2
  exit 1
fi

export SKIP_SEMANTIC_VALIDATION=true
export SEND_GATE_CONFIG_OK=true

JSON_OUT=$("$RUNNER" --json --file "$FIXTURE" 2>/dev/null) || true

python3 - "$JSON_OUT" <<'PY'
import json, sys
raw = sys.argv[1]
try:
    o = json.loads(raw)
except Exception as e:
    print("FAIL: invalid JSON from runner:", e, file=sys.stderr)
    sys.exit(1)

required = [
    "send_ready", "good_enough_to_send", "validation_ok", "config_ok",
    "exit_code", "RUNNER_EXIT", "runner_exit", "failures_100_plus",
    "rca_trace", "checks_passed", "checks_total",
]
missing = [k for k in required if k not in o]
if missing:
    print("FAIL: missing keys:", missing, file=sys.stderr)
    sys.exit(1)

rt = o.get("rca_trace") or {}
for k in ("raw_exit", "top_reason", "next_action", "roam_tag", "wsjf_hint"):
    if k not in rt:
        print("FAIL: rca_trace missing", k, file=sys.stderr)
        sys.exit(1)

print("OK: send-readiness contract keys present")
PY
