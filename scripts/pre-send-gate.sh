#!/usr/bin/env bash
# =============================================================================
# Pre-Send Email Gate Pipeline
# Single command pre-send workflow for Trial #1
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Pre-Send Gate Pipeline ==="
echo "Trial #1 Readiness Check (T-2 days, March 3, 2026)"
echo ""

# Run local CI validation
if "$SCRIPT_DIR/local-ci-validation.sh" --skip-rust; then
    echo ""
    echo "✓ Pre-send gate: PASS"
    echo "✓ Ready to send Trial #1 artifacts"
    exit 0
else
    EXIT_CODE=$?
    echo ""
    echo "✗ Pre-send gate: FAIL (exit code: $EXIT_CODE)"
    echo "✗ Review validation failures before sending"
    exit $EXIT_CODE
fi
