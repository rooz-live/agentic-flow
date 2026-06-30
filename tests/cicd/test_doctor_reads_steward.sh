#!/usr/bin/env bash
# Contract: ruflo_doctor_roam.py propagates disk_steward_latest.json blockers.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TMPROOT="$(mktemp -d "${TMPDIR:-/tmp}/doctor_reads_steward.XXXXXX")"
trap 'rm -rf "$TMPROOT"' EXIT
mkdir -p "$TMPROOT/.goalie/evidence"

python3 - "$TMPROOT/.goalie/evidence/disk_steward_latest.json" <<'PY'
import json, sys
from datetime import datetime, timezone
from pathlib import Path
p = Path(sys.argv[1])
p.write_text(json.dumps({
    "schema": "disk_steward.v1.1",
    "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "disk_used_pct": 99.0,
    "low_threshold_pct": 90,
    "inbox_zero_gate": False,
    "git_fsck_rc": 1,
    "git_fsck_mode": "connectivity-only",
    "pack_corrupt": False,
}, indent=2) + "\n", encoding="utf-8")
PY

set +e
REPO_ROOT="$TMPROOT" AF_SKIP_NETWORK=1 PYTHONPATH="$ROOT/scripts/cicd/lib:$ROOT" \
  python3 "$ROOT/scripts/cicd/ruflo_doctor_roam.py" >/dev/null 2>&1
DOC_RC=$?
set -e

[[ "$DOC_RC" -eq 2 ]] || { echo "FAIL: doctor expected exit 2 with steward blockers, got $DOC_RC"; exit 1; }

python3 - "$TMPROOT/.goalie/evidence/ruflo_doctor_latest.json" <<'PY'
import json, sys
from pathlib import Path
doc = json.loads(Path(sys.argv[1]).read_text())
ids = {b["id"] for b in doc.get("roam_blockers", [])}
assert "R-DISK-01" in ids, f"missing R-DISK-01 in {ids}"
assert "R-GIT-FSCK-01" in ids, f"missing R-GIT-FSCK-01 in {ids}"
assert doc.get("inbox_zero_gate") is False
print("PASS doctor_reads_steward")
PY
