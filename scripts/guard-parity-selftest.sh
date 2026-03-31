#!/usr/bin/env bash
# @business-context WSJF: ay / advocate / cascade-tunnel guard parity check
# guard-parity-selftest.sh — verifies shared exit registry + guard-failure-envelope

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FAIL=0

for f in \
  "$PROJECT_ROOT/scripts/ay.sh" \
  "$PROJECT_ROOT/scripts/advocate" \
  "$PROJECT_ROOT/scripts/orchestrators/cascade-tunnel.sh"; do
  if ! grep -q "guard-failure-envelope.sh" "$f" 2>/dev/null; then
    echo "FAIL: missing guard-failure-envelope: $f" >&2
    FAIL=1
  fi
  if ! grep -q "EXIT_INVALID_ARGS" "$f" 2>/dev/null; then
    echo "FAIL: missing EXIT_INVALID_ARGS fallback: $f" >&2
    FAIL=1
  fi
done

if ! grep -q "rolling_failure_counter" "$PROJECT_ROOT/scripts/ay.sh" 2>/dev/null; then
  echo "FAIL: ay.sh missing rolling_failure_counter" >&2
  FAIL=1
fi

if [[ "$FAIL" -ne 0 ]]; then
  echo "guard-parity-selftest: FAILED" >&2
  exit 1
fi
echo "OK: guard parity (envelope + exit codes + ay rolling trends)"
exit 0
