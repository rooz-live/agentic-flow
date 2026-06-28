#!/usr/bin/env bash
# Contract: dual-lane LNNNL v1.1 → pace ≥1.0 → run_aqe=true (NO SKIP).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

test -f "$ROOT/.goalie/LNNNL.yaml" || { echo "FAIL: missing LNNNL.yaml"; exit 1; }

python3 - <<'PY'
import sys
from pathlib import Path
import yaml

doc = yaml.safe_load(Path(".goalie/LNNNL.yaml").read_text(encoding="utf-8")) or {}
version = str(doc.get("version", ""))
if not version.startswith("1."):
    sys.exit(f"FAIL: LNNNL version expected 1.x, got {version!r}")
lanes = doc.get("lanes") or {}
for lane in ("shippable", "blockers"):
    if lane not in lanes or not str(lanes[lane].get("now") or "").strip():
        sys.exit(f"FAIL: lanes.{lane}.now missing")
if "P1-" not in str(lanes["shippable"].get("now") or ""):
    sys.exit("FAIL: shippable.now should head with P1 work")
print("OK: dual-lane shape")
PY

PACE="$(python3 "$ROOT/scripts/metrics/pace_from_lnnnl.py" --from-lnnnl)"
python3 -c "p=float('$PACE'); import sys; sys.exit(f'FAIL: pace {p} < 1.0') if p < 1.0 else None; print(f'OK: pace={p}')"

POLICY="$(python3 "$ROOT/scripts/cicd/lib/tick_cycle_policy.py" --pace "$PACE" --json)"
python3 -c "import json,sys; p=json.loads(sys.argv[1]); sys.exit('FAIL: run_aqe=false') if not p.get('run_aqe') else print(f\"OK: run_aqe mode={p.get('utilize_mode')}\")" "$POLICY"

echo "PASS lnnnl_dual_lane_contract"
