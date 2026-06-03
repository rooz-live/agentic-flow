#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
fail() { echo "FAIL: $*"; exit 1; }
for f in "$ROOT/scripts/consolidation/w3_index_gates_batch.sh" "$ROOT/scripts/cicd/index_slice_allowlist.sh"; do
  [[ -f "$f" ]] || fail "missing $f"
  grep -q 'ls-files --others' "$f" && fail "$f uses ls-files --others"
done
echo "PASS workflow_slice_contract"
