#!/usr/bin/env bash
# Serialize tick state for next-session rehydration (no full chat history).
set -euo pipefail
source "$(dirname "$0")/lib/cls_common.sh"
cls_repo_root

RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
OUT_DIR="$REPO_ROOT/.goalie/evidence/learning"
mkdir -p "$OUT_DIR"
OUT_FILE="$OUT_DIR/rehydration_${RUN_ID}.json"
LATEST="$OUT_DIR/rehydration_latest.json"

bash "$REPO_ROOT/scripts/cicd/perceive_reader.sh" >/dev/null 2>&1 || true

ITEM="${LOOP_ITEM:-P1-INDEX-01}"
TICK="${LOOP_TICK_COUNT:-0}"
HEAD="$(cls_head_sha)"
PE="${PERCEIVE_EC:-}"
CE="${CLS_EC:-}"
TICK_EXIT="${TICK_EXIT:-0}"

read -r UC ST < <(cls_untracked_counts 2>/dev/null || echo "0 0")
TRUST_OK=0
cls_trust_ok && TRUST_OK=1 || true
RESET_AT="$(cls_budget_get session.max_ticks_before_reset 5)"
SWEET="$(cls_budget_get session.sweet_spot_ticks 3)"
SESSION_RESET_RECOMMENDED=0
[[ "$TICK" -gt "$RESET_AT" ]] && SESSION_RESET_RECOMMENDED=1

export OUT_FILE LATEST RUN_ID ITEM TICK HEAD PE CE TICK_EXIT UC ST TRUST_OK SESSION_RESET_RECOMMENDED RESET_AT SWEET WAVE_RETRY_MAX REPO_ROOT
python3 <<PY
import json, os, time
from pathlib import Path

out = Path(os.environ["OUT_FILE"])
latest = Path(os.environ["LATEST"])
root = Path(os.environ["REPO_ROOT"])
perceive_state = {}
ps = root / ".goalie/evidence/learning/perceive_state.json"
if ps.is_file():
    perceive_state = json.loads(ps.read_text())

learning_path = None
learning_dir = root / ".goalie/evidence/learning"
learnings = sorted(learning_dir.glob("learning_*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
if learnings:
    learning_path = str(learnings[0])

doc = {
    "schema": "cls.rehydration.v1",
    "run_id": os.environ.get("RUN_ID", ""),
    "timestamp_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "head_sha": os.environ.get("HEAD", ""),
    "loop_item": os.environ.get("ITEM", ""),
    "loop_tick_count": int(os.environ.get("TICK", "0") or 0),
    "perceive_ec": int(os.environ["PE"]) if os.environ.get("PE", "").isdigit() else None,
    "cls_ec": int(os.environ["CE"]) if os.environ.get("CE", "").isdigit() else None,
    "tick_exit": int(os.environ.get("TICK_EXIT", "0")),
    "untracked_critical": int(os.environ.get("UC", "0")),
    "untracked_substrate_total": int(os.environ.get("ST", "0")),
    "trust_artifact_ok": os.environ.get("TRUST_OK") == "1",
    "session_reset_recommended": os.environ.get("SESSION_RESET_RECOMMENDED") == "1",
    "budget": {
        "sweet_spot_ticks": int(os.environ.get("SWEET", "3")),
        "max_ticks_before_reset": int(os.environ.get("RESET_AT", "5")),
        "max_remediate_retries": int(os.environ.get("WAVE_RETRY_MAX", "2") or 2),
    },
    "next_commands": [
        f"export LOOP_TICK_COUNT={int(os.environ.get('TICK', '0') or 0)+1}",
        f"LOOP_ITEM={os.environ.get('ITEM', 'P1-INDEX-02')} bash scripts/cicd/run_loop_tick.sh",
        "bash code/tooling/scripts/dod-gate.sh --perceive",
    ],
    "perceive_state_path": str(ps) if ps.is_file() else None,
    "latest_learning_path": learning_path,
    "roam_tracker": ".goalie/ROAM_TRACKER_COG.yaml",
    "upstream_actions": ".goalie/UPSTREAM_ACTIONS.yaml",
    "stop_on_roam_critical": ["R01", "R04"],
    "fa_gates": ["commit", "phase2_signoff", "ssh_deploy", "secret_rotation"],
}
out.write_text(json.dumps(doc, indent=2) + "\n")
latest.write_text(json.dumps({"path": str(out), "head_sha": doc["head_sha"], "loop_tick_count": doc["loop_tick_count"]}, indent=2) + "\n")
print(f"rehydration_manifest={out}")
if doc["session_reset_recommended"]:
    print("SESSION_RESET_RECOMMENDED: start clean thread; load rehydration_latest.json only")
PY
