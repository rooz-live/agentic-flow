#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
test -f .goalie/LNNNL.yaml || { echo "SKIP: no LNNNL.yaml"; exit 0; }
ITEM="$(python3 scripts/metrics/pace_from_lnnnl.py --loop-item)"
grep -qE '^(P1-[A-Z0-9]+-[0-9]+|NNEAR-[0-9]+)$' <<<"$ITEM" || { echo "FAIL: invalid LOOP_ITEM $ITEM"; exit 1; }
grep -q "$ITEM" .goalie/LNNNL.yaml || { echo "FAIL: $ITEM not in LNNNL"; exit 1; }
echo "PASS loop_item_binding_contract ($ITEM)"
