#!/usr/bin/env bash
# WSJF-ranked disk stewardship — thin wrapper over disk_steward_core.py (R-DISK-01).
set -euo pipefail
_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${REPO_ROOT:-$(git -C "$_SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null)}"
ROOT="${ROOT:-$(cd "$_SCRIPT_DIR/../.." && pwd)}"
cd "$ROOT"
export PYTHONPATH="${PYTHONPATH:-}:$_SCRIPT_DIR/lib"
exec python3 "$_SCRIPT_DIR/lib/disk_steward_core.py" "$ROOT"
