#!/usr/bin/env bash
# Dry-run receipt chain — receipt written; resolver uses scorecard shape only.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CHAIN="$ROOT/scripts/cicd/receipt_chain.sh"
test -x "$CHAIN"
bash -n "$CHAIN"
bash -n "$ROOT/scripts/cicd/tick_post_hooks.sh"

mkdir -p "$ROOT/.goalie/scorecards"
cat > "$ROOT/.goalie/scorecards/current.json.bak_receipt_test" <<'JSON'
{"originality":{"improbability":1,"resonance":1,"new_relationship":"receipt test"},"impact":{"baseline_value":1,"reward_direction":1,"cod_weight":1,"blast_radius":1},"gates":{"coherence":"PASS","gate_integrity":"PASS"}}
JSON
cp "$ROOT/.goalie/scorecards/current.json.bak_receipt_test" "$ROOT/.goalie/scorecards/current.json"

export REPO_ROOT="$ROOT"
export AF_RECEIPT_CHAIN_ENFORCE=0
export AF_RECEIPT_CHAIN_ALLOW_DRY_HIRE=1

bash "$CHAIN" || true
test -d "$ROOT/.goalie/evidence/receipts"
ls "$ROOT/.goalie/evidence/receipts"/tick_*.json >/dev/null 2>&1 || {
  echo "FAIL: no tick receipt written"; exit 1
}
python3 "$ROOT/scripts/metrics/scorecard_resolver.py" --resolve-path | grep -q current.json
echo "PASS receipt_chain dry-run"
