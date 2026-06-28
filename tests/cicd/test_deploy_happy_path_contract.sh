#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
grep -q 'AF_TLD_GATE_WAIT' scripts/deploy/trigger_tld_gate_ci.sh || { echo 'FAIL: missing AF_TLD_GATE_WAIT default'; exit 1; }
grep -q 'AF_TLD_GATE_REQUIRE_WAIT' scripts/deploy/trigger_tld_gate_ci.sh || { echo 'FAIL: missing AF_TLD_GATE_REQUIRE_WAIT'; exit 1; }
grep -q 'must be 1 on deploy path' scripts/deploy/trigger_tld_gate_ci.sh || { echo 'FAIL: missing hard WAIT=1 enforcement'; exit 1; }
grep -q 'gate still pending' scripts/deploy/trigger_tld_gate_ci.sh || { echo 'FAIL: missing pending fail-closed'; exit 1; }
grep -q 'resolve_run_id' scripts/deploy/trigger_tld_gate_ci.sh || { echo 'FAIL: missing dispatch run binding'; exit 1; }
grep -q 'CURL_EC' scripts/deploy/deploy-uapi.sh || { echo 'FAIL: missing curl exit check in deploy-uapi'; exit 1; }
grep -q 'tld_gate_github_run_id' scripts/deploy/deploy-uapi.sh || { echo 'FAIL: missing receipt fields in deploy artifact'; exit 1; }
grep -q 'single-dispatch' scripts/cicd/deploy_happy_path.sh || { echo 'FAIL: happy_path missing single-dispatch dedupe'; exit 1; }
grep -q 'verify_deploy_uapi_receipt' scripts/dod-gate.sh || { echo 'FAIL: dod-gate missing verify_deploy_uapi_receipt'; exit 1; }
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
grep -q 'strict-only workflow' scripts/deploy/trigger_tld_gate_ci.sh || { echo 'FAIL: trigger must enforce strict-only dispatch'; exit 1; }
grep -q 'no displayTitle match' scripts/deploy/trigger_tld_gate_ci.sh || { echo 'FAIL: missing strict run-id bind failure'; exit 1; }
! grep -q 'strict=false' .github/workflows/tld-deploy-gate.yml || { echo 'FAIL: workflow still allows strict=false'; exit 1; }
grep -q '!redirects || isStrictClosed()' tests/e2e/tld-deploy-gate.spec.ts || { echo 'FAIL: strict redirect manifest'; exit 1; }
echo "PASS deploy receipt freshness contract"
grep -q 'exit 1' scripts/deploy_uapi.sh || { echo 'FAIL: deploy_uapi shim must hard-fail'; exit 1; }
! grep -q 'exec bash.*deploy-uapi' scripts/deploy_uapi.sh || { echo 'FAIL: deploy_uapi shim must not exec canonical script'; exit 1; }
grep -q 'index_slice_p1_scripts' scripts/cicd/index_slice_p1_scripts.sh || { echo 'FAIL: missing P1-INDEX-01 executor'; exit 1; }
! grep -q 'setdefault("AF_ALLOW_OWNED_LOCAL"' scripts/cicd/lib/scorecard_vector.py || { echo 'FAIL: cycle vector must not default AF_ALLOW_OWNED_LOCAL'; exit 1; }
echo "PASS P1 index and gate integrity contracts"

grep -q 'UPLOAD_TMP' scripts/deploy/deploy-uapi.sh || { echo 'FAIL: deploy-uapi must use curl -o temp file'; exit 1; }
! grep -q 'fail_open' scripts/deploy/deploy-uapi.sh || { echo 'FAIL: fail_open path must be removed'; exit 1; }
grep -q 'pace_from_lnnnl.py.*--loop-item' scripts/cicd/run_loop_tick.sh || grep -q '--loop-item' scripts/cicd/run_loop_tick.sh || { echo 'FAIL: run_loop_tick must bind LOOP_ITEM from LNNNL'; exit 1; }
grep -q '_record_tick_exit' scripts/cicd/run_loop_tick.sh || { echo 'FAIL: run_loop_tick must accumulate TICK_EXIT'; exit 1; }
grep -q 'find_stale_roam_items(active_items' scripts/cicd/update_lnnnl.py || { echo 'FAIL: update_lnnnl must wire stale ROAM gate'; exit 1; }
grep -q 'verify_deploy_uapi_receipt(root_path)' scripts/gates/scorecard_gate.py || { echo 'FAIL: ingest must call verify_deploy_uapi_receipt'; exit 1; }
echo "PASS deploy receipt behavior contracts"
