#!/usr/bin/env bash
# Contract: tick_post uses single --tick-bootstrap (not separate export-shell + sync-roam).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOOK="$ROOT/scripts/cicd/tick_post_hooks.sh"

grep -q '\-\-tick-bootstrap' "$HOOK" || { echo "FAIL: tick_post must use --tick-bootstrap"; exit 1; }
grep -q 'AF_ALLOW_OP_READ=1' "$HOOK" || { echo "FAIL: bootstrap must opt-in to OP once"; exit 1; }
grep -q 'AF_SKIP_OP_READ=1' "$HOOK" || { echo "FAIL: tick must forbid OP after bootstrap"; exit 1; }

bootstrap_line="$(grep -n '\-\-tick-bootstrap' "$HOOK" | head -1 | cut -d: -f1)"
lnnnl_line="$(grep -n 'update_lnnnl.py' "$HOOK" | head -1 | cut -d: -f1)"
[[ -n "$bootstrap_line" && -n "$lnnnl_line" && "$bootstrap_line" -lt "$lnnnl_line" ]] || {
  echo "FAIL: tick-bootstrap must precede update_lnnnl"; exit 1; }

# Invert: second standalone sync-roam removed from tick_post
count="$(grep -c 'env_key_resolver.py.*--sync-roam' "$HOOK" || true)"
[[ "$count" -eq 0 ]] || { echo "FAIL: tick_post must not call standalone --sync-roam (use bootstrap)"; exit 1; }

python3 -m pytest "$ROOT/tests/metrics/test_op_invert_bootstrap.py" -q --tb=short
echo "PASS op_invert_bootstrap"
