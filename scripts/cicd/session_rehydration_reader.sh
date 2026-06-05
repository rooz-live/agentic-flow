#!/usr/bin/env bash
# BT-9: Read rehydration manifest for session wake (--compact | --emit | --json).
set -euo pipefail
source "$(dirname "$0")/lib/cls_common.sh"
cls_repo_root

MODE="${1:---compact}"
LATEST="$REPO_ROOT/.goalie/evidence/learning/rehydration_latest.json"

emit_absent() {
  echo 'AGENT_REHYDRATION_CLS {"status":"absent","hint":"run LOOP_ITEM=P1-INDEX-02 bash scripts/cicd/run_loop_tick.sh"}'
  echo 'AGENT_LOOP_WAKE_CLS {"status":"empty"}'
}

load_doc() {
  python3 - "$REPO_ROOT" "$LATEST" <<'PY'
import json, sys
from pathlib import Path
root, latest = Path(sys.argv[1]), Path(sys.argv[2])
if not latest.is_file():
    raise SystemExit(2)
meta = json.loads(latest.read_text())
path = Path(meta.get("path", ""))
if not path.is_file():
    raise SystemExit(3)
print(path.read_text())
PY
}

if [[ ! -f "$LATEST" ]]; then
  if [[ "$MODE" == "--emit" ]]; then
    emit_absent
    exit 0
  fi
  echo "WARN: no rehydration_latest.json" >&2
  emit_absent
  exit 1
fi

DOC="$(load_doc)" || {
  [[ "$MODE" == "--emit" ]] && { emit_absent; exit 0; }
  exit 1
}

export MODE DOC
python3 <<'PY'
import json, os, sys

mode = os.environ.get("MODE", "--compact")
doc = json.loads(os.environ["DOC"])
if doc.get("schema") != "cls.rehydration.v1":
    print('AGENT_REHYDRATION_CLS {"status":"unknown_schema"}')
    sys.exit(0)

compact = {
    "status": "ok",
    "schema": doc["schema"],
    "head_sha": doc.get("head_sha"),
    "loop_item": doc.get("loop_item"),
    "loop_tick_count": doc.get("loop_tick_count"),
    "trust_artifact_ok": doc.get("trust_artifact_ok"),
    "session_reset_recommended": doc.get("session_reset_recommended"),
    "untracked_critical": doc.get("untracked_critical"),
    "untracked_substrate_total": doc.get("untracked_substrate_total"),
    "latest_learning_path": doc.get("latest_learning_path"),
    "next_commands": (doc.get("next_commands") or [])[:3],
}

if mode == "--json":
    print(json.dumps(doc, indent=2))
elif mode == "--emit":
    print("AGENT_REHYDRATION_CLS " + json.dumps(compact, separators=(",", ":")))
    print("AGENT_LOOP_WAKE_CLS " + json.dumps({"status": "ok", "head_sha": doc.get("head_sha"), "tick": doc.get("loop_tick_count")}))
    if doc.get("session_reset_recommended"):
        print("SESSION_RESET_RECOMMENDED: squash-merge + clean thread with manifest only", file=sys.stderr)
else:
    print(json.dumps(compact, indent=2))
    print("AGENT_LOOP_WAKE_CLS " + json.dumps({"status": "ok", "head_sha": doc.get("head_sha"), "tick": doc.get("loop_tick_count")}))
PY
