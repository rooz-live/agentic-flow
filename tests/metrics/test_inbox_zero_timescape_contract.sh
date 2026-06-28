#!/usr/bin/env bash
# Contract: inbox_zero_timescape.sh writes schema-stable evidence artifact.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

bash scripts/metrics/inbox_zero_timescape.sh
OUT="$ROOT/.goalie/evidence/inbox_zero_latest.json"
test -f "$OUT"

python3 - <<'PY'
import json
from pathlib import Path
p = Path(".goalie/evidence/inbox_zero_latest.json")
d = json.loads(p.read_text(encoding="utf-8"))
required = (
    "timestamp",
    "completion_ratio_percent",
    "absolute_open_items",
    "velocity_items_per_hour",
    "pace_cod_weight",
    "anti_cvt_score",
    "details",
)
for k in required:
    assert k in d, f"missing key: {k}"
assert isinstance(d["details"], dict)
print("inbox_zero_timescape contract: ok")
PY
