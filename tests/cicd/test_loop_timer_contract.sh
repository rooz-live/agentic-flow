#!/usr/bin/env bash
# Contract: loop_timer_engine UX — LOOP_ONCE, LOOP_LIGHT, idle heartbeat, evidence phases.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENGINE="$ROOT/scripts/cicd/loop_timer_engine.sh"

test -x "$ENGINE"
grep -q 'loop_timer.v1' "$ENGINE"
grep -q 'AGENT_LOOP_WAKE_CLS' "$ENGINE"
grep -q 'LOOP_ONCE' "$ENGINE"
grep -q 'LOOP_LIGHT' "$ENGINE"
grep -q 'phase=idle' "$ENGINE"
grep -q 'idle_until' "$ENGINE"
grep -q 'next_tick_at' "$ENGINE"
grep -q 'LOOP_IDLE_TASK' "$ENGINE"
grep -q 'expected ticks' "$ENGINE"
grep -q 'interval_minutes' "$ROOT/config/cicd/loop_prompts.yaml"
grep -q 'loop)' "$ROOT/scripts/one.sh"

# tick_post: scoped AQE phase timeout (not full knob silent)
grep -q 'AQE_PHASE_TIMEOUT_MIN' "$ROOT/scripts/cicd/tick_post_hooks.sh"
! grep -q 'aqe quality assess --scope changed 2>/dev/null' "$ROOT/scripts/cicd/tick_post_hooks.sh" \
  || { echo "FAIL: aqe stderr still redirected to /dev/null"; exit 1; }

echo "PASS loop_timer_contract"
