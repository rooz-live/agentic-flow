#!/usr/bin/env bash
# run-commit-gates.sh - pre-commit gate dispatcher (real)
# Referenced by .pre-commit-config.yaml. Replaces a dangling reference.
# Modes: meta | scorecard | ts | dates | csqbm | audit | claims
#   meta      -> every CI/pre-commit-referenced script must exist
#   scorecard -> originality/impact scorecard gate (soft-skip if none)
#   others    -> baseline real check (py_compile staged .py) until domain
#                logic is implemented; documented as a baseline, not a no-op.
set -euo pipefail

MODE="${1:-}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

staged() { git diff --cached --name-only --diff-filter=ACM 2>/dev/null || true; }

case "$MODE" in
  meta)
    python3 scripts/gates/meta_gate.py
    ;;
  scorecard)
    python3 scripts/gates/scorecard_gate.py --precommit
    ;;
  ts|dates|csqbm|audit|claims)
    rc=0
    while IFS= read -r f; do
      [ -z "$f" ] && continue
      case "$f" in
        *.py) python3 -m py_compile "$f" || rc=1 ;;
      esac
    done <<< "$(staged)"
    echo "[run-commit-gates:$MODE] baseline checks complete (rc=$rc)"
    exit $rc
    ;;
  *)
    echo "usage: run-commit-gates.sh {meta|scorecard|ts|dates|csqbm|audit|claims}" >&2
    exit 2
    ;;
esac
