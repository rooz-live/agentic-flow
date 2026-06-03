#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
export REPO_ROOT="$PWD"
ITEM="${LOOP_ITEM:-P1-INDEX-01}"
echo "Loop tick: $ITEM"
case "$ITEM" in
  P1-INDEX-01) bash scripts/cicd/wave_autopilot.sh ;;
  P1-INDEX-02)
    bash scripts/cicd/index_slice_substrate.sh
    bash scripts/cicd/wave_autopilot.sh
    ;;
  *) bash scripts/cicd/wave_autopilot.sh ;;
esac
echo "AGENT_LOOP_TICK_CLS {\"item\":\"$ITEM\"}"
