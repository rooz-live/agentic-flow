#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
bash "$ROOT/scripts/cicd/exec_wsjf_ruflo.sh"
test -f "$ROOT/.goalie/evidence/wsjf_ruflo_latest.json"
python3 -c "
import json
from pathlib import Path
d=json.loads(Path('$ROOT/.goalie/evidence/wsjf_ruflo_latest.json').read_text())
assert d['schema']=='wsjf_ruflo.v1'
assert d['head_item']['id'].startswith('RUFLO-')
"
echo "PASS wsjf_ruflo_exec"
