#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT="$ROOT/scripts/ruflo/doctor_remediate.sh"
test -x "$SCRIPT"
REPO_ROOT="$ROOT" RUFLO_DOCTOR_APPLY=0 bash "$SCRIPT" || true
test -f "$ROOT/.goalie/evidence/ruflo_doctor_latest.json"
python3 -c "
import json, sys
from pathlib import Path
doc = json.loads(Path('$ROOT/.goalie/evidence/ruflo_doctor_latest.json').read_text())
assert doc['schema'] == 'ruflo_doctor.v1'
assert 'blockers' in doc and 'warnings' in doc
print('OK ruflo_doctor schema')
"
echo "PASS ruflo_doctor_remediate"
