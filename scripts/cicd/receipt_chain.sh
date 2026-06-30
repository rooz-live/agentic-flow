#!/usr/bin/env bash
# Bounded post-tick earnings → hire receipt chain (fail-closed on verify).
set -euo pipefail
CODE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DATA_ROOT="${REPO_ROOT:-$CODE_ROOT}"
export REPO_ROOT="$DATA_ROOT"
ROOT="$DATA_ROOT"
cd "$ROOT"

ENFORCE="${AF_RECEIPT_CHAIN_ENFORCE:-0}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
RECEIPT_DIR="$ROOT/.goalie/evidence/receipts"
RECEIPT_PATH="$RECEIPT_DIR/tick_${TS}.json"
mkdir -p "$RECEIPT_DIR"

HEAD_SHA="$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || echo unknown)"
CEREMONY_TICK="${LOOP_TICK_COUNT:-0}"

_resolve_scorecard() {
  python3 "$CODE_ROOT/scripts/metrics/scorecard_resolver.py" --resolve-path 2>/dev/null || return 1
}

_write_receipt() {
  local status="$1"
  local exit_code="$2"
  local scorecard="${3:-}"
  local earnings_hash="${4:-}"
  local errors_json="${5:-[]}"
  python3 - "$RECEIPT_PATH" "$status" "$exit_code" "$HEAD_SHA" "$earnings_hash" "$CEREMONY_TICK" "$scorecard" "$errors_json" <<'PY'
import json, os, sys, uuid
from datetime import datetime, timezone
from pathlib import Path

out, status, exit_code, head, earnings_hash, ceremony_tick, scorecard, errors_json = sys.argv[1:9]
errors = json.loads(errors_json) if errors_json else []

# Provenance: distinguish a cryptographically verified CI receipt from a local
# convenience receipt. A present AF_CI_PROVENANCE_SIGNATURE => ci_signed; local
# contexts (review/precommit or AF_ALLOW_OWNED_LOCAL) => local; else none.
def _provenance_value():
    if (os.environ.get("AF_CI_PROVENANCE_SIGNATURE") or "").strip():
        return "ci_signed"
    ctx = (os.environ.get("AF_GATE_CONTEXT") or "").strip().lower()
    if ctx in ("review", "precommit"):
        return "local"
    if (os.environ.get("AF_ALLOW_OWNED_LOCAL") or "").lower() in ("1", "true", "yes"):
        return "local"
    return "none"

_provenance = _provenance_value()
_gate_integrity = {"ci_signed": "PASS", "local": "OWNED", "none": "FAIL"}[_provenance]
payload = {
    "receipt_id": str(uuid.uuid4()),
    "schema": "cicd.receipt.v1",
    "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "context": "scorecard",
    "status": status,
    "provenance": _provenance,
    "gate_integrity": _gate_integrity,
    "run": {
        "command": "scripts/cicd/receipt_chain.sh",
        "exit_code": int(exit_code),
    },
    "signals": [
        {"name": "head_sha", "value": head},
        {"name": "earnings_hash", "value": earnings_hash},
        {"name": "ceremony_tick", "value": ceremony_tick},
        {"name": "scorecard", "value": scorecard},
    ],
    "errors": errors,
    "meta": {"chain": "earnings_receipt_chain"},
}
Path(out).write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
print(out)
PY
}

SCORECARD=""
EARNINGS_HASH=""
VERIFY_EXIT=0
EXPORT_EXIT=0
COMPILE_EXIT=0
HIRE_EXIT=0

if ! SCORECARD="$(_resolve_scorecard)"; then
  echo "receipt_chain: no scorecard found (fail-closed)"
  _write_receipt "FAIL" 1 "" "" '["no scorecard candidate on disk"]'
  exit 1
fi

if [[ -n "${GITHUB_ACTIONS:-}" ]] && [[ -f "$CODE_ROOT/scripts/gates/emit_ci_provenance.sh" ]]; then
  # shellcheck source=scripts/gates/emit_ci_provenance.sh
  source "$CODE_ROOT/scripts/gates/emit_ci_provenance.sh"
fi

echo "=== receipt_chain: verify earnings ($SCORECARD) ==="
set +e
AF_GATE_CONTEXT="${AF_GATE_CONTEXT:-review}" \
  python3 "$CODE_ROOT/scripts/metrics/earnings_engine.py" --scorecard "$SCORECARD" --verify
VERIFY_EXIT=$?
set -e

if [[ $VERIFY_EXIT -ne 0 ]]; then
  echo "receipt_chain: verify BLOCK (exit=$VERIFY_EXIT)"
  _write_receipt "BLOCK" "$VERIFY_EXIT" "$SCORECARD" "" '["earnings_engine --verify failed"]'
  if [[ "$ENFORCE" == "1" ]]; then
    exit "$VERIFY_EXIT"
  fi
  exit 0
