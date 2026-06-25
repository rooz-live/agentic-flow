#!/usr/bin/env bash
# Post-tick termination: relate (inbox, agentic, correlate) → WSJF once → pace-gated AQE/upstream.
set -euo pipefail
ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$ROOT"

read_pace_from_lnnnl() {
  python3 "$ROOT/scripts/metrics/pace_from_lnnnl.py" --from-lnnnl 2>/dev/null || echo "0.5"
}

echo "=== tick_post: inbox_zero_timescape ==="
bash "$ROOT/scripts/metrics/inbox_zero_timescape.sh"

PACE="$(python3 -c "import json; print(json.load(open('.goalie/evidence/inbox_zero_latest.json')).get('pace_cod_weight', 0))")"
echo "pace_cod_weight=$PACE (from inbox evidence; shippable-aware)"

echo "=== tick_post: agentic_time snapshot (emergent-time) ==="
if [[ -f "$ROOT/apps/agent-harness/scripts/agentic_time_snapshot.mjs" ]]; then
  node "$ROOT/apps/agent-harness/scripts/agentic_time_snapshot.mjs" || echo "WARN: agentic_time snapshot failed"
fi

CORRELATE_EXIT=0
if [[ -f "$ROOT/scripts/metrics/correlate_timescape_evidence.py" ]]; then
  set +e
  python3 "$ROOT/scripts/metrics/correlate_timescape_evidence.py"
  CORRELATE_EXIT=$?
  set -e
  if [[ $CORRELATE_EXIT -ne 0 ]]; then
    if [[ "${AF_CORRELATE_ENFORCE:-0}" == "1" ]]; then
      echo "CORRELATE BLOCK enforced (AF_CORRELATE_ENFORCE=1)"
      exit 1
    fi
    echo "WARN: correlate BLOCK (set AF_CORRELATE_ENFORCE=1 to hard-fail tick)"
  fi
fi

echo "=== tick_post: env key resolver (.env* + op://) ==="
python3 "$ROOT/scripts/cicd/lib/env_key_resolver.py" --sync-roam || echo "WARN: env_key_resolver failed"

echo "=== tick_post: WSJF (single owner per tick; before upstream pull) ==="
python3 "$ROOT/scripts/cicd/update_lnnnl.py" || echo "WARN: update_lnnnl failed (non-blocking)"

PACE="$(read_pace_from_lnnnl)"
echo "pace_cod_weight=$PACE (post-WSJF LNNNL; shippable LOOP_ITEM only)"

POLICY="$(python3 "$ROOT/scripts/cicd/lib/tick_cycle_policy.py" --pace "$PACE" --json)"
MAX_MIN="$(python3 -c "import json,sys; print(json.load(sys.stdin)['max_minutes_per_tick'])" <<<"$POLICY")"
RUN_AQE="$(python3 -c "import json,sys; print('1' if json.load(sys.stdin)['run_aqe'] else '0')" <<<"$POLICY")"
RUN_UP="$(python3 -c "import json,sys; print('1' if json.load(sys.stdin)['run_upstream'] else '0')" <<<"$POLICY")"
UTILIZE_MODE="$(python3 -c "import json,sys; print(json.load(sys.stdin).get('utilize_mode','full'))" <<<"$POLICY")"
echo "cycle_policy: max_minutes=$MAX_MIN run_aqe=$RUN_AQE run_upstream=$RUN_UP mode=$UTILIZE_MODE"

if [[ "$RUN_AQE" == "1" ]]; then
  AQE_PHASE_MIN="${AQE_PHASE_TIMEOUT_MIN:-15}"
  if [[ "$UTILIZE_MODE" == "deferrable" ]]; then
    AQE_PHASE_MIN="${AQE_UTILIZE_PHASE_MIN:-5}"
  fi
  if [[ "$AQE_PHASE_MIN" -gt "$MAX_MIN" ]]; then
    AQE_PHASE_MIN="$MAX_MIN"
  fi
  echo "=== tick_post: scoped AQE (${AQE_PHASE_MIN}m/phase; knob max=${MAX_MIN}m) ==="
  set +e
  timeout "${AQE_PHASE_MIN}m" bash "$ROOT/scripts/one.sh" aqe quality assess --scope changed || echo "WARN: aqe quality failed"
  timeout "${AQE_PHASE_MIN}m" bash "$ROOT/scripts/one.sh" aqe coverage analyze --paths src/ --threshold 80 || echo "WARN: aqe coverage failed"
  set -e
else
  echo "SKIP AQE: pace=$PACE cycle policy deferred"
fi

if [[ "$RUN_UP" == "1" ]]; then
  python3 "$ROOT/scripts/cicd/upstream_upgrade_engine.py" --dry-run || echo "WARN: upstream dry-run failed"
else
  echo "SKIP upstream: cycle policy deferred"
fi

if [[ -x "$ROOT/scripts/cicd/pi_plan_sync.sh" ]]; then
  SKIP_WSJF=1 bash "$ROOT/scripts/cicd/pi_plan_sync.sh" || true
fi

if [[ "${HIRE_SYNC_EARNINGS:-0}" == "1" && -x "$ROOT/scripts/hire/sync_earnings_to_hire.py" ]]; then
  echo "=== tick_post: earnings → hire.agentics.org sync ==="
  python3 "$ROOT/scripts/hire/sync_earnings_to_hire.py" || echo "WARN: hire earnings sync failed"
fi

exit 0
