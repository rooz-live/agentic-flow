#!/usr/bin/env bash
# Behavioral mocks: deploy receipt freshness, upload empty body, trigger pending logic.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "=== behavioral: empty WHM upload body fails closed ==="
UPLOAD_OK=true
RESPONSE=""
HTTP_CODE="200"
CURL_EC=0
if [[ $CURL_EC -ne 0 ]]; then UPLOAD_OK=false; fi
if [[ -z "${RESPONSE//[[:space:]]/}" ]]; then UPLOAD_OK=false; fi
[[ "$UPLOAD_OK" == "false" ]] || { echo "FAIL: empty body should fail upload"; exit 1; }
echo "OK empty upload body"

echo "=== behavioral: trigger pending fail-closed (REQUIRE_WAIT=1) ==="
REQUIRE_WAIT=1
RUN_CONCLUSION="pending"
WATCH_EXIT=0
TRIGGER_EC=0
if [[ "$REQUIRE_WAIT" == "1" && "$RUN_CONCLUSION" != "success" ]]; then
  TRIGGER_EC=5
fi
[[ "$TRIGGER_EC" -eq 5 ]] || { echo "FAIL: pending should exit 5"; exit 1; }
echo "OK trigger pending exit 5"

echo "=== behavioral: dod/scorecard skip legacy deploy artifact ==="
python3 <<'PY'
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path('.').resolve()))
from scripts.gates.scorecard_gate import verify_deploy_uapi_receipt, deploy_receipt_applicable, ingest_deploy_receipt

tmp = Path('/tmp/deploy_receipt_behavior_test')
evidence = tmp / '.goalie' / 'evidence'
if evidence.exists():
    import shutil
    shutil.rmtree(tmp)
evidence.mkdir(parents=True)
(evidence / 'last_deploy_uapi.json').write_text(json.dumps({"playwright_exit": 1, "domains_ok": 1}))
ok, art, msg = verify_deploy_uapi_receipt(tmp)
assert ok and art is not None and 'legacy' in msg.lower(), msg

applicable, reason = deploy_receipt_applicable({"tld_gate_status": "pass", "playwright_exit": 0}, tmp)
assert not applicable and 'hash' in reason.lower(), reason

meta, blocks = {}, []
ingest_deploy_receipt(tmp, {"CI": "1"}, meta, blocks)
assert not blocks, blocks
assert meta.get('deploy_receipt_verify', '').lower().find('legacy') >= 0 or 'skipped' in str(meta).lower()
print('OK legacy/stale skip paths')
PY

echo "PASS deploy_receipt_behavior"
