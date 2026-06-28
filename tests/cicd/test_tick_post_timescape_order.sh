#!/usr/bin/env bash
# Contract: timescape runs after policy/AQE (post-policy snapshot).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOOK="$ROOT/scripts/cicd/tick_post_hooks.sh"
bash -n "$HOOK"
python3 - <<PY
from pathlib import Path
text = Path("$HOOK").read_text()
policy = text.index("cycle_policy:")
inbox = text.index("inbox_zero_timescape")
upstream = text.index("SKIP upstream")
assert policy < upstream < inbox, "expected policy → upstream → timescape order"
assert "tick_cycle_policy_latest.json" in text
print("PASS tick_post timescape post-policy order")
PY
