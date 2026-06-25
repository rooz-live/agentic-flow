#!/usr/bin/env bash
set -euo pipefail
ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$ROOT"
export LOOP_TICK_COUNT="${LOOP_TICK_COUNT:-1}"
export LOOP_CEREMONY="${LOOP_CEREMONY:-light}"
export CEREMONY_MODE="${CEREMONY_MODE:-$LOOP_CEREMONY}"
exec python3 "$ROOT/scripts/cicd/lib/ceremony_engine.py" --tick "$LOOP_TICK_COUNT" \
  ${CEREMONY_COMMIT_UNIT:+--commit-unit} --json
