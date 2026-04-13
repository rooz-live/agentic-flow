#!/usr/bin/env bash
# scripts/source-project-env.sh
# Standardizes the execution environment for test portability batching.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Define testing boundaries
export TESTING_MODE=1
export MOCK_EXTERNAL_SERVICES=1
export LOG_LEVEL="DEBUG"

# If .env.cpanel exists, source it for structural validation (not mutating)
if [[ -f "$PROJECT_ROOT/credentials/.env.cpanel" ]]; then
    set -a
    source "$PROJECT_ROOT/credentials/.env.cpanel"
    set +a
fi

echo "[INFO] Project environment sourced. Ready for portable execution."
