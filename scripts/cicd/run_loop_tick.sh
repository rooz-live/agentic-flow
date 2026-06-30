#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
export REPO_ROOT="$PWD"
source "$REPO_ROOT/scripts/cicd/lib/cls_common.sh"
cls_load_wave_retry_max
cls_enforce_session_tick_budget || exit $?
cls_require_trust_green || exit 1
cls_warn_session_tick_budget
if [[ -z "${LOOP_ITEM:-}" ]]; then
  LOOP_ITEM="$(python3 "$REPO_ROOT/scripts/metrics/pace_from_lnnnl.py" --loop-item 2>/dev/null || true)"
fi
ITEM="${LOOP_ITEM:-P1-INDEX-01}"
echo "Loop tick: $ITEM (LOOP_TICK_COUNT=${LOOP_TICK_COUNT:-0}, WAVE_RETRY_MAX=$WAVE_RETRY_MAX)"
bash "$REPO_ROOT/scripts/cicd/tick_prep_hooks.sh"
bash scripts/cicd/session_rehydration_reader.sh --emit 2>/dev/null || true
TICK_EXIT=0
_record_tick_exit() {
  local ec=$1
  if [[ "$ec" -ne 0 && "$TICK_EXIT" -eq 0 ]]; then
    TICK_EXIT="$ec"
  fi
}
set +e
case "$ITEM" in
  P1-INDEX-01) bash scripts/cicd/wave_autopilot.sh; _record_tick_exit $? ;;
  P1-INDEX-02)
    bash scripts/cicd/index_slice_substrate.sh; _record_tick_exit $?
    bash scripts/cicd/wave_autopilot.sh; _record_tick_exit $?
    ;;
  P1-ADB-01)
    bash scripts/governance/agentdb_freshness.sh; _record_tick_exit $?
    python3 scripts/governance/compliance_as_code.py --cog --scope=governance || true
    mkdir -p docs/research
    python3 - <<'PYADB' || true
import glob, os, time
from pathlib import Path
root = Path(os.environ["REPO_ROOT"])
bits = sorted(glob.glob(str(root / ".goalie/evidence/compliance/compliance_cog_governance_*.json")), reverse=True)
out = root / "docs/research/bit_P1-ADB-01.md"
out.write_text(
    "# P1-ADB-01 — AgentDB freshness + governance compliance\n\n"
    f"Generated: {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}\n\n"
    f"- compliance: {bits[0] if bits else 'none'}\n",
    encoding="utf-8",
)
print(f"wrote {out}")
PYADB
    bash scripts/cicd/wave_autopilot.sh
    ;;
  *) bash scripts/cicd/wave_autopilot.sh; _record_tick_exit $? ;;
esac
set -e
export TICK_EXIT
bash scripts/cicd/write_tick_rehydration_manifest.sh
echo "AGENT_LOOP_TICK_CLS {\"item\":\"$ITEM\",\"tick_count\":${LOOP_TICK_COUNT:-0},\"tick_exit\":$TICK_EXIT}"

# Pace-gated AQE/upstream + inbox timescape (CoD-weighted; non-blocking unless AF_CORRELATE_ENFORCE=1)
export AF_LNNNL_ENFORCE="${AF_LNNNL_ENFORCE:-1}"
export AF_TICK_POST_ENFORCE="${AF_TICK_POST_ENFORCE:-1}"
export AF_LNNNL_STALE_ENFORCE="${AF_LNNNL_STALE_ENFORCE:-1}"
export AF_ALLOW_OP_READ="${AF_ALLOW_OP_READ:-0}"
if [[ -x "$REPO_ROOT/scripts/cicd/tick_post_hooks.sh" ]]; then
  set +e
  bash "$REPO_ROOT/scripts/cicd/tick_post_hooks.sh"
  POST_EXIT=$?
  set -e
  if [[ $POST_EXIT -ne 0 ]]; then
    echo "tick_post_hooks exited $POST_EXIT; propagating to TICK_EXIT"
    TICK_EXIT=$POST_EXIT
  fi
fi

exit "$TICK_EXIT"
