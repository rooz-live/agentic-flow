#!/usr/bin/env bash
# Contract: doctor emits R-GIT-FSCK-01 when git_fsck_rc != 0 (disk below threshold).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TMPROOT="$(mktemp -d "${TMPDIR:-/tmp}/doctor_disk_signal.XXXXXX")"
trap 'rm -rf "$TMPROOT"' EXIT
mkdir -p "$TMPROOT/.goalie/evidence"

python3 - "$TMPROOT/.goalie/evidence/disk_steward_latest.json" <<'PY'
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

Path(sys.argv[1]).write_text(
    json.dumps(
        {
            "schema": "disk_steward.v1.1",
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "disk_used_pct": 50.0,
            "low_threshold_pct": 90,
            "inbox_zero_gate": True,
            "git_fsck_rc": 2,
            "git_fsck_mode": "full",
            "pack_corrupt": False,
        },
        indent=2,
    )
    + "\n",
    encoding="utf-8",
)
PY

set +e
REPO_ROOT="$TMPROOT" AF_SKIP_NETWORK=1 PYTHONPATH="$ROOT/scripts/cicd/lib:$ROOT" \
  python3 "$ROOT/scripts/cicd/ruflo_doctor_roam.py" >/dev/null 2>&1
DOC_RC=$?
set -e
[[ "$DOC_RC" -eq 2 ]] || { echo "FAIL: expected exit 2, got $DOC_RC"; exit 1; }

python3 - "$TMPROOT/.goalie/evidence/ruflo_doctor_latest.json" <<'PY'
import json
import sys
from pathlib import Path

doc = json.loads(Path(sys.argv[1]).read_text())
ids = {b["id"] for b in doc.get("roam_blockers", [])}
assert ids == {"R-GIT-FSCK-01"}, f"expected only R-GIT-FSCK-01, got {ids}"
print("PASS doctor_disk_signal")
PY
