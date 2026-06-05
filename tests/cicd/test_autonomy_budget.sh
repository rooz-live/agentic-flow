#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
fail() { echo "FAIL: $*"; exit 1; }

PROMPTS="$ROOT/config/cicd/loop_prompts.yaml"
AUTOPILOT="$ROOT/scripts/cicd/wave_autopilot.sh"
COMMON="$ROOT/scripts/cicd/lib/cls_common.sh"

[[ -f "$PROMPTS" ]] || fail "missing loop_prompts.yaml"
[[ -x "$AUTOPILOT" ]] || fail "missing wave_autopilot.sh"
[[ -f "$COMMON" ]] || fail "missing cls_common.sh"

python3 - "$PROMPTS" <<'PY'
import sys, yaml
path = sys.argv[1]
cfg = yaml.safe_load(open(path))
b = cfg.get("budget")
if not b:
    raise SystemExit("missing budget block")
required = [
    "max_remediate_retries",
    "max_index_paths_per_tick",
    "auto_commit",
    "stop_on_roam_critical",
    "session",
    "program",
]
for k in required:
    if k not in b:
        raise SystemExit(f"missing budget.{k}")
for k in (
    "min_ticks",
    "sweet_spot_ticks",
    "max_ticks_before_reset",
    "max_ticks_per_session",
    "summarize_after_tick",
):
    if k not in b["session"]:
        raise SystemExit(f"missing budget.session.{k}")
for k in ("pi_slice_ticks", "max_ticks_before_ceremony", "horizon_cap_ticks"):
    if k not in b["program"]:
        raise SystemExit(f"missing budget.program.{k}")
if b["max_remediate_retries"] != 2:
    raise SystemExit(f"max_remediate_retries must be 2, got {b['max_remediate_retries']}")
if b["auto_commit"] is not False:
    raise SystemExit("budget.auto_commit must be false")
if b["stop_on_roam_critical"] != ["R01", "R04"]:
    raise SystemExit("stop_on_roam_critical must be [R01, R04]")
print("PASS budget schema")
PY

grep -q 'cls_refuse_auto_commit_on_main' "$AUTOPILOT" || fail "wave_autopilot missing main-branch auto_commit guard"

set +e
REPO_ROOT="$ROOT" CLS_AUTO_COMMIT=1 CLS_BRANCH_OVERRIDE=main bash -c '
  source "'"$COMMON"'"
  cls_refuse_auto_commit_on_main
' >/dev/null 2>&1
ec=$?
set -e
[[ $ec -ne 0 ]] || fail "CLS_AUTO_COMMIT=1 on main must exit non-zero"

loaded="$(REPO_ROOT="$ROOT" bash -c 'source "'"$COMMON"'"; cls_load_wave_retry_max; echo "$WAVE_RETRY_MAX"')"
[[ "$loaded" == "2" ]] || fail "WAVE_RETRY_MAX from yaml must default to 2, got: $loaded"

echo "PASS autonomy_budget"

READER="$ROOT/scripts/cicd/session_rehydration_reader.sh"
WRITER="$ROOT/scripts/cicd/write_tick_rehydration_manifest.sh"
[[ -x "$READER" ]] || fail "missing session_rehydration_reader.sh"
[[ -x "$WRITER" ]] || fail "missing write_tick_rehydration_manifest.sh"

python3 - "$PROMPTS" <<'PYRH'
import sys, yaml
cfg = yaml.safe_load(open(sys.argv[1]))
r = (cfg.get("budget") or {}).get("rehydration")
if not r:
    raise SystemExit("missing budget.rehydration (BT-9)")
for k in ("breakthrough_id", "schema", "writer", "reader"):
    if k not in r:
        raise SystemExit(f"missing budget.rehydration.{k}")
if r["breakthrough_id"] != "BT-9":
    raise SystemExit("breakthrough_id must be BT-9")
if r["schema"] != "cls.rehydration.v1":
    raise SystemExit("schema must be cls.rehydration.v1")
print("PASS rehydration budget block")
PYRH

out=$(REPO_ROOT="$ROOT" bash "$READER" --emit)
echo "$out" | grep -q AGENT_LOOP_WAKE_CLS || fail "reader must emit AGENT_LOOP_WAKE_CLS"

grep -q 'cls_session_reset_callback' "$COMMON" || fail "cls_common missing session reset callback"
grep -q 'sweet_spot_ticks' "$COMMON" || fail "cls_common missing sweet_spot warn"

echo "PASS autonomy_budget_rehydration_bridge"
