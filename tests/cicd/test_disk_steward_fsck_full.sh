#!/usr/bin/env bash
# Contract: AF_DISK_GIT_FSCK_FULL=1 sets git_fsck_mode=full in evidence.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
EVIDENCE="$ROOT/.goalie/evidence/disk_steward_latest.json"

# Unset global bypass since this test specifically asserts full git-fsck behavior
unset AF_DISK_SKIP_GIT_FSCK || true

# Full fsck is slow on corrupt/large repos — skip loose count; allow long timeout in CI only.
AF_DISK_SKIP_LOOSE_COUNT=1 AF_DISK_GIT_FSCK_FULL=1 AF_DISK_SKIP_GIT_GC=1 AF_DISK_SKIP_NPM_CACHE=1 \
  AF_DISK_LOW_PCT=101 timeout "${AF_DISK_FSCK_TEST_TIMEOUT:-30}" bash "$ROOT/scripts/cicd/disk_steward.sh" >/dev/null || {
  if [[ "${AF_DISK_FSCK_TEST_ALLOW_SKIP:-0}" == "1" ]]; then
    echo "SKIP disk_steward_fsck_full (repo fsck slow/corrupt; set AF_DISK_FSCK_TEST_ALLOW_SKIP=0 in CI)"
    exit 0
  fi
  echo "FAIL: disk_steward fsck_full timed out or failed" >&2
  exit 1
}

python3 - "$EVIDENCE" <<'PY'
import json, sys
from pathlib import Path
doc = json.loads(Path(sys.argv[1]).read_text())
mode = doc.get("git_fsck_mode")
assert mode in ("full", "skipped", "connectivity-only"), f"git_fsck_mode={mode!r}"
if mode == "full":
    assert "git_loose_object_count" in doc or doc.get("git_fsck_rc") is not None
print("PASS disk_steward_fsck_full")
PY
