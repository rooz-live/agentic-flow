#!/usr/bin/env bash
# F4: trap/on_exit bundle must reflect policy_snapshot, not pre-policy lnnnl tick.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$TMP/.goalie/evidence"
echo '{"pace_source":"lnnnl","pace_cod_weight":0.5}' >"$TMP/.goalie/evidence/tick_post_latest.json"
cat >"$TMP/.goalie/evidence/tick_cycle_policy_latest.json" <<'JSON'
{"pace_cod_weight":1.5,"utilize_mode":"deferrable","blocker_pace_cod_weight":2.0}
JSON

BUNDLE="$(python3 "$ROOT/scripts/cicd/lib/reconcile_tick_post_pace.py" "$TMP" --bundle-json)"
PACE="$(python3 -c "import json,sys; print(json.load(sys.stdin)['pace_cod_weight'])" <<<"$BUNDLE")"
SRC="$(python3 -c "import json,sys; print(json.load(sys.stdin)['pace_source'])" <<<"$BUNDLE")"
BLOCKER="$(python3 -c "import json,sys; print(json.load(sys.stdin)['blocker_pace_cod_weight'])" <<<"$BUNDLE")"

[[ "$PACE" == "1.5" ]] || { echo "FAIL: pace=$PACE want 1.5"; exit 1; }
[[ "$SRC" == "policy_snapshot" ]] || { echo "FAIL: pace_source=$SRC want policy_snapshot"; exit 1; }
[[ "$BLOCKER" == "2.0" ]] || { echo "FAIL: blocker_pace=$BLOCKER want 2.0"; exit 1; }

echo "PASS tick_post_trap_pace_order"
