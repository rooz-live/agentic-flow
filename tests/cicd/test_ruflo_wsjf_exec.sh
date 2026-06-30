#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
bash scripts/cicd/exec_wsjf_ruflo.sh
python3 - <<'PY'
import json
from pathlib import Path
p = Path(".goalie/evidence/wsjf_ruflo_latest.json")
doc = json.loads(p.read_text())
assert doc.get("schema") == "wsjf_ruflo.v1"
assert doc.get("head_item"), "missing head_item"
print("PASS ruflo wsjf exec contract")
PY
