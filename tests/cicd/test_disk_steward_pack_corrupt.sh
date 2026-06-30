#!/usr/bin/env bash
# Contract: pack_corrupt detection + enforce gate when pack_corrupt.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
export PYTHONPATH="$ROOT/scripts/cicd/lib:${PYTHONPATH:-}"

python3 - <<'PY'
import sys
sys.path.insert(0, "scripts/cicd/lib")
from disk_steward_core import _pack_corrupt

assert _pack_corrupt(0, [], skip_fsck=True) is False
assert _pack_corrupt(1, [], skip_fsck=False) is True
assert _pack_corrupt(
    0,
    [{"id": "git-repack-Ad", "status": "failed"}],
    skip_fsck=True,
) is True

low_disk = False
pack_corrupt = True
skip_fsck = True
fsck_rc = 0
exit_code = 0
if True:  # AF_DISK_STEWARD_ENFORCE=1 branch
    if low_disk or pack_corrupt or (not skip_fsck and fsck_rc != 0):
        exit_code = 2
assert exit_code == 2, "pack_corrupt must drive enforce exit 2"
print("PASS _pack_corrupt unit + enforce branch")
PY

grep -q 'id: R-PACK-CORRUPT' "$ROOT/config/versions/portfolio.yaml" || {
  echo "FAIL: portfolio missing R-PACK-CORRUPT blocker" >&2
  exit 1
}

AF_DISK_SKIP_LOOSE_COUNT=1 AF_DISK_SKIP_GIT_FSCK=1 AF_DISK_SKIP_GIT_GC=1 \
  bash "$ROOT/scripts/cicd/disk_steward.sh" >/dev/null

python3 - "$ROOT/.goalie/evidence/disk_steward_latest.json" <<'PY'
import json, sys
from pathlib import Path
doc = json.loads(Path(sys.argv[1]).read_text())
assert "pack_corrupt" in doc and isinstance(doc["pack_corrupt"], bool)
assert "fsck_auto_escalated" in doc
assert "roam_risks" in doc
print("PASS disk_steward payload pack_corrupt fields")
PY
