#!/usr/bin/env bash
# workflow.sh — /workflows logic runner dispatch
set -euo pipefail
ROOT_DIR="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

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
    npx --yes ruflo@3.15.0 init --minimal --start-daemon "$@"
    echo "--> Ensuring Ruflo daemon is running..."
    npx --yes ruflo@3.15.0 start --daemon || true
    echo "--> Ruflo runtime ready."
    exit 0
fi

exec npx --yes ruflo@3.15.0 "$@"
