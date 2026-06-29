#!/usr/bin/env bash
set -euo pipefail
ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$ROOT"
DRY_RUN=0
JUDGE_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --judge-only) JUDGE_ONLY=1 ;;
  esac
done

if [[ "$DRY_RUN" == "1" ]]; then
  python3 - "$ROOT" <<'PY'
import json
from datetime import datetime, timezone
from pathlib import Path
root = Path(__import__("sys").argv[1])
out = root / ".goalie/evidence/intel_pipeline_latest.json"
payload = {
    "schema": "intel_pipeline.v1",
    "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "retrieve": "skipped_offline",
    "judge": {"quality": None, "status": "dry_run"},
    "distill": "deferred",
    "consolidate": "deferred",
    "pattern_stored": False,
    "inbox_zero_gate": True,
}
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
print("intel_pipeline dry-run")
PY
  exit 0
fi

REPO_ROOT="$ROOT" python3 "$ROOT/scripts/ruflo/intel_pipeline_post_task.py"
