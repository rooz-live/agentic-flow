#!/usr/bin/env bash
# Dry-run receipt chain with fake scorecard (verify may BLOCK — receipt still written).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CHAIN="$ROOT/scripts/cicd/receipt_chain.sh"
test -x "$CHAIN"
bash -n "$CHAIN"
bash -n "$ROOT/scripts/cicd/tick_post_hooks.sh"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
FAKE="$TMP/coherence_results.json"
cat > "$FAKE" <<'JSON'
{"decision":"BLOCK","sign_off":false,"gates":{},"impact":{}}
JSON

REPO_ROOT="$ROOT" AF_RECEIPT_CHAIN_ENFORCE=0 bash -c "
  cp '$FAKE' '$ROOT/coherence_results.json.bak_receipt_test' 2>/dev/null || true
" 

# Run with temp scorecard via coherence path override
export REPO_ROOT="$ROOT"
export AF_RECEIPT_CHAIN_ENFORCE=0
# Use .goalie/scorecards if coherence missing
mkdir -p "$ROOT/.goalie/scorecards"
cp "$FAKE" "$ROOT/.goalie/scorecards/latest.json"

bash "$CHAIN" || true
test -d "$ROOT/.goalie/evidence/receipts"
ls "$ROOT/.goalie/evidence/receipts"/tick_*.json >/dev/null 2>&1 || {
  echo "FAIL: no tick receipt written"; exit 1
}
echo "PASS receipt_chain dry-run"
