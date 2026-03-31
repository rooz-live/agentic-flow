#!/usr/bin/env bash
# @business-context WSJF: Mover-ops validation suite (core, hash-db, runner, integration)
# run-mover-ops-validation-suite.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== test-validation-core.sh ==="
bash "$BASE_DIR/tests/test-validation-core.sh"

echo "=== test-email-hash-db.sh ==="
bash "$BASE_DIR/tests/test-email-hash-db.sh"

echo "=== test-validation-runner.sh ==="
bash "$BASE_DIR/tests/test-validation-runner.sh"

echo "=== test-integration-readiness-contract.sh ==="
bash "$BASE_DIR/tests/test-integration-readiness-contract.sh"

echo "=== test-feature-flag-readiness.sh ==="
bash "$BASE_DIR/tests/test-feature-flag-readiness.sh"

echo "=== guard-parity-selftest ==="
bash "$BASE_DIR/scripts/guard-parity-selftest.sh"

echo "=== ALL MOVER-OPS SUITE PASSED ==="
