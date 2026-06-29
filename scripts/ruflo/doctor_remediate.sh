#!/usr/bin/env bash
# Canonical doctor entry — delegates to ruflo_doctor_roam.py (single schema).
set -euo pipefail
ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$ROOT"
PYTHONPATH="$ROOT" AF_SKIP_OP_READ="${AF_SKIP_OP_READ:-1}" \
  python3 "$ROOT/scripts/cicd/ruflo_doctor_roam.py"
DOC_EXIT=$?
python3 "$ROOT/scripts/ruflo/sync_doctor_roam_risks.py" || true
exit "$DOC_EXIT"
