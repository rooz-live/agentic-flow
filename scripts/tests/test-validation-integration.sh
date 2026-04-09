#!/usr/bin/env bash
# Single entry point: validation-core + validation-runner tests; optional BHOPTI hash-db + post-send.
# Usage: ./scripts/test-validation-integration.sh
# Env: LEGAL_ROOT (optional), SKIP_BHOPTI_TESTS=1 to skip BHOPTI-only tests

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "== agentic-flow: test-validation-core.sh =="
bash "$ROOT/tests/test-validation-core.sh"

echo "== agentic-flow: test-validation-runner.sh =="
bash "$ROOT/tests/test-validation-runner.sh"

_DEFAULT_LEGAL="${HOME}/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL"
LEGAL="${LEGAL_ROOT:-$_DEFAULT_LEGAL}"

if [[ "${SKIP_BHOPTI_TESTS:-0}" != "1" ]] && [[ -d "$LEGAL/_SYSTEM/_AUTOMATION/tests" ]]; then
  if [[ -f "$LEGAL/_SYSTEM/_AUTOMATION/tests/test-email-hash-db.sh" ]]; then
    echo "== BHOPTI: test-email-hash-db.sh =="
    bash "$LEGAL/_SYSTEM/_AUTOMATION/tests/test-email-hash-db.sh"
  fi
  if [[ -f "$LEGAL/_SYSTEM/_AUTOMATION/tests/test-post-send-hook.sh" ]]; then
    echo "== BHOPTI: test-post-send-hook.sh =="
    export SKIP_WSJF_BRIDGE=1
    bash "$LEGAL/_SYSTEM/_AUTOMATION/tests/test-post-send-hook.sh"
  fi
else
  echo "== BHOPTI tests skipped (SKIP_BHOPTI_TESTS or LEGAL tree missing) =="
fi

echo "== OK: test-validation-integration completed =="
