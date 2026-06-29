#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
python3 - <<'PY'
import yaml
from pathlib import Path
root = Path(".")
mg = yaml.safe_load((root / "config/ruflo/memory_graph.yaml").read_text())
assert mg.get("schema") == "ruflo_memory_graph.v1"
tiers = mg.get("tiers") or {}
for name in ("hot", "warm", "quality", "durable", "graph"):
    assert name in tiers, f"missing tier {name}"
doctor = root / ".goalie/evidence/ruflo_doctor_latest.json"
if doctor.is_file():
    import json
    doc = json.loads(doctor.read_text())
    assert doc.get("memory_graph") == "ruflo_memory_graph.v1"
print("PASS memory_graph_config")
PY
