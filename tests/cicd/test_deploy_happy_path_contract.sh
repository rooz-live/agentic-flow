#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
grep -q 'AF_TLD_GATE_WAIT' scripts/deploy/trigger_tld_gate_ci.sh || { echo 'FAIL: missing AF_TLD_GATE_WAIT default'; exit 1; }
grep -q 'AF_TLD_GATE_REQUIRE_WAIT' scripts/deploy/trigger_tld_gate_ci.sh || { echo 'FAIL: missing AF_TLD_GATE_REQUIRE_WAIT'; exit 1; }
grep -q 'must be 1' scripts/deploy/trigger_tld_gate_ci.sh || { echo 'FAIL: missing hard WAIT=1 enforcement'; exit 1; }
grep -q 'gate still pending' scripts/deploy/trigger_tld_gate_ci.sh || { echo 'FAIL: missing pending fail-closed'; exit 1; }
grep -q 'resolve_run_id' scripts/deploy/trigger_tld_gate_ci.sh || { echo 'FAIL: missing dispatch run binding'; exit 1; }
grep -q 'CURL_EC' scripts/deploy/deploy-uapi.sh || { echo 'FAIL: missing curl exit check in deploy-uapi'; exit 1; }
grep -q 'tld_gate_github_run_id' scripts/deploy/deploy-uapi.sh || { echo 'FAIL: missing receipt fields in deploy artifact'; exit 1; }
grep -q 'single-dispatch' scripts/cicd/deploy_happy_path.sh || { echo 'FAIL: happy_path missing single-dispatch dedupe'; exit 1; }
grep -q 'tld_gate_status' scripts/dod-gate.sh || { echo 'FAIL: dod-gate missing tld_gate_status check'; exit 1; }
grep -q 'isStrictClosed' tests/e2e/tld-deploy-gate.spec.ts || { echo 'FAIL: spec missing isStrictClosed helper'; exit 1; }
grep -q 'DoD blocked: tld_gate_status' scripts/deploy/deploy-uapi.sh || { echo 'FAIL: deploy-uapi missing tld pass DoD'; exit 1; }
grep -q 'verify_deploy_uapi_receipt' scripts/gates/scorecard_gate.py || { echo 'FAIL: scorecard missing deploy receipt ingest'; exit 1; }
grep -q 'SWARM_TIMEOUT' scripts/cicd/deploy_happy_path.sh || { echo "FAIL: missing swarm timeout"; exit 1; }
grep -q 'LIGHT mode is swarm-only' scripts/cicd/deploy_happy_path.sh || { echo "FAIL: missing LIGHT deploy guard"; exit 1; }
grep -q 'timeout "${SWARM_TIMEOUT}s" bash' scripts/cicd/deploy_happy_path.sh || { echo "FAIL: wave_autopilot not wrapped in timeout"; exit 1; }
bash -n scripts/cicd/deploy_happy_path.sh
bash -n scripts/deploy/trigger_tld_gate_ci.sh
bash -n scripts/deploy/deploy-uapi.sh
bash -n scripts/dod-gate.sh
echo "PASS deploy_happy_path contract"

grep -q 'deploy_receipt_applicable' scripts/gates/scorecard_gate.py || { echo 'FAIL: missing deploy_receipt_applicable'; exit 1; }
grep -qF 'strict=true' scripts/deploy/trigger_tld_gate_ci.sh || { echo 'FAIL: trigger must dispatch strict=true'; exit 1; }
grep -q 'could not bind workflow run' scripts/deploy/trigger_tld_gate_ci.sh || { echo 'FAIL: missing run-id bind failure'; exit 1; }
grep -q 'TLD_GATE_LENIENT: "0"' .github/workflows/tld-deploy-gate.yml || { echo 'FAIL: strict workflow must set TLD_GATE_LENIENT=0'; exit 1; }
grep -q 'isStrictClosed' tests/e2e/tld-deploy-gate.spec.ts || { echo 'FAIL: missing isStrictClosed in tld gate spec'; exit 1; }
echo "PASS deploy receipt strict contract"
