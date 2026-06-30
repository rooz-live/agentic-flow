#!/usr/bin/env bash
# WSJF-1: emit_ci_provenance fails closed in CI when AF_CI_SIGNING_KEY is unset.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
EMIT="$ROOT/scripts/gates/emit_ci_provenance.sh"
test -x "$EMIT" || test -f "$EMIT"

# Local: skip without key is OK
(
  unset CI GITHUB_ACTIONS AF_CI_SIGNING_KEY
  bash "$EMIT" >/dev/null
)

# CI without signing key must block
set +e
(
  export CI=true GITHUB_ACTIONS=true
  unset AF_CI_SIGNING_KEY
  bash "$EMIT" >/dev/null 2>&1
)
EC=$?
set -e
[[ "$EC" -ne 0 ]] || { echo "FAIL: expected non-zero in CI without AF_CI_SIGNING_KEY"; exit 1; }

echo "PASS emit_ci_provenance_failclosed"
