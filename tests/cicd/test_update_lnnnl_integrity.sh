#!/usr/bin/env bash
# F11: update_lnnnl.py must not be truncated; stale exit is 2.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LNNNL="$ROOT/scripts/cicd/update_lnnnl.py"
test -f "$LNNNL"
lines="$(wc -l < "$LNNNL" | tr -d ' ')"
[[ "$lines" -gt 400 ]] || { echo "FAIL: update_lnnnl.py too short ($lines lines)"; exit 1; }
grep -q 'STALE_EXIT = 2' "$LNNNL" || { echo "FAIL: missing STALE_EXIT"; exit 1; }
grep -q 'def main' "$LNNNL" || { echo "FAIL: missing main()"; exit 1; }
grep -q 'find_stale_roam_items' "$LNNNL" || { echo "FAIL: missing stale ROAM gate"; exit 1; }
echo "PASS update_lnnnl_integrity (lines=$lines)"
