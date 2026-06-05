#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
export REPO_ROOT="$PWD"
source "$REPO_ROOT/scripts/cicd/lib/cls_common.sh"
cls_load_wave_retry_max
cls_warn_session_tick_budget
ITEM="${LOOP_ITEM:-P1-INDEX-01}"
echo "Loop tick: $ITEM (LOOP_TICK_COUNT=${LOOP_TICK_COUNT:-0}, WAVE_RETRY_MAX=$WAVE_RETRY_MAX)"
bash scripts/cicd/session_rehydration_reader.sh --emit 2>/dev/null || true
TICK_EXIT=0
set +e
case "$ITEM" in
  P1-INDEX-01) bash scripts/cicd/wave_autopilot.sh ;;
  P1-INDEX-02)
    bash scripts/cicd/index_slice_substrate.sh
    bash scripts/cicd/wave_autopilot.sh
    ;;
  P1-ADB-01)
    bash scripts/governance/agentdb_freshness.sh || TICK_EXIT=$?
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
  *) bash scripts/cicd/wave_autopilot.sh ;;
esac
TICK_EXIT=$?
set -e
export TICK_EXIT
bash scripts/cicd/write_tick_rehydration_manifest.sh
echo "AGENT_LOOP_TICK_CLS {\"item\":\"$ITEM\",\"tick_count\":${LOOP_TICK_COUNT:-0},\"tick_exit\":$TICK_EXIT}"
exit "$TICK_EXIT"
