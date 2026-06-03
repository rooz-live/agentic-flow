#!/usr/bin/env bash
set -euo pipefail
cd "./../.."
export REPO_ROOT="/Users/shahroozbhopti/Documents/code"
ITEM="P1-INDEX-01"
echo "Loop tick:  -> wave_autopilot"
bash scripts/cicd/wave_autopilot.sh || true
echo "AGENT_LOOP_TICK_CLS {"item":""}"
