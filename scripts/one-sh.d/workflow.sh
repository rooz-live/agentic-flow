#!/usr/bin/env bash
# workflow.sh — /workflows logic runner dispatch
set -euo pipefail
ROOT_DIR="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
# shellcheck source=scripts/ruflo/lib/ruflo_npx.sh
source "$ROOT_DIR/scripts/ruflo/lib/ruflo_npx.sh"

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" || "${1:-}" == "help" ]]; then
    cat <<'HELP'
Usage: ./scripts/one.sh ruflo|workflow <cmd> [args...]

  init          Initialize Ruflo runtime (--minimal --start-daemon)
  status        Show Ruflo system status
  task|swarm|session|memory|hooks ...  Pass through to ruflo CLI
HELP
    exit 0
fi

CMD="${1:-status}"

if [[ "$CMD" == "init" ]]; then
    shift
    echo "--> Initializing Ruflo..."
    ruflo_npx init --minimal --start-daemon "$@"
    echo "--> Ensuring Ruflo daemon is running..."
    ruflo_npx start --daemon || true
    echo "--> Ruflo runtime ready."
    exit 0
fi

exec ruflo_npx "$@"
