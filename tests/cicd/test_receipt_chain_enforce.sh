#!/usr/bin/env bash
# Fail-closed: enforce=1 blocks when no canonical scorecard exists.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CHAIN="$ROOT/scripts/cicd/receipt_chain.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$TMP/.goalie/scorecards"
# coherence artifact only — must not resolve as scorecard
echo '{"gate":"coherence","coherence":"PASS"}' > "$TMP/coherence_results.json"

set +e
REPO_ROOT="$TMP" AF_RECEIPT_CHAIN_ENFORCE=1 bash "$CHAIN" >/dev/null 2>&1
EC=$?
set -e
[[ "$EC" -ne 0 ]] || { echo "FAIL: expected non-zero exit when no scorecard"; exit 1; }
test -d "$TMP/.goalie/evidence/receipts"
echo "PASS receipt_chain enforce no-scorecard"
