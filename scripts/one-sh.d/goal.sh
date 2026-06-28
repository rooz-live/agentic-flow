#!/usr/bin/env bash
# goal.sh — /goal engine runner dispatch
set -euo pipefail
ROOT_DIR="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" || "${1:-}" == "help" ]]; then
    cat <<'HELP'
Usage: ./scripts/one.sh goal [args...]

  Emits the max-ROI-per-hour snapshot: current bounded slice, pace,
  utilization mode, and next-action hint.
HELP
    exit 0
fi

if [ $# -eq 0 ]; then
    exec python3 "$ROOT_DIR/scripts/cicd/lib/roi_iterate.py" --json
else
    exec python3 "$ROOT_DIR/scripts/cicd/lib/roi_iterate.py" "$@"
fi
