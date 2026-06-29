#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
AF_SKIP_NETWORK=1 bash scripts/cicd/ruflo_wsjf_upgrade.sh --doctor-only || true
python3 scripts/ruflo/sync_doctor_roam_risks.py
python3 - <<'PY'
import json
from pathlib import Path
for name in ("ruflo_doctor_latest.json", "ruflo_doctor_roam_latest.json"):
    p = Path(".goalie/evidence") / name
    assert p.is_file(), f"missing {name}"
    doc = json.loads(p.read_text())
    assert "schema" in doc or "blockers" in doc or "risks" in doc
print("PASS ruflo doctor contract")
PY
