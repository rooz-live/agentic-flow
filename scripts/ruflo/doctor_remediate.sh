#!/usr/bin/env bash
# Canonical doctor entry — disk steward (low disk) → ruflo_doctor_roam.py (single schema).
set -euo pipefail
ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$ROOT"
# shellcheck source=scripts/cicd/lib/disk_steward_invoke.sh
source "$ROOT/scripts/cicd/lib/disk_steward_invoke.sh"
disk_steward_maybe "$ROOT"
PYTHONPATH="$ROOT" AF_SKIP_OP_READ="${AF_SKIP_OP_READ:-1}" \
  python3 "$ROOT/scripts/cicd/ruflo_doctor_roam.py"
DOC_EXIT=$?
python3 "$ROOT/scripts/ruflo/sync_doctor_roam_risks.py" || true
exit "$DOC_EXIT"
