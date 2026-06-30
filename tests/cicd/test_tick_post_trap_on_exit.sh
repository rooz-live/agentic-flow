#!/usr/bin/env bash
# WSJF-2: on_exit path must persist policy_snapshot (not pre-policy lnnnl pace).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$TMP/.goalie/evidence"
export REPO_ROOT="$TMP"
export EVIDENCE_DIR="$TMP/.goalie/evidence"
export TICK_POST_EVIDENCE="$EVIDENCE_DIR/tick_post_latest.json"

# Early trap capture would see stale lnnnl pace; policy written later must win.
echo '{"pace_source":"lnnnl","pace_cod_weight":0.5}' >"$TICK_POST_EVIDENCE"
cat >"$EVIDENCE_DIR/tick_cycle_policy_latest.json" <<'JSON'
{"pace_cod_weight":1.5,"utilize_mode":"deferrable","blocker_pace_cod_weight":2.0}
JSON

BUNDLE="$(python3 "$ROOT/scripts/cicd/lib/reconcile_tick_post_pace.py" "$TMP" --bundle-json)"
python3 - "$TICK_POST_EVIDENCE" "0" "0" "$BUNDLE" <<'PY'
import json, sys
from datetime import datetime, timezone
path, export_ok, lnnnl_exit, bundle_raw = sys.argv[1:5]
bundle = json.loads(bundle_raw)
payload = {
    "schema": "tick_post.v2",
    "at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "env_export_ok": bool(int(export_ok)),
    "lnnnl_exit": int(lnnnl_exit),
    "pace_cod_weight": bundle.get("pace_cod_weight"),
    "blocker_pace_cod_weight": bundle.get("blocker_pace_cod_weight"),
    "pace_source": bundle.get("pace_source", "unknown"),
    "utilize_mode_hint": bundle.get("utilize_mode_hint"),
}
open(path, "w", encoding="utf-8").write(json.dumps(payload, indent=2) + "\n")
PY

SRC="$(python3 -c "import json; print(json.load(open('$TICK_POST_EVIDENCE'))['pace_source'])")"
PACE="$(python3 -c "import json; print(json.load(open('$TICK_POST_EVIDENCE'))['pace_cod_weight'])")"
[[ "$SRC" == "policy_snapshot" ]] || { echo "FAIL: pace_source=$SRC"; exit 1; }
[[ "$PACE" == "1.5" ]] || { echo "FAIL: pace=$PACE"; exit 1; }

unset REPO_ROOT
echo "PASS tick_post_trap_on_exit"
