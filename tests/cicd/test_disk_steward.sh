#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
bash "$ROOT/scripts/cicd/disk_steward.sh"
python3 - <<'PY'
import json
from pathlib import Path
doc = json.loads(Path(".goalie/evidence/disk_steward_latest.json").read_text())
assert doc.get("schema") == "disk_steward.v1"
assert "disk_used_pct" in doc
print("PASS disk_steward")
PY
