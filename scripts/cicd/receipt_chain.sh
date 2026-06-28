#!/usr/bin/env bash
# Bounded post-tick earnings → hire receipt chain (fail-closed on verify).
set -euo pipefail
ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$ROOT"

ENFORCE="${AF_RECEIPT_CHAIN_ENFORCE:-1}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
RECEIPT_DIR="$ROOT/.goalie/evidence/receipts"
RECEIPT_PATH="$RECEIPT_DIR/tick_${TS}.json"
mkdir -p "$RECEIPT_DIR"

HEAD_SHA="$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || echo unknown)"
CEREMONY_TICK="${LOOP_TICK_COUNT:-0}"

_resolve_scorecard() {
  python3 "$ROOT/scripts/metrics/scorecard_resolver.py" --resolve-path 2>/dev/null || return 1
}

_write_receipt() {
  local status="$1"
  local exit_code="$2"
  local scorecard="${3:-}"
  local earnings_hash="${4:-}"
  local errors_json="${5:-[]}"
  python3 - "$RECEIPT_PATH" "$status" "$exit_code" "$HEAD_SHA" "$earnings_hash" "$CEREMONY_TICK" "$scorecard" "$errors_json" <<'PY'
import json, sys, uuid
from datetime import datetime, timezone
from pathlib import Path

out, status, exit_code, head, earnings_hash, ceremony_tick, scorecard, errors_json = sys.argv[1:9]
errors = json.loads(errors_json) if errors_json else []
payload = {
    "receipt_id": str(uuid.uuid4()),
    "schema": "cicd.receipt.v1",
    "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "context": "scorecard",
    "status": status,
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
  echo "receipt_chain: no scorecard found"
  _write_receipt "SKIP" 0 "" "" '["no scorecard candidate on disk"]'
  if [[ "$ENFORCE" == "1" ]]; then
    exit 1
  fi
  exit 0
fi

echo "=== receipt_chain: verify earnings ($SCORECARD) ==="
set +e
AF_GATE_CONTEXT="${AF_GATE_CONTEXT:-review}" \
  python3 "$ROOT/scripts/metrics/earnings_engine.py" --scorecard "$SCORECARD" --verify
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
  python3 "$ROOT/scripts/metrics/earnings_export_json.py" --require-verified
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
python3 "$ROOT/scripts/hire/compile_profile_readme.py"
COMPILE_EXIT=$?
set -e
if [[ $COMPILE_EXIT -ne 0 ]]; then
  echo "receipt_chain: compile_profile_readme failed (exit=$COMPILE_EXIT)"
  _write_receipt "BLOCK" "$COMPILE_EXIT" "$SCORECARD" "$EARNINGS_HASH" '["compile_profile_readme failed"]'
  if [[ "$ENFORCE" == "1" ]]; then exit "$COMPILE_EXIT"; fi
  exit 0
fi

echo "=== receipt_chain: hire sync ==="
if [[ -n "${HIRE_MCP_TOKEN:-}" ]]; then
  set +e
  python3 "$ROOT/scripts/hire/sync_earnings_to_hire.py"
  HIRE_EXIT=$?
  set -e
  if [[ $HIRE_EXIT -ne 0 ]]; then
    echo "receipt_chain: hire sync failed (exit=$HIRE_EXIT)"
    _write_receipt "BLOCK" "$HIRE_EXIT" "$SCORECARD" "$EARNINGS_HASH" '["hire sync failed"]'
    if [[ "$ENFORCE" == "1" ]]; then exit "$HIRE_EXIT"; fi
    exit 0
  fi
elif [[ "${AF_RECEIPT_CHAIN_ALLOW_DRY_HIRE:-0}" == "1" ]]; then
  set +e
  python3 "$ROOT/scripts/hire/sync_earnings_to_hire.py" --dry-run
  HIRE_EXIT=$?
  set -e
  [[ $HIRE_EXIT -ne 0 ]] && echo "WARN: hire dry-run failed"
else
  echo "receipt_chain: SKIP hire (no HIRE_MCP_TOKEN; set AF_RECEIPT_CHAIN_ALLOW_DRY_HIRE=1 to dry-run)"
  if [[ "$ENFORCE" == "1" ]]; then
    _write_receipt "BLOCK" 1 "$SCORECARD" "$EARNINGS_HASH" '["hire sync skipped: HIRE_MCP_TOKEN unset"]'
    exit 1
  fi
fi

RECEIPT_OUT="$(_write_receipt "PASS" 0 "$SCORECARD" "$EARNINGS_HASH" "[]")"
echo "receipt_chain: wrote $RECEIPT_OUT"
exit 0
