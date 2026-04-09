#!/usr/bin/env bash
# CI entry: hash-db + validation-core + runner tests + shellcheck manifest (warning+)
# @business-context WSJF-8.6: Bounded Execution Hooks
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ROBUST_WRAPPER="$ROOT/scripts/robust-quality.sh"
cd "$ROOT"

if [[ ! -x "$ROBUST_WRAPPER" ]]; then
    echo "[WARNING] robust-quality.sh wrapper not executable, failing over to standard execution."
    ./tests/test-email-hash-db.sh
    ./tests/test-validation-core.sh
    ./tests/test-validation-runner.sh
    out=$(./scripts/dev/count-shellcheck.sh)
    echo "$out"
    tot=$(echo "$out" | awk -F= '/^TOTAL_ERRORS=/ {print $2}')
    [[ "${tot:-1}" -eq 0 ]]
    exit $?
fi

# Define Process Contracts
MAX_STEPS=100
MAX_DURATION=300
DEPENDENCIES="bash,awk"
DESCRIPTION="CI Logic Matrix Validations"

# Execute Bounded
"$ROBUST_WRAPPER" hook
echo "Starting bounded validation process natively..."
"$ROBUST_WRAPPER" run "$MAX_STEPS" "$MAX_DURATION" "$DEPENDENCIES" "$DESCRIPTION" "./tests/test-email-hash-db.sh && ./tests/test-validation-core.sh && ./tests/test-validation-runner.sh && ./scripts/dev/count-shellcheck.sh"
exit_code=$?

if [ $exit_code -ne 0 ]; then
    echo "[ERROR] Bounded wrapper execution returned structurally failed bounds."
    exit $exit_code
fi
exit 0
