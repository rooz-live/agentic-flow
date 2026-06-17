#!/usr/bin/env bash
# one.sh - Canonical Sovereign Gate entrypoint (real, fail-closed)
# Called by .github/workflows/ci.yml as: ./scripts/one.sh ci
# MPP: method=one | pattern=gate_entrypoint | protocol=exit_code
set -euo pipefail

SUB="${1:-ci}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

case "$SUB" in
  ci)
    echo "[one.sh] (1/3) meta-gate: referenced scripts must exist (all workflows)"
    python3 scripts/gates/meta_gate.py --all

    echo "[one.sh] (2/3) scorecard gate"
    if [ -n "${PR_BODY:-}" ]; then
      printf '%s' "$PR_BODY" \
        | python3 scripts/gates/scorecard_gate.py --pr-body - --verify --strict
    else
      # No PR body (e.g. local run): soft-skip unless AF_REQUIRE_SCORECARD=1
      python3 scripts/gates/scorecard_gate.py --precommit
    fi

    echo "[one.sh] (3/3) gate unit tests"
    python3 -m pytest tests/gates/ -q -p no:cacheprovider

    echo "[one.sh] OK"
    ;;
  *)
    echo "usage: one.sh ci" >&2
    exit 2
    ;;
esac
