#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
[[ -x "$ROOT/scripts/cicd/write_tick_rehydration_manifest.sh" ]] || { echo FAIL; exit 1; }
export REPO_ROOT="$ROOT" LOOP_ITEM=P1-INDEX-02 LOOP_TICK_COUNT=1 PERCEIVE_EC=0 CLS_EC=0 TICK_EXIT=0
OUT=$(bash "$ROOT/scripts/cicd/write_tick_rehydration_manifest.sh")
echo "$OUT" | grep -q rehydration_manifest=
[[ -f "$ROOT/.goalie/evidence/learning/rehydration_latest.json" ]] || exit 1
python3 - "$ROOT" <<'PY'
import json, sys
from pathlib import Path
root = Path(sys.argv[1])
lat = json.loads((root / ".goalie/evidence/learning/rehydration_latest.json").read_text())
doc = json.loads(Path(lat["path"]).read_text())
assert doc["schema"] == "cls.rehydration.v1"
assert "head_sha" in doc and doc["loop_item"] == "P1-INDEX-02"
assert doc["loop_tick_count"] == 1
print("PASS tick_rehydration_manifest")
PY
