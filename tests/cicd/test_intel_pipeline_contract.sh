#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
bash scripts/cicd/intel_pipeline_tick.sh --dry-run
python3 - <<'PY'
import json
from pathlib import Path
p = Path(".goalie/evidence/intel_pipeline_latest.json")
doc = json.loads(p.read_text())
assert doc.get("schema") == "intel_pipeline.v1"
assert "retrieve" in doc and "judge" in doc
print("PASS intel pipeline contract")
PY
