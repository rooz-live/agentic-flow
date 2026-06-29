#!/usr/bin/env bash
# Fail-closed scorecard verification for CI (no soft-skip).
# Resolution order: current.json → required.json → PR_BODY fenced block.
set -euo pipefail
ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$ROOT"
export AF_REQUIRE_SCORECARD=1

_args=(--verify --strict --json --emit-evidence)
if [[ -f .goalie/scorecards/current.json ]]; then
  exec python3 scripts/gates/scorecard_gate.py --file .goalie/scorecards/current.json "${_args[@]}"
fi
if [[ -f .goalie/scorecards/required.json ]]; then
  exec python3 scripts/gates/scorecard_gate.py --file .goalie/scorecards/required.json "${_args[@]}"
fi
if [[ -n "${PR_BODY:-}" ]]; then
  if printf '%s' "$PR_BODY" | python3 scripts/gates/scorecard_gate.py --pr-body - "${_args[@]}"; then
    exit 0
  fi
  echo "BLOCK: PR body has no valid fenced scorecard block" >&2
  exit 2
fi
echo "BLOCK: AF_REQUIRE_SCORECARD=1 — need current.json, required.json, or PR_BODY scorecard" >&2
exit 2
