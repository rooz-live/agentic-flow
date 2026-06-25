#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
EV="$ROOT/.goalie/evidence/loop_timer_latest.json"
python3 - "$EV" <<'PY'
import json, sys
from pathlib import Path
p = Path(sys.argv[1])
if not p.is_file():
    print("SKIP loop_timer evidence (no artifact yet)")
    raise SystemExit(0)
d = json.loads(p.read_text(encoding="utf-8"))
for k in ("schema", "phase", "run_id", "ticks_completed"):
    assert k in d, f"missing {k}"
assert d["schema"] == "loop_timer.v1"
if d.get("phase") == "idle":
    assert "idle_until" in d or "idle_seconds_remaining" in d
print("PASS loop_timer_evidence_schema")
PY
