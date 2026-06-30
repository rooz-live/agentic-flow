#!/usr/bin/env bash
# Contract: monorepo + agentic-flow wrappers both invoke disk_steward_core.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
AFLOW="$ROOT/projects/investing/agentic-flow/scripts/cicd/disk_steward.sh"
MONO="$ROOT/scripts/cicd/disk_steward.sh"

[[ -x "$MONO" ]] || { echo "FAIL: missing $MONO"; exit 1; }
[[ -L "$AFLOW" ]] || { echo "FAIL: $AFLOW must be a symbolic link"; exit 1; }

LINK_TARGET="$(readlink "$AFLOW")"
[[ "$LINK_TARGET" == "../../../../../scripts/cicd/disk_steward.sh" ]] || {
    echo "FAIL: symlink target is $LINK_TARGET, expected ../../../../../scripts/cicd/disk_steward.sh" >&2
    exit 1
}

grep -q 'disk_steward_core.py' "$MONO" || { echo "FAIL: monorepo wrapper must call core"; exit 1; }

AF_DISK_SKIP_LOOSE_COUNT=1 AF_DISK_SKIP_GIT_FSCK=1 AF_DISK_FSCK_CONNECTIVITY_ONLY=1 AF_DISK_LOW_PCT=1 bash "$MONO" >/dev/null
python3 -c "import json; d=json.load(open('$ROOT/.goalie/evidence/disk_steward_latest.json')); assert d['schema'] in ('disk_steward.v1', 'disk_steward.v1.1')"
echo "PASS disk_steward_wrapper_parity"
