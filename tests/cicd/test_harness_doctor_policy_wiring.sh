#!/usr/bin/env bash
# Contract: harness_doctor_rc flows into tick_cycle_policy utilization signals.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
EVIDENCE="$ROOT/.goalie/evidence"
mkdir -p "$EVIDENCE"

# Isolate: only harness doctor signal for this contract
rm -f "$EVIDENCE/redblue_mock_judge_latest.json" "$EVIDENCE/ruflo_mcp_probe_latest.json"

python3 - "$EVIDENCE/harness_doctor_latest.json" <<'PY'
import json, sys
from datetime import datetime, timezone
from pathlib import Path
Path(sys.argv[1]).write_text(json.dumps({
    "schema": "harness_doctor.v1",
    "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "doctor_exit": 2,
}, indent=2) + "\n", encoding="utf-8")
PY

OUT="$EVIDENCE/tick_cycle_policy_test_latest.json"
PYTHONPATH="$ROOT" python3 "$ROOT/scripts/cicd/lib/tick_cycle_policy.py" --pace 1.0 --json \
  > "$OUT"

python3 - "$OUT" <<'PY'
import json, sys
from pathlib import Path
doc = json.loads(Path(sys.argv[1]).read_text())
signals = doc.get("utilization_signals") or {}
assert signals.get("harness_doctor_rc") == 2, signals
util = doc.get("harness_utilization_pct")
assert util is not None and util <= 25.0, f"harness_utilization_pct={util}"
assert doc.get("utilize_mode_hint") == "degraded", doc.get("utilize_mode_hint")
print("PASS harness_doctor_policy_wiring")
PY
