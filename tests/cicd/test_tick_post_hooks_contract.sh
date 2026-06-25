#!/usr/bin/env bash
# Contract: transform (WSJF) → relate (inbox, correlate) → infer (policy/upstream).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOOK="$ROOT/scripts/cicd/tick_post_hooks.sh"

test -x "$HOOK"

line() { grep -n "$1" "$HOOK" | head -1 | cut -d: -f1; }
wsjf_line="$(line 'update_lnnnl.py')"
inbox_line="$(line 'inbox_zero_timescape')"
correlate_line="$(line 'correlate_timescape_evidence.py')"
envelope_line="$(line 'timescape_envelope.py')"
policy_line="$(line 'tick_cycle_policy.py')"
upstream_line="$(line 'upstream_upgrade_engine.py')"

[[ -n "$wsjf_line" && -n "$inbox_line" && "$wsjf_line" -lt "$inbox_line" ]] || {
  echo "FAIL: WSJF must run before inbox (lines $wsjf_line vs $inbox_line)"; exit 1; }
[[ -n "$inbox_line" && -n "$correlate_line" && "$inbox_line" -lt "$correlate_line" ]] || {
  echo "FAIL: inbox must run before correlate"; exit 1; }
[[ -n "$correlate_line" && -n "$envelope_line" && "$correlate_line" -lt "$envelope_line" ]] || {
  echo "FAIL: correlate must run before timescape_envelope"; exit 1; }
[[ -n "$wsjf_line" && -n "$upstream_line" && "$wsjf_line" -lt "$upstream_line" ]] || {
  echo "FAIL: WSJF must run before upstream"; exit 1; }
[[ -n "$policy_line" && -n "$upstream_line" && "$policy_line" -lt "$upstream_line" ]] || {
  echo "FAIL: tick_cycle_policy must run before upstream"; exit 1; }

grep -q 'AF_CORRELATE_ENFORCE' "$HOOK" || { echo "FAIL: missing AF_CORRELATE_ENFORCE"; exit 1; }
grep -q 'max_roi_cycles' "$HOOK" || { echo "FAIL: missing max_roi_cycles"; exit 1; }
grep -q 'env_key_resolver' "$HOOK" || { echo "FAIL: missing env_key_resolver"; exit 1; }

if grep -q 'update_lnnnl' "$ROOT/scripts/cicd/wave_autopilot.sh"; then
  echo "FAIL: wave_autopilot must not call update_lnnnl (single WSJF owner)"; exit 1
fi

grep -q 'tick_post_hooks' "$ROOT/scripts/cicd/run_loop_tick.sh" || {
  echo "FAIL: run_loop_tick must invoke tick_post_hooks"; exit 1; }

echo "PASS tick_post_hooks_contract"
grep -q 'ceremony_tick.sh' "$HOOK" || { echo "FAIL: missing ceremony_tick.sh"; exit 1; }
grep -q 'receipt_chain.sh' "$HOOK" || { echo "FAIL: missing receipt_chain.sh"; exit 1; }
grep -q 'llm_model_registry.py' "$HOOK" || { echo "FAIL: missing llm_model_registry"; exit 1; }
