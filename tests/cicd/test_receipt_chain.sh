#!/usr/bin/env bash
# MPP receipt chain contract — isolated DATA_ROOT; scripts from CODE_ROOT.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CHAIN="$ROOT/scripts/cicd/receipt_chain.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

test -x "$CHAIN"
bash -n "$CHAIN"
bash -n "$ROOT/scripts/cicd/tick_post_hooks.sh"

mkdir -p "$TMP/.goalie/scorecards" "$TMP/.goalie/evidence"
git -C "$TMP" init -q
git -C "$TMP" config user.email "receipt-test@agentic-flow.local"
git -C "$TMP" config user.name "receipt-test"
echo "# receipt contract" > "$TMP/profile_readme.md"
git -C "$TMP" add -A
git -C "$TMP" commit -q -m "init"

cat > "$TMP/.goalie/scorecards/current.json" <<'JSON'
{"originality":{"improbability":2,"resonance":2,"new_relationship":true,"coherence":"PASS"},"impact":{"baseline_value":2,"reward_direction":1,"gate_integrity":"OWNED","tail_risks":[{"name":"contract","disposition":"Mitigated","penalty":1}],"cod_weight":1,"blast_radius":1,"reversibility":1,"sign_off":false}}
JSON
cat > "$TMP/.goalie/scorecards/verify_signals.json" <<'JSON'
{"signals":[{"name":"noop","cmd":["true"],"required":true}]}
JSON

export REPO_ROOT="$TMP"
export AF_RECEIPT_CHAIN_ENFORCE=0
export AF_RECEIPT_CHAIN_MOCK_HIRE=1
export AF_SKIP_OP_READ=1
export AF_GATE_CONTEXT=review
export AF_ALLOW_OWNED_LOCAL=1
export CI=false
export GITHUB_ACTIONS=
export AF_VERIFY_SIGNALS="$TMP/.goalie/scorecards/verify_signals.json"

bash "$CHAIN"

REPO_ROOT="$TMP" python3 "$ROOT/scripts/metrics/scorecard_resolver.py" --resolve-path | grep -q 'scorecards/current.json'
test -f "$TMP/.goalie/earnings_ledger.jsonl"
test -f "$TMP/.goalie/evidence/earnings_latest.json"

RECEIPT="$(ls -t "$TMP/.goalie/evidence/receipts"/tick_*.json | head -1)"
STATUS="$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['status'])" "$RECEIPT")"
[[ "$STATUS" == "PASS" ]] || { echo "FAIL: expected PASS receipt, got $STATUS"; exit 1; }

HIRE_LOG="$TMP/.goalie/evidence/hire_receipts.jsonl"
test -f "$HIRE_LOG" || { echo "FAIL: chain must append hire_receipts.jsonl (F9)"; exit 1; }
REPO_ROOT="$TMP" python3 - "$HIRE_LOG" <<'PY'
import json, sys
from pathlib import Path
log = Path(sys.argv[1])
entry = json.loads(log.read_text(encoding="utf-8").strip().splitlines()[-1])
for key in ("receipt_id", "timestamp", "status_code", "endpoint"):
    if key not in entry or not str(entry.get(key, "")).strip():
        raise SystemExit(f"missing or empty: {key}")
print("OK hire receipt schema (chain)")
PY

unset REPO_ROOT

echo "PASS receipt_chain mpp"
