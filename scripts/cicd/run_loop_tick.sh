#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
export REPO_ROOT="$PWD"
source "$REPO_ROOT/scripts/cicd/lib/cls_common.sh"
cls_load_wave_retry_max
cls_warn_session_tick_budget
ITEM="${LOOP_ITEM:-P1-INDEX-01}"
echo "Loop tick: $ITEM (LOOP_TICK_COUNT=${LOOP_TICK_COUNT:-0}, WAVE_RETRY_MAX=$WAVE_RETRY_MAX)"
case "$ITEM" in
  P1-INDEX-01) bash scripts/cicd/wave_autopilot.sh ;;
  P1-INDEX-02)
    bash scripts/cicd/index_slice_substrate.sh
    bash scripts/cicd/wave_autopilot.sh
    ;;
  *) bash scripts/cicd/wave_autopilot.sh ;;
esac
echo "AGENT_LOOP_TICK_CLS {\"item\":\"$ITEM\",\"tick_count\":${LOOP_TICK_COUNT:-0}}"
