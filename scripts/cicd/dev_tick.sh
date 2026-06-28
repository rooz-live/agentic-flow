#!/usr/bin/env bash
# dev_tick.sh — dynamic LOOP_ITEM from rehydration/LNNNL + fast contracts + tick + scorecard
set -euo pipefail
cd "$(dirname "$0")/../.."
export REPO_ROOT="$PWD"
source "$REPO_ROOT/scripts/cicd/lib/cls_common.sh"

lnnnl_to_loop_item() {
  local now="${1:-}"
  case "$now" in
    *R-CLS-05*|*substrate*) echo "P1-INDEX-02" ;;
    *R-MAIL*|*mail*) echo "P1-INDEX-01" ;;
    *ADB*|*agentdb*) echo "P1-ADB-01" ;;
    *) echo "P1-INDEX-02" ;;
  esac
}

resolve_loop_item() {
  local lat="$REPO_ROOT/.goalie/evidence/learning/rehydration_latest.json"
  local head
  head="$(cls_head_sha)"
  if [[ -f "$lat" ]]; then
    python3 - "$lat" "$head" <<'PY'
import json, sys
from pathlib import Path
lat, head = Path(sys.argv[1]), sys.argv[2]
meta = json.loads(lat.read_text())
doc_path = meta.get("path")
item = None
if doc_path and Path(doc_path).is_file():
    doc = json.loads(Path(doc_path).read_text())
    if doc.get("head_sha", "")[:12] == head[:12]:
        item = doc.get("loop_item")
if item:
    print(item)
PY
    return
  fi
  if [[ -f "$REPO_ROOT/.goalie/LNNNL.yaml" ]]; then
    python3 - "$REPO_ROOT/.goalie/LNNNL.yaml" <<'PY'
import sys, yaml
doc = yaml.safe_load(open(sys.argv[1])) or {}
lanes = doc.get("lanes") or {}
ship = lanes.get("shippable") or {}
now = ship.get("now") or (doc.get("schedule") or {}).get("now") or ""
print(now)
PY
  fi
}

if [[ -z "${LOOP_ITEM:-}" ]]; then
  RESOLVED="$(resolve_loop_item 2>/dev/null || true)"
  if [[ -n "$RESOLVED" && "$RESOLVED" == P1-* ]]; then
    export LOOP_ITEM="$RESOLVED"
  elif [[ -n "$RESOLVED" ]]; then
    export LOOP_ITEM="$(lnnnl_to_loop_item "$RESOLVED")"
  else
    export LOOP_ITEM="P1-INDEX-02"
  fi
fi

if [[ -z "${LOOP_TICK_COUNT:-}" ]]; then
  lat="$REPO_ROOT/.goalie/evidence/learning/rehydration_latest.json"
  if [[ -f "$lat" ]]; then
    export LOOP_TICK_COUNT="$(python3 - "$lat" <<'PY'
import json, sys
from pathlib import Path
meta = json.loads(Path(sys.argv[1]).read_text())
p = meta.get("path")
if p and Path(p).is_file():
    doc = json.loads(Path(p).read_text())
    print(int(doc.get("loop_tick_count", 0)) + 1)
else:
    print(int(meta.get("loop_tick_count", 0)) + 1)
PY
)"
  else
    export LOOP_TICK_COUNT=1
  fi
fi

echo "dev_tick: LOOP_ITEM=$LOOP_ITEM LOOP_TICK_COUNT=$LOOP_TICK_COUNT"

for t in test_cls_manifest_canonical test_autonomy_budget test_wsjf_closure_scorecard; do
  f="$REPO_ROOT/tests/cicd/${t}.sh"
  if [[ -x "$f" ]]; then
    bash "$f"
  fi
done

bash "$REPO_ROOT/scripts/cicd/run_loop_tick.sh"
TICK_EXIT=$?

python3 "$REPO_ROOT/scripts/cicd/wsjf_closure_scorecard.py" --root "$REPO_ROOT" --loop-item "$LOOP_ITEM"
export TICK_EXIT
bash "$REPO_ROOT/scripts/cicd/write_tick_rehydration_manifest.sh" >/dev/null

# run_loop_tick.sh invokes tick_post_hooks.sh which owns the single WSJF refresh before upstream.
# pi_plan_sync.sh (called from tick_post_hooks.sh) refreshes ROAM trackers on ceremony ticks.
# Do not run additional WSJF updates here.
exit "$TICK_EXIT"
