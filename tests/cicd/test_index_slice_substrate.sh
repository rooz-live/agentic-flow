#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
fail() { echo "FAIL: $*"; exit 1; }
S="$ROOT/scripts/cicd/index_slice_substrate.sh"
[[ -x "$S" ]] || fail "missing $S"
# Forbid repo-wide untracked scan (no pathspec after --)
grep -E 'ls-files.*--others.*--exclude-standard"[[:space:]]*$' "$S" && fail "bare repo-wide ls-files --others"
OUT=$(INDEX_SLICE_MAX=5 bash "$S" --dry-run 2>/dev/null | tail -1)
echo "$OUT" | python3 -c "import sys,json; d=json.loads(sys.stdin.read()); assert d['would_stage']<=5; assert d['slice']=='P1-INDEX-02'"
echo "PASS index_slice_substrate_contract"
