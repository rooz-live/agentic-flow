#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
fail() { echo "FAIL: $*"; exit 1; }

CANON="${ROOT}/code/tooling/scripts/public_synthetic_check.sh"
[[ -x "$CANON" ]] || fail "missing canonical: $CANON"

for shim in \
  "${ROOT}/scripts/public_synthetic_check.sh" \
  "${ROOT}/tooling/scripts/public_synthetic_check.sh"; do
  [[ -f "$shim" ]] || fail "missing shim: $shim"
  grep -q 'code/tooling/scripts/public_synthetic_check.sh' "$shim" || \
    fail "shim does not delegate to canonical: $shim"
done

# Bare --check-only must not be parsed as domain (R-CLS-06)
if ! "$CANON" --check-only >/dev/null 2>&1; then
  fail "canonical --check-only should exit 0 for spine wiring"
fi

echo "PASS cls_canonical_paths"
