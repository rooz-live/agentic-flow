#!/usr/bin/env bash
# CI entry: hash-db + validation-core + runner tests + shellcheck manifest (warning+)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
./tests/test-email-hash-db.sh
./tests/test-validation-core.sh
./tests/test-validation-runner.sh
out=$(./scripts/dev/count-shellcheck.sh)
echo "$out"
tot=$(echo "$out" | awk -F= '/^TOTAL_ERRORS=/ {print $2}')
[[ "${tot:-1}" -eq 0 ]]
