#!/usr/bin/env bash
# Weekly disk hygiene: disk-steward → doctor → exit-artifact → run-all slow
set -euo pipefail
_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${REPO_ROOT:-$(git -C "$_SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null)}"
ROOT="${ROOT:-$(cd "$_SCRIPT_DIR/../.." && pwd)}"
cd "$ROOT"
export REPO_ROOT="$ROOT"
export AF_SKIP_NETWORK="${AF_SKIP_NETWORK:-1}"
export AF_DISK_SKIP_LOOSE_COUNT="${AF_DISK_SKIP_LOOSE_COUNT:-1}"
export AF_DISK_STEWARD_APPLY="${AF_DISK_STEWARD_APPLY:-1}"
export AF_DISK_STEWARD_REPAIR="${AF_DISK_STEWARD_REPAIR:-1}"
export AF_DISK_STEWARD_DEEP_CLEAN="${AF_DISK_STEWARD_DEEP_CLEAN:-1}"
export AF_DISK_STEWARD_ENFORCE="${AF_DISK_STEWARD_ENFORCE:-0}"

echo "=== disk_hygiene_weekly: disk-steward ==="
bash "$ROOT/scripts/cicd/disk_steward.sh"

echo "=== disk_hygiene_weekly: ruflo doctor evidence ==="
AF_SKIP_NETWORK=1 PYTHONPATH="$ROOT/scripts/cicd/lib:$ROOT" \
  python3 "$ROOT/scripts/cicd/ruflo_doctor_roam.py" || true

echo "=== disk_hygiene_weekly: exit-artifact inbox ==="
python3 "$ROOT/scripts/cicd/exit_artifact_inbox.py"

echo "=== disk_hygiene_weekly: run-all slow ==="
export AF_RUN_ALL_STRICT="${AF_RUN_ALL_STRICT:-1}"
bash "$ROOT/scripts/cicd/run_all.sh" slow
