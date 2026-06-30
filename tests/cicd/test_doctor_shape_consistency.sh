#!/usr/bin/env bash
# Assert the ruflo doctor evidence SHAPE is stable across invocation modes
# (Defect 8: consumer shape consistency).
#
# Consumers (portfolio.yaml blockers, sync_doctor_roam_risks.py,
# ruflo_upgrade_evidence.py, apply_memory_graph.py) must see the same top-level
# keys regardless of which doctor path ran (offline-skip vs a simulated doctor
# failure). build_payload() is the single emit path; this guards against drift.
# Fast-tier: offline, deterministic, no network.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

python3 - <<'PY'
import os, sys
from pathlib import Path
sys.path.insert(0, str(Path("scripts/cicd")))
import ruflo_doctor_roam as d

REQUIRED = {
    "schema", "timestamp", "doctor_exit", "disk_pct_used", "checks", "summary",
    "roam_blockers", "roam_warnings", "memory_graph", "af_skip_network",
    "doctor_tail", "inbox_zero_gate", "disk_steward_evidence", "blockers", "warnings",
}
ITEM_FIELDS = {"id", "disposition", "note", "severity"}
root = Path(".")

# Path A — offline synthetic doctor (AF_SKIP_NETWORK=1): canonical CI / quick path.
os.environ["AF_SKIP_NETWORK"] = "1"
payload_a, _ = d.build_payload(root)

# Path B — simulate a real doctor FAILURE (rc=1, a failing check). Monkeypatch
# run_doctor so the shape source (build_payload) is identical across modes.
orig = d.run_doctor
d.run_doctor = lambda r: (
    1, "Summary: 0 passed, 0 warnings, 1 failed\n\xE2\x9C\x97 Disk Space: 97% used"
)
try:
    payload_b, _ = d.build_payload(root)
finally:
    d.run_doctor = orig

keys_a, keys_b = set(payload_a), set(payload_b)
assert keys_a == keys_b, f"shape drift across doctor modes: {keys_a ^ keys_b}"
assert REQUIRED <= keys_a, f"missing canonical keys: {REQUIRED - keys_a}"

# Blocker/warning item shape must be stable for ROAM / PI consumers.
for grp in ("blockers", "warnings"):
    for item in payload_a[grp] + payload_b[grp]:
        assert ITEM_FIELDS <= set(item), f"item missing {ITEM_FIELDS - set(item)}: {item}"

# inbox_zero_gate (the field portfolio.yaml gates on) must always be a bool.
assert isinstance(payload_a["inbox_zero_gate"], bool)
assert isinstance(payload_b["inbox_zero_gate"], bool)
print(f"PASS doctor_shape_consistency (keys={len(keys_a)}, modes=2)")
PY
