#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$ROOT_DIR"

if [[ $# -eq 0 ]]; then
    cat <<'HELP'
Usage: ./scripts/one.sh run-safely <command> [args...]

  Runs a command with a git stash checkpoint. On failure, rolls back to
  HEAD and restores the stash. Useful for experiments that must not pollute
  the working tree.
HELP
    exit 1
fi

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" || "${1:-}" == "help" ]]; then
    cat <<'HELP'
Usage: ./scripts/one.sh run-safely <command> [args...]

  Runs a command with a git stash checkpoint. On failure, rolls back to
  HEAD and restores the stash. Useful for experiments that must not pollute
  the working tree.
HELP
    exit 0
fi

LAST_SHA=$(git rev-parse HEAD 2>/dev/null || echo "")
echo "--> run-safely: checkpoint at HEAD ${LAST_SHA:-no-git}"

HAS_CHANGES=0
if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
    HAS_CHANGES=1
    git stash push -m "one-sh-checkpoint-$(date +%s)" >/dev/null
    echo "--> run-safely: dirty tree stashed."
fi

CMD_EXIT=0
"$@" || CMD_EXIT=$?

if [[ $CMD_EXIT -ne 0 ]]; then
    echo "❌ [run-safely] Command failed (exit $CMD_EXIT). Rolling back..."
    git reset --hard HEAD >/dev/null
    git clean -fd >/dev/null
    [[ $HAS_CHANGES -eq 1 ]] && git stash pop >/dev/null || true
    exit $CMD_EXIT
fi

echo "✅ [run-safely] Command succeeded."
[[ $HAS_CHANGES -eq 1 ]] && git stash pop >/dev/null || true
