#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
bash scripts/metrics/inbox_zero_timescape.sh
python3 - <<PY
import json
from pathlib import Path
doc = json.loads(Path(".goalie/evidence/inbox_zero_latest.json").read_text())
for key in ("pct_closed", "open_count", "pace_fmt", "velocity_fmt", "anti_cvt", "max_roi_cycles_per_hour", "aqe_scope_utilization_pct"):
    assert key in doc or key in doc.get("metrics", {}), f"missing {key}"
assert "unutilized" in doc.get("anti_cvt", {}), "anti_cvt.unutilized missing"
roi_gap = doc.get("roi_gap")
assert roi_gap is not None, "roi_gap missing"
print("PASS inbox minimal-zero contract")
PY
