#!/usr/bin/env bash
# Contract: Ruflo WSJF upgrade manifest, doctor_roam, intel_pipeline dry-run.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

fail() { echo "FAIL: $*"; exit 1; }

[[ -f "$ROOT/config/monorepo/root_manifest.yaml" ]] || fail "missing root_manifest.yaml"
grep -q 'plugins_manifest: config/ruflo/plugins.yaml' "$ROOT/config/monorepo/root_manifest.yaml" \
  || fail "root_manifest missing plugins_manifest"
[[ -f "$ROOT/config/ruflo/plugins.yaml" ]] || fail "missing config/ruflo/plugins.yaml"
[[ -f "$ROOT/config/ruflo/memory_graph.yaml" ]] || fail "missing config/ruflo/memory_graph.yaml"
[[ -x "$ROOT/scripts/cicd/ruflo_wsjf_upgrade.sh" ]] || fail "missing ruflo_wsjf_upgrade.sh"

PYTHONPATH="$ROOT" AF_SKIP_NETWORK=1 AF_SKIP_OP_READ=1 \
  python3 "$ROOT/scripts/cicd/ruflo_doctor_roam.py" || true
[[ -f "$ROOT/.goalie/evidence/ruflo_doctor_latest.json" ]] \
  || fail "ruflo_doctor_latest.json not written"

python3 - <<'PY'
import json
from pathlib import Path
doc = json.loads(Path(".goalie/evidence/ruflo_doctor_latest.json").read_text())
assert doc.get("schema") == "ruflo_doctor_roam.v1", "bad doctor schema"
assert "roam_blockers" in doc and "checks" in doc
print("doctor_roam contract ok")
PY

AF_SKIP_NETWORK=1 LOOP_ITEM=P1-RUFLO-01 bash "$ROOT/scripts/cicd/intel_pipeline_tick.sh" --dry-run
python3 - <<'PY'
import json
from pathlib import Path
p = Path(".goalie/evidence/intel_pipeline_latest.json")
assert p.is_file(), "intel_pipeline_latest.json missing after dry-run"
doc = json.loads(p.read_text())
assert doc.get("schema") == "intel_pipeline.v1"
assert "retrieve" in doc and "judge" in doc
print("intel_pipeline dry-run contract ok")
PY

bash "$ROOT/scripts/cicd/ruflo_wsjf_upgrade.sh" --doctor-only || true
[[ -f "$ROOT/.goalie/evidence/ruflo_upgrade_latest.json" ]] || fail "ruflo_upgrade_latest.json missing"

echo "PASS test_ruflo_upgrade_contract"
