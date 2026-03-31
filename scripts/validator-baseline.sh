#!/usr/bin/env bash
# @business-context WSJF: Validator pipeline truth baseline (shellcheck + syntax)
# validator-baseline.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPORT_DIR="$PROJECT_ROOT/reports/mover-ops"
OUT_TXT="$REPORT_DIR/validator-baseline-$(date -u +%Y%m%dT%H%M%SZ).txt"

mkdir -p "$REPORT_DIR"

TARGETS=(
  "$PROJECT_ROOT/scripts/validation-core.sh"
  "$PROJECT_ROOT/scripts/validators/file/validation-runner.sh"
  "$PROJECT_ROOT/_SYSTEM/_AUTOMATION/validate-email.sh"
  "$PROJECT_ROOT/tests/test-validation-core.sh"
  "$PROJECT_ROOT/tests/test-email-hash-db.sh"
  "$PROJECT_ROOT/tests/test-validation-runner.sh"
)

{
  echo "=== Validator baseline $(date -u) ==="
  echo ""
  for f in "${TARGETS[@]}"; do
    echo "--- $f ---"
    if [[ -f "$f" ]]; then
      bash -n "$f" 2>&1 && echo "bash -n: OK" || echo "bash -n: FAIL"
      if command -v shellcheck >/dev/null 2>&1; then
        shellcheck -x "$f" 2>&1 | head -80 || true
      else
        echo "shellcheck: not installed"
      fi
    else
      echo "MISSING"
    fi
    echo ""
  done
  echo "=== End ==="
} | tee "$OUT_TXT"

echo "[validator-baseline] Wrote $OUT_TXT" >&2
