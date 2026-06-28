#!/usr/bin/env bash
# loop.sh — /loop engine runner dispatch
set -euo pipefail
ROOT_DIR="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" || "${1:-}" == "help" ]]; then
    cat <<'HELP'
Usage: ./scripts/one.sh loop [cmd]

  Runs the bounded loop timer engine. With no arguments, executes one
  perception → DoR → tick → DoD cycle against the current LNNNL head.
HELP
    exit 0
fi

exec bash "$ROOT_DIR/scripts/cicd/loop_timer_engine.sh" "$@"
