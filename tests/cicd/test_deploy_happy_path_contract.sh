#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
grep -q 'AF_TLD_GATE_WAIT' scripts/deploy/trigger_tld_gate_ci.sh || { echo 'FAIL: missing AF_TLD_GATE_WAIT default'; exit 1; }
grep -q 'SWARM_TIMEOUT' scripts/cicd/deploy_happy_path.sh || { echo "FAIL: missing swarm timeout"; exit 1; }
grep -q 'LIGHT mode is swarm-only' scripts/cicd/deploy_happy_path.sh || { echo "FAIL: missing LIGHT deploy guard"; exit 1; }
grep -q 'timeout "${SWARM_TIMEOUT}s" bash' scripts/cicd/deploy_happy_path.sh || { echo "FAIL: wave_autopilot not wrapped in timeout"; exit 1; }
bash -n scripts/cicd/deploy_happy_path.sh
echo "PASS deploy_happy_path contract"
