#!/usr/bin/env bash
# Contract: tick_post fails closed in CI when scorecard missing before receipt_chain.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOOKS="$ROOT/scripts/cicd/tick_post_hooks.sh"
grep -q 'no scorecard on disk before receipt_chain' "$HOOKS" || {
  echo "FAIL: tick_post missing scorecard precheck before receipt_chain" >&2
  exit 1
}
grep -q 'receipt_chain: no scorecard found (fail-closed)' "$ROOT/scripts/cicd/receipt_chain.sh" || {
  echo "FAIL: receipt_chain missing fail-closed branch" >&2
  exit 1
}
echo "PASS tick_post_scorecard_precheck"
