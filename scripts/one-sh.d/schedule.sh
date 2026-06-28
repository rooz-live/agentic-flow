#!/usr/bin/env bash
# schedule.sh — /schedule cadence runner dispatch
set -euo pipefail
ROOT_DIR="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" || "${1:-}" == "help" ]]; then
    cat <<'HELP'
Usage: ./scripts/one.sh schedule|wsjf [args...]

  Updates the multi-lane Now/Near/Next/Later (LNNNL) ledger from
  wsjf_now_items, ROAM risks, and upstream evidence. With no arguments
  it performs a full WSJF refresh and writes .goalie/LNNNL.yaml.
HELP
    exit 0
fi

echo "--> WSJF Schedule update..."
exec python3 "$ROOT_DIR/scripts/cicd/update_lnnnl.py" "$@"
