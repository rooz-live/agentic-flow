#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
READER="$ROOT/scripts/cicd/session_rehydration_reader.sh"
[[ -x "$READER" ]] || { echo FAIL; exit 1; }

out=$(REPO_ROOT="$ROOT" bash "$READER" --emit)
echo "$out" | grep -q AGENT_REHYDRATION_CLS

export REPO_ROOT="$ROOT" LOOP_ITEM=P1-INDEX-02 LOOP_TICK_COUNT=2 PERCEIVE_EC=0 CLS_EC=0 TICK_EXIT=0
bash "$ROOT/scripts/cicd/write_tick_rehydration_manifest.sh" >/dev/null

line=$(REPO_ROOT="$ROOT" bash "$READER" --emit | grep '^AGENT_REHYDRATION_CLS ' | sed 's/^AGENT_REHYDRATION_CLS //')
python3 - "$line" <<'PY'
import json, sys
doc = json.loads(sys.argv[1])
assert doc["status"] == "ok"
assert doc["schema"] == "cls.rehydration.v1"
assert doc["loop_tick_count"] == 2
print("PASS session_rehydration_reader")
PY
