#!/usr/bin/env bash
# @business-context WSJF: Integration — validate-full JSON readiness schema (runner)
# test-integration-readiness-contract.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

export SKIP_SEMANTIC_VALIDATION=true
export SEND_GATE_CONFIG_OK=true

"$BASE_DIR/scripts/verify-send-readiness-contract.sh" "$BASE_DIR/tests/fixtures/minimal-pass-email.txt"
echo "✅ integration readiness contract OK"
