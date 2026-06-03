#!/usr/bin/env bash
# scripts/cicd/perceive_reader.sh — Read latest goalie artifacts, no network/curl
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

PERCEIVE_DIR=".goalie/evidence/learning"
mkdir -p "$PERCEIVE_DIR"
OUT_PATH="$PERCEIVE_DIR/perceive_state.json"

GIT_HEAD="$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")"
TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

python3 - "$PROJECT_ROOT" "$OUT_PATH" "$GIT_HEAD" "$TIMESTAMP" <<'PY'
import json
import sys
from pathlib import Path

root_dir = Path(sys.argv[1])
out_path = Path(sys.argv[2])
git_head = sys.argv[3]
timestamp = sys.argv[4]

evidence_dir = root_dir / ".goalie/evidence"
state = {
    "timestamp": timestamp,
    "git_head": git_head,
    "exit_code": 0,
    "latest_artifacts": {}
}

# 1. Read pre-task latest
pre_task_latest = evidence_dir / "pre-task/latest.json"
if pre_task_latest.exists():
    try:
        state["latest_artifacts"]["pre-task"] = json.loads(pre_task_latest.read_text())
    except Exception as e:
        state["latest_artifacts"]["pre-task"] = {"error": str(e)}

# 2. Read post-task latest
post_task_latest = evidence_dir / "post-task/latest.json"
if post_task_latest.exists():
    try:
        state["latest_artifacts"]["post-task"] = json.loads(post_task_latest.read_text())
    except Exception as e:
        state["latest_artifacts"]["post-task"] = {"error": str(e)}

# 3. Read compliance latest
for scope in ("full", "edge", "governance"):
    comp_latest = evidence_dir / f"compliance/latest_{scope}.json"
    if comp_latest.exists():
        try:
            state["latest_artifacts"][f"compliance_{scope}"] = json.loads(comp_latest.read_text())
        except Exception as e:
            state["latest_artifacts"][f"compliance_{scope}"] = {"error": str(e)}

# 4. Read roam watchdog latest
watchdog_dir = evidence_dir / "roam-watchdog"
if watchdog_dir.exists():
    wds = sorted(watchdog_dir.glob("watchdog_*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    if wds:
        try:
            state["latest_artifacts"]["roam_watchdog"] = json.loads(wds[0].read_text())
        except Exception as e:
            state["latest_artifacts"]["roam_watchdog"] = {"error": str(e)}

# 5. Read index tick latest
index_tick = evidence_dir / "learning/index_tick.json"
if index_tick.exists():
    try:
        state["latest_artifacts"]["index_tick"] = json.loads(index_tick.read_text())
    except Exception as e:
        state["latest_artifacts"]["index_tick"] = {"error": str(e)}

# Write output file
out_path.write_text(json.dumps(state, indent=2) + "\n")
print(f"Wrote perceive state to {out_path}")
PY
