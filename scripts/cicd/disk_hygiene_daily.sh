#!/usr/bin/env bash
# Daily disk hygiene probe (non-enforcing; CI-safe skip flags).
set -euo pipefail
_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${REPO_ROOT:-$(git -C "$_SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null)}"
ROOT="${ROOT:-$(cd "$_SCRIPT_DIR/../.." && pwd)}"
cd "$ROOT"
export AF_DISK_STEWARD_ENFORCE=0
export AF_DISK_SKIP_LOOSE_COUNT="${AF_DISK_SKIP_LOOSE_COUNT:-1}"
export AF_DISK_SKIP_GIT_FSCK="${AF_DISK_SKIP_GIT_FSCK:-1}"
export AF_DISK_FSCK_CONNECTIVITY_ONLY="${AF_DISK_FSCK_CONNECTIVITY_ONLY:-1}"
exec bash "$ROOT/scripts/cicd/disk_steward.sh"
