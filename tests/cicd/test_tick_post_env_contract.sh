#!/usr/bin/env bash
# Contract: export-shell → fd-only source <(…) → AF_SKIP_OP_READ → sync-roam → update_lnnnl (enforce/stale/pace).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOOK="$ROOT/scripts/cicd/tick_post_hooks.sh"

test -f "$HOOK" || { echo "FAIL: missing tick_post_hooks.sh"; exit 1; }

grep -q 'source <(' "$HOOK" || { echo "FAIL: tick_post must fd-only source exports (process substitution)"; exit 1; }
! grep -q 'mktemp.*tick_post_env' "$HOOK" || { echo "FAIL: tick_post must not write export secrets to mktemp"; exit 1; }
grep -q '_source_exports' "$HOOK" || { echo "FAIL: missing _source_exports helper"; exit 1; }
grep -q 'AF_LNNNL_ENFORCE' "$HOOK" || { echo "FAIL: missing AF_LNNNL_ENFORCE gate"; exit 1; }
grep -q 'AF_LNNNL_STALE_ENFORCE' "$HOOK" || { echo "FAIL: missing AF_LNNNL_STALE_ENFORCE gate"; exit 1; }
grep -q 'AF_TICK_POST_ENFORCE' "$HOOK" || { echo "FAIL: missing AF_TICK_POST_ENFORCE propagation"; exit 1; }
grep -q 'pace_source' "$HOOK" || { echo "FAIL: missing pace_source in evidence"; exit 1; }
grep -q 'TICK_POST_EXIT' "$HOOK" || { echo "FAIL: must propagate TICK_POST_EXIT"; exit 1; }
grep -q 'tick_post_latest.json' "$HOOK" || { echo "FAIL: missing tick_post evidence writer"; exit 1; }
grep -q 'AF_LNNNL_ENFORCE:-1' "$HOOK" || { echo "FAIL: hook must default AF_LNNNL_ENFORCE=1"; exit 1; }

export_line="$(grep -n 'export-shell' "$HOOK" | head -1 | cut -d: -f1)"
sync_line="$(grep -n '\-\-sync-roam' "$HOOK" | head -1 | cut -d: -f1)"
lnnnl_line="$(grep -n 'update_lnnnl.py' "$HOOK" | head -1 | cut -d: -f1)"
[[ -n "$export_line" && -n "$sync_line" && "$export_line" -lt "$sync_line" ]] || {
  echo "FAIL: export-shell must precede --sync-roam"; exit 1; }
[[ -n "$sync_line" && -n "$lnnnl_line" && "$sync_line" -lt "$lnnnl_line" ]] || {
  echo "FAIL: sync-roam must precede update_lnnnl"; exit 1; }

grep -q 'AF_SKIP_ROAM_SYNC=1' "$HOOK" || { echo "FAIL: update_lnnnl must set AF_SKIP_ROAM_SYNC=1"; exit 1; }
grep -q 'AF_SKIP_OP_READ=1' "$HOOK" || { echo "FAIL: must set AF_SKIP_OP_READ after successful export"; exit 1; }

echo "PASS tick_post_env_contract"

for loop in "$ROOT/scripts/cicd/loop_timer_engine.sh" "$ROOT/scripts/cicd/run_loop_tick.sh" "$ROOT/scripts/cicd/cycle_tick.sh"; do
  grep -q 'AF_LNNNL_ENFORCE="${AF_LNNNL_ENFORCE:-1}"' "$loop" || {
    echo "FAIL: $loop must default AF_LNNNL_ENFORCE=1"; exit 1; }
  grep -q 'AF_LNNNL_STALE_ENFORCE="${AF_LNNNL_STALE_ENFORCE:-1}"' "$loop" || {
    echo "FAIL: $loop must default AF_LNNNL_STALE_ENFORCE=1"; exit 1; }
  grep -q 'AF_TICK_POST_ENFORCE="${AF_TICK_POST_ENFORCE:-1}"' "$loop" || {
    echo "FAIL: $loop must default AF_TICK_POST_ENFORCE=1"; exit 1; }
done

echo "PASS production_loop_lnnnl_enforce"
echo "PASS production_loop_stale_enforce"
echo "PASS production_loop_tick_post_enforce"
