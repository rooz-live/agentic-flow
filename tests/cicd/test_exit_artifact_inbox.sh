#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
python3 scripts/cicd/exit_artifact_inbox.py
python3 - <<'PY'
import json
from pathlib import Path
p = Path(".goalie/evidence/exit_artifact_inbox_latest.json")
doc = json.loads(p.read_text())
for k in ("open_count", "pct_closed", "inbox_zero_gate", "velocity_fmt"):
    assert k in doc, f"missing {k}"
print("PASS exit artifact inbox contract")
PY
