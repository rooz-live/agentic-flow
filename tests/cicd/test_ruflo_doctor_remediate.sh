#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT="$ROOT/scripts/ruflo/doctor_remediate.sh"
test -x "$SCRIPT"
REPO_ROOT="$ROOT" AF_SKIP_OP_READ=1 AF_SKIP_NETWORK=1 bash "$SCRIPT"
DOC_EXIT=$?
test -f "$ROOT/.goalie/evidence/ruflo_doctor_latest.json"
python3 -c "
import json, sys
from pathlib import Path
doc = json.loads(Path('$ROOT/.goalie/evidence/ruflo_doctor_latest.json').read_text())
assert doc['schema'] == 'ruflo_doctor_roam.v1'
assert 'roam_blockers' in doc and 'blockers' in doc
print('OK ruflo_doctor_roam schema doctor_exit=' + str(doc.get('doctor_exit', '?')))
"
if [[ "${AF_DOCTOR_CONTRACT_STRICT:-${CI:-0}}" == "1" ]] || [[ "${GITHUB_ACTIONS:-}" == "1" ]]; then
  if [[ $DOC_EXIT -ne 0 ]]; then
    echo "FAIL: doctor_exit=$DOC_EXIT (clear R-DISK-01 / run disk_steward.sh)"
    exit "$DOC_EXIT"
  fi
fi
echo "PASS ruflo_doctor_remediate (exit=$DOC_EXIT)"
