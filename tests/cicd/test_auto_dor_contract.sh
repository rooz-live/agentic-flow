#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
AUTO_DOR="${ROOT}/scripts/utils/auto-dor.sh"
TMP="${TMPDIR:-/tmp}/auto_dor_contract_$$"
mkdir -p "$TMP/.goalie/evidence"
trap 'rm -rf "$TMP"' EXIT

run_dor() {
  PR_BODY="$1" ROOT_DIR="$TMP" bash "$AUTO_DOR"
}

BODY_DEFERRED='## Test plan
- [x] done item

## Deferred
- [ ] DNS work not in scope
- [ ] deferred blocker'
run_dor "$BODY_DEFERRED"
echo "PASS deferred_excluded"

BODY_NOISE='## Summary
- [ ] should be ignored

## Test plan
- [x] pytest green
- [x] bash tests/cicd/run_all.sh fast'
run_dor "$BODY_NOISE"
echo "PASS scoped_sections_only"

BODY_FAIL='## Test plan
- [x] done
- [ ] pending gate'
if run_dor "$BODY_FAIL" 2>/dev/null; then
  echo "FAIL expected holacracy block for pending checkbox"
  exit 1
fi
echo "PASS pending_checkbox_blocks"

BODY_A='## Test plan
- [x] a'
BODY_B='## Test plan
- [ ] b'
run_dor "$BODY_A"
if run_dor "$BODY_B" 2>/dev/null; then
  echo "FAIL cache should not mask checkbox regression"
  exit 1
fi
echo "PASS body_hash_cache"

echo "PASS auto_dor_contract"