fi

echo "=== receipt_chain: export earnings_latest.json (verified ledger only) ==="
set +e
REPO_ROOT="$ROOT" AF_SCORECARD_PATH="$SCORECARD" \
  python3 "$CODE_ROOT/scripts/metrics/earnings_export_json.py" --require-verified
EXPORT_EXIT=$?
set -e
if [[ $EXPORT_EXIT -ne 0 ]]; then
  echo "receipt_chain: export BLOCK (exit=$EXPORT_EXIT)"
  _write_receipt "BLOCK" "$EXPORT_EXIT" "$SCORECARD" "" '["earnings_export_json: no verified ledger entry"]'
  if [[ "$ENFORCE" == "1" ]]; then
    exit "$EXPORT_EXIT"
  fi
  exit 0
fi

EARNINGS_FILE="$ROOT/.goalie/evidence/earnings_latest.json"
if [[ -f "$EARNINGS_FILE" ]]; then
  EARNINGS_HASH="$(python3 -c "import hashlib, pathlib; p=pathlib.Path('$EARNINGS_FILE'); print(hashlib.sha256(p.read_bytes()).hexdigest()[:16])")"
fi

echo "=== receipt_chain: compile profile_readme ==="
set +e
REPO_ROOT="$ROOT" python3 "$CODE_ROOT/scripts/hire/compile_profile_readme.py"
COMPILE_EXIT=$?
set -e
if [[ $COMPILE_EXIT -ne 0 ]]; then
  echo "receipt_chain: compile_profile_readme failed (exit=$COMPILE_EXIT)"
  _write_receipt "BLOCK" "$COMPILE_EXIT" "$SCORECARD" "$EARNINGS_HASH" '["compile_profile_readme failed"]'
  if [[ "$ENFORCE" == "1" ]]; then exit "$COMPILE_EXIT"; fi
  exit 0
fi

_hire_receipt_lines() {
  local log="$1"
  [[ -f "$log" ]] && wc -l < "$log" | tr -d ' ' || echo 0
}


_mock_hire_append() {
  local log="$1"
  mkdir -p "$(dirname "$log")"
  REPO_ROOT="$ROOT" python3 - "$log" <<'PY'
import json, sys, uuid
from datetime import datetime, timezone
from pathlib import Path

log = Path(sys.argv[1])
entry = {
    "receipt_id": str(uuid.uuid4()),
    "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "status_code": 200,
    "endpoint": "earnings/sync",
    "mock": True,
}
log.parent.mkdir(parents=True, exist_ok=True)
with log.open("a", encoding="utf-8") as fh:
    fh.write(json.dumps(entry) + "\n")
PY
}

_hire_can_sync() {
  # Match hire_mcp_client: HIRE_MCP_TOKEN or op read (not shell env pre-check only).
  REPO_ROOT="$ROOT" python3 -c "
import os, sys
sys.path.insert(0, '${CODE_ROOT}')
try:
    from scripts.hire.hire_mcp_client import _resolve_token
    t = _resolve_token()
    sys.exit(0 if t else 1)
except Exception:
    sys.exit(1)
" 2>/dev/null
}

HIRE_RECEIPT_LOG="$ROOT/.goalie/evidence/hire_receipts.jsonl"
REQUIRE_HIRE="${AF_RECEIPT_CHAIN_REQUIRE_HIRE:-0}"

echo "=== receipt_chain: hire sync ==="
if _hire_can_sync; then
  HIRE_LINES_BEFORE="$(_hire_receipt_lines "$HIRE_RECEIPT_LOG")"
  set +e
  REPO_ROOT="$ROOT" python3 "$CODE_ROOT/scripts/hire/sync_earnings_to_hire.py"
  HIRE_EXIT=$?
  set -e
  if [[ $HIRE_EXIT -ne 0 ]]; then
    echo "receipt_chain: hire sync failed (exit=$HIRE_EXIT)"
    _write_receipt "BLOCK" "$HIRE_EXIT" "$SCORECARD" "$EARNINGS_HASH" '["hire sync failed"]'
    if [[ "$ENFORCE" == "1" ]]; then exit "$HIRE_EXIT"; fi
    exit 0
  fi
  HIRE_LINES_AFTER="$(_hire_receipt_lines "$HIRE_RECEIPT_LOG")"
  if [[ "$HIRE_LINES_AFTER" -le "$HIRE_LINES_BEFORE" ]]; then
    echo "receipt_chain: hire receipt missing (hire_receipts.jsonl not appended)"
    _write_receipt "BLOCK" 1 "$SCORECARD" "$EARNINGS_HASH" '["hire_receipts.jsonl not appended after sync"]'
    if [[ "$ENFORCE" == "1" ]]; then exit 1; fi
    exit 0
  fi
  if ! REPO_ROOT="$ROOT" python3 - "$HIRE_RECEIPT_LOG" <<'PY'
