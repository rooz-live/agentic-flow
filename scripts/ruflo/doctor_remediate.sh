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
# Named skip: ROAM risk sync is advisory. Captured + warned — never blanket `|| true`,
# which silently swallowed sync failures (a broken sync left doctor blockers un-propagated
# to the ROAM register with zero signal). The doctor's own exit (DOC_EXIT) still propagates.
if [[ "${AF_SKIP_ROAM_SYNC:-0}" != "1" ]]; then
    if ! python3 "$ROOT/scripts/ruflo/sync_doctor_roam_risks.py"; then
        echo "WARN: sync_doctor_roam_risks.py failed (rc=$?) — ROAM risks not synced" >&2
    fi
else
    echo "SKIP sync_doctor_roam_risks (AF_SKIP_ROAM_SYNC=1)"
fi
exit "$DOC_EXIT"
