#!/usr/bin/env bash
# Surgical untracked triage: INDEX / SHIM / ARCHIVE — retain capability, never delete blindly.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
exec python3 "$ROOT/scripts/consolidation/triage_untracked.py" "$@"

echo "Wrote $REPORT ($count paths sampled under $BATCH depth $MAX_DEPTH)"
echo "Run: awk -F, '\$2==\"INDEX\"' $REPORT | head"