import json, sys
from pathlib import Path
log = Path(sys.argv[1])
line = log.read_text(encoding="utf-8").strip().splitlines()[-1]
entry = json.loads(line)
for key in ("receipt_id", "timestamp", "status_code", "endpoint"):
    if key not in entry or not str(entry.get(key, "")).strip():
        raise SystemExit(f"missing or empty: {key}")
PY
  then
    echo "receipt_chain: hire receipt invalid (missing receipt_id/timestamp/status_code)"
    _write_receipt "BLOCK" 1 "$SCORECARD" "$EARNINGS_HASH" '["hire_receipts.jsonl entry invalid"]'
    if [[ "$ENFORCE" == "1" ]]; then exit 1; fi
    exit 0
  fi
elif [[ "${AF_RECEIPT_CHAIN_MOCK_HIRE:-0}" == "1" ]]; then
  HIRE_LINES_BEFORE="$(_hire_receipt_lines "$HIRE_RECEIPT_LOG")"
  _mock_hire_append "$HIRE_RECEIPT_LOG"
  HIRE_LINES_AFTER="$(_hire_receipt_lines "$HIRE_RECEIPT_LOG")"
  if [[ "$HIRE_LINES_AFTER" -le "$HIRE_LINES_BEFORE" ]]; then
    echo "receipt_chain: mock hire receipt missing"
    _write_receipt "BLOCK" 1 "$SCORECARD" "$EARNINGS_HASH" '["mock hire_receipts.jsonl not appended"]'
    if [[ "$ENFORCE" == "1" ]]; then exit 1; fi
    exit 0
  fi
  if ! REPO_ROOT="$ROOT" python3 - "$HIRE_RECEIPT_LOG" <<'PY'
import json, sys
from pathlib import Path
log = Path(sys.argv[1])
line = log.read_text(encoding="utf-8").strip().splitlines()[-1]
entry = json.loads(line)
for key in ("receipt_id", "timestamp", "status_code", "endpoint"):
    if key not in entry or not str(entry.get(key, "")).strip():
        raise SystemExit(f"missing or empty: {key}")
PY
  then
    echo "receipt_chain: mock hire receipt invalid (F9 fields)"
    _write_receipt "BLOCK" 1 "$SCORECARD" "$EARNINGS_HASH" '["mock hire_receipts.jsonl entry invalid"]'
    if [[ "$ENFORCE" == "1" ]]; then exit 1; fi
    exit 0
  fi
elif [[ "${AF_RECEIPT_CHAIN_ALLOW_DRY_HIRE:-0}" == "1" ]]; then
  set +e
  REPO_ROOT="$ROOT" python3 "$CODE_ROOT/scripts/hire/sync_earnings_to_hire.py" --dry-run
  HIRE_EXIT=$?
  set -e
  [[ $HIRE_EXIT -ne 0 ]] && echo "WARN: hire dry-run failed"
else
  echo "receipt_chain: SKIP hire (no MCP token via env or op; set AF_RECEIPT_CHAIN_ALLOW_DRY_HIRE=1 to dry-run)"
  if [[ "$REQUIRE_HIRE" == "1" && "$ENFORCE" == "1" ]]; then
    _write_receipt "BLOCK" 1 "$SCORECARD" "$EARNINGS_HASH" '["hire sync required but no MCP token"]'
    exit 1
  fi
fi

RECEIPT_OUT="$(_write_receipt "PASS" 0 "$SCORECARD" "$EARNINGS_HASH" "[]")"
echo "receipt_chain: wrote $RECEIPT_OUT"
if [[ -x "$CODE_ROOT/scripts/cicd/intel_pipeline_tick.sh" ]]; then
  _intel_enforce="${AF_INTEL_PIPELINE_ENFORCE:-0}"
  if [[ "$ENFORCE" == "1" ]]; then
    _intel_enforce=1
  fi
  AF_INTEL_PIPELINE_ENFORCE="$_intel_enforce" REPO_ROOT="$ROOT" bash "$CODE_ROOT/scripts/cicd/intel_pipeline_tick.sh" || {
    echo "BLOCK: intel_pipeline post-receipt failed"
    if [[ "$_intel_enforce" == "1" ]]; then exit 1; fi
  }
fi
if [[ -f "$CODE_ROOT/scripts/cicd/weight_eft_gate.py" ]]; then
  REPO_ROOT="$ROOT" python3 "$CODE_ROOT/scripts/cicd/weight_eft_gate.py" || {
    echo "BLOCK: weight_eft_gate failed"
    [[ "${AF_WEIGHT_EFT_ENFORCE:-0}" == "1" ]] && exit 1
  }
fi
exit 0
