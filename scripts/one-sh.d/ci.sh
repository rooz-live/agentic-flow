#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" || "${1:-}" == "help" ]]; then
    cat <<'HELP'
Usage: ./scripts/one.sh ci

  Runs the full CI circle: assess → orchestrate → swarm.
  Each phase short-circuits on failure to keep signal clean.
HELP
    exit 0
fi

echo "====================================================================="
echo "🦅 ONE.SH CI — Assessor → Orchestrator → Swarm"
echo "====================================================================="
EXIT_CODE=0
bash "$ROOT_DIR/scripts/ci/ci-assess.sh"      || EXIT_CODE=$?
[[ $EXIT_CODE -eq 0 ]] && \
    bash "$ROOT_DIR/scripts/ci/ci-orchestrate.sh" || EXIT_CODE=$?
[[ $EXIT_CODE -eq 0 ]] && \
    bash "$ROOT_DIR/scripts/ci/ci-swarm.sh"   || EXIT_CODE=$?
exit $EXIT_CODE
