#!/usr/bin/env bash
# @business-context WSJF: Feature flag OFF blocks readiness; ON requires schema keys
# test-feature-flag-readiness.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

export READINESS_API_ENABLED=false
set +e
OUT=$(READINESS_API_ENABLED=false "$BASE_DIR/scripts/readiness-api-guard.sh" --json --file "$BASE_DIR/tests/fixtures/minimal-pass-email.txt" 2>&1)
RC=$?
set -e

if [[ "$RC" -ne 147 ]]; then
  echo "❌ FAIL: expected exit 147 when READINESS_API_ENABLED=false, got $RC" >&2
  exit 1
fi
if ! echo "$OUT" | grep -qE '"code"[[:space:]]*:[[:space:]]*403'; then
  echo "❌ FAIL: expected 403 in JSON body, got: $OUT" >&2
  exit 1
fi

export READINESS_API_ENABLED=true
export SKIP_SEMANTIC_VALIDATION=true
JSON=$("$BASE_DIR/scripts/readiness-api-guard.sh" --json --file "$BASE_DIR/tests/fixtures/minimal-pass-email.txt" 2>/dev/null) || true
if ! echo "$JSON" | python3 -c 'import json,sys; json.loads(sys.stdin.read()); print("ok")' 2>/dev/null; then
  echo "❌ FAIL: invalid JSON when flag ON" >&2
  exit 1
fi

echo "✅ feature-flag readiness tests OK"
