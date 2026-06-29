#!/usr/bin/env bash
# Post-tick: transform (WSJF) → relate (inbox, correlate) → infer (pace/AQE/upstream).
set -euo pipefail
ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$ROOT"
# shellcheck source=scripts/cicd/lib/is_ci_env.sh
source "$ROOT/scripts/cicd/lib/is_ci_env.sh"
EVIDENCE_DIR="$ROOT/.goalie/evidence"
mkdir -p "$EVIDENCE_DIR"
TICK_POST_EVIDENCE="$EVIDENCE_DIR/tick_post_latest.json"
LNNNL_EXIT=0
ENV_EXPORT_OK=0
TICK_POST_EXIT=0
SAVED_PACE_BUNDLE=""

_tick_post_enforce_fail() {
  local label="$1"
  local ec="$2"
  [[ "$ec" -eq 0 ]] && return 0
  echo "WARN: $label failed (exit=$ec)"
  if [[ "${AF_TICK_POST_ENFORCE:-${AF_LNNNL_ENFORCE:-1}}" == "1" ]]; then
    TICK_POST_EXIT="$ec"
  fi
}

# Source export lines via fd-only process substitution (no disk-backed secret file).
_source_exports() {
  local exports="$1"
  set -a
  # shellcheck source=/dev/null
  source <(printf '%s\n' "$exports")
  set +a
}

read_pace_bundle() {
  LNNNL_EXIT="${LNNNL_EXIT:-0}" python3 "$ROOT/scripts/metrics/pace_from_lnnnl.py" \
    --from-lnnnl --json --lnnnl-exit "${LNNNL_EXIT:-0}" 2>/dev/null || echo '{"pace_source":"stale","pace_cod_weight":null}'
}

write_tick_evidence() {
  local bundle="${1:-{}}"
  python3 - "$TICK_POST_EVIDENCE" "$ENV_EXPORT_OK" "$LNNNL_EXIT" "$bundle" <<'PY'
import json, sys
from datetime import datetime, timezone
path, export_ok, lnnnl_exit, bundle_raw = sys.argv[1:5]
try:
    bundle = json.loads(bundle_raw)
except json.JSONDecodeError:
    bundle = {"pace_source": "stale", "pace_cod_weight": None}
pace = bundle.get("pace_cod_weight")
payload = {
    "schema": "tick_post.v2",
    "at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "env_export_ok": bool(int(export_ok)),
    "lnnnl_exit": int(lnnnl_exit),
    "pace_cod_weight": pace,
    "blocker_pace_cod_weight": bundle.get("blocker_pace_cod_weight"),
    "pace_source": bundle.get("pace_source", "unknown"),
    "utilize_mode_hint": bundle.get("utilize_mode_hint"),
    "shippable_lane_empty": bundle.get("shippable_lane_empty"),
    "blocker_lane_has_now": bundle.get("blocker_lane_has_now"),
    "af_skip_op_read": __import__("os").environ.get("AF_SKIP_OP_READ", "0"),
}
open(path, "w", encoding="utf-8").write(json.dumps(payload, indent=2) + "\n")
PY
}


_pace_bundle_json() {
  python3 "$ROOT/scripts/cicd/lib/reconcile_tick_post_pace.py" "$ROOT" --bundle-json 2>/dev/null     || read_pace_bundle
}

_refresh_saved_pace_bundle() {
  local policy_file="$EVIDENCE_DIR/tick_cycle_policy_latest.json"
  [[ -f "$policy_file" ]] || return 0
  SAVED_PACE_BUNDLE="$(_pace_bundle_json)"
}

on_exit() {
  local policy_file="$EVIDENCE_DIR/tick_cycle_policy_latest.json"
  local bundle
  if [[ -f "$policy_file" ]]; then
    bundle="$(_pace_bundle_json)"
    SAVED_PACE_BUNDLE="$bundle"
  else
    _refresh_saved_pace_bundle
    bundle="${SAVED_PACE_BUNDLE:-$(read_pace_bundle)}"
  fi
  write_tick_evidence "$bundle" || true
}
trap on_exit EXIT

echo "=== tick_post: env bootstrap (invert: OP forbidden unless AF_ALLOW_OP_READ=1) ==="
export AF_SKIP_OP_READ=1
BOOTSTRAP_LOG="$EVIDENCE_DIR/tick_bootstrap_latest.log"
: >"$BOOTSTRAP_LOG"
if [[ "${AF_ALLOW_OP_READ:-0}" == "1" ]]; then
  ENV_EXPORTS="$(
    AF_ALLOW_OP_READ=1 AF_SKIP_OP_READ=0       python3 "$ROOT/scripts/cicd/lib/env_key_resolver.py" --tick-bootstrap 2>>"$BOOTSTRAP_LOG" || true
  )"
else
  ENV_EXPORTS="$(
    python3 "$ROOT/scripts/cicd/lib/env_key_resolver.py" --tick-bootstrap 2>>"$BOOTSTRAP_LOG" || true
  )"
fi
if [[ "${AF_QUIET:-0}" != "1" ]] && [[ -s "$BOOTSTRAP_LOG" ]]; then
  tail -5 "$BOOTSTRAP_LOG" >&2 || true
fi
if [[ -n "$ENV_EXPORTS" ]] && grep -qE '^export ' <<<"$ENV_EXPORTS"; then
  _source_exports "$ENV_EXPORTS"
  ENV_EXPORT_OK=1
else
  echo "WARN: tick-bootstrap produced no exports (OP skipped or keys absent)"
fi
export AF_SKIP_OP_READ=1

echo "=== tick_post: WSJF (single owner; before relate/upstream) ==="
set +e
AF_SKIP_ROAM_SYNC=1 python3 "$ROOT/scripts/cicd/update_lnnnl.py"
LNNNL_EXIT=$?
set -e
if [[ "$LNNNL_EXIT" -ne 0 ]]; then
  if [[ "$LNNNL_EXIT" -eq 2 ]]; then
    echo "WARN: update_lnnnl stale ROAM gate (exit=$LNNNL_EXIT)"
    if [[ "${AF_LNNNL_STALE_ENFORCE:-1}" == "1" || "${AF_LNNNL_ENFORCE:-1}" == "1" ]]; then
      echo "BLOCK: AF_LNNNL_STALE_ENFORCE/AF_LNNNL_ENFORCE"
      exit "$LNNNL_EXIT"
    fi
  else
    echo "WARN: update_lnnnl failed (exit=$LNNNL_EXIT)"
    if [[ "${AF_LNNNL_ENFORCE:-1}" == "1" ]]; then
      echo "BLOCK: AF_LNNNL_ENFORCE"
      exit "$LNNNL_EXIT"
    fi
  fi
fi

SAVED_PACE_BUNDLE="$(read_pace_bundle)"
PACE="$(python3 -c "import json,sys; print(json.load(sys.stdin).get('pace_cod_weight') or 0.5)" <<<"$SAVED_PACE_BUNDLE")"
echo "pace_cod_weight=$PACE pace_source=$(python3 -c "import json,sys; print(json.load(sys.stdin).get('pace_source','unknown'))" <<<"$SAVED_PACE_BUNDLE")"

echo "=== tick_post: max_roi_cycles ==="
python3 "$ROOT/scripts/metrics/max_roi_cycles.py" --write-evidence || echo "WARN: max_roi_cycles calculation failed"

if [[ "${CEREMONY_RAN:-0}" != "1" && -x "$ROOT/scripts/cicd/ceremony_tick.sh" ]]; then
  echo "=== tick_post: bounded ceremony (CEREMONY_RAN!=1) ==="
  set +e
  timeout "${CEREMONY_MAX_MINUTES:-5}m" bash "$ROOT/scripts/cicd/ceremony_tick.sh" > "$EVIDENCE_DIR/ceremony_unit_latest.json" 2>/dev/null
  CER_EC=$?
  set -e
  [[ $CER_EC -ne 0 ]] && echo "WARN: ceremony exited $CER_EC"
fi

UTILIZE_MODE_HINT="$(python3 -c "import json,sys; print(json.load(sys.stdin).get('utilize_mode_hint','full'))" <<<"$SAVED_PACE_BUNDLE")"
POLICY="$(python3 "$ROOT/scripts/cicd/lib/tick_cycle_policy.py" --pace "$PACE" --json --utilize-mode-hint "$UTILIZE_MODE_HINT")"
MAX_MIN="$(python3 -c "import json,sys; print(json.load(sys.stdin)['max_minutes_per_tick'])" <<<"$POLICY")"
RUN_AQE="$(python3 -c "import json,sys; print('1' if json.load(sys.stdin)['run_aqe'] else '0')" <<<"$POLICY")"
RUN_UP="$(python3 -c "import json,sys; print('1' if json.load(sys.stdin)['run_upstream'] else '0')" <<<"$POLICY")"
UTILIZE_MODE="$(python3 -c "import json,sys; print(json.load(sys.stdin).get('utilize_mode','full'))" <<<"$POLICY")"
echo "cycle_policy: max_minutes=$MAX_MIN run_aqe=$RUN_AQE run_upstream=$RUN_UP mode=$UTILIZE_MODE"

if [[ "$RUN_AQE" == "1" ]]; then
  AQE_PHASE_MIN="${AQE_PHASE_TIMEOUT_MIN:-15}"
  if [[ "$UTILIZE_MODE" == "deferrable" || "$UTILIZE_MODE" == "blocker-remediation" ]]; then
    AQE_PHASE_MIN="${AQE_UTILIZE_PHASE_MIN:-5}"
  fi
  if [[ "$AQE_PHASE_MIN" -gt "$MAX_MIN" ]]; then
    AQE_PHASE_MIN="$MAX_MIN"
  fi
  echo "=== tick_post: scoped AQE (${AQE_PHASE_MIN}m/phase; knob max=${MAX_MIN}m) ==="
  LLM_EXPORTS="$(python3 "$ROOT/scripts/cicd/lib/llm_model_registry.py" --export-shell 2>/dev/null || true)"
  if [[ -n "$LLM_EXPORTS" ]] && grep -qE '^export ' <<<"$LLM_EXPORTS"; then
    _source_exports "$LLM_EXPORTS"
  fi
  set +e
  timeout "${AQE_PHASE_MIN}m" bash "$ROOT/scripts/one.sh" aqe quality --gate
  _tick_post_enforce_fail "aqe quality" $?
  timeout "${AQE_PHASE_MIN}m" bash "$ROOT/scripts/one.sh" aqe coverage src/ --threshold 80
  _tick_post_enforce_fail "aqe coverage" $?
  set -e
else
  echo "SKIP AQE: pace=$PACE cycle policy deferred"
fi

if [[ "$RUN_UP" == "1" ]]; then
  set +e
  python3 "$ROOT/scripts/cicd/upstream_upgrade_engine.py" --dry-run
  _tick_post_enforce_fail "upstream dry-run" $?
  set -e
else
  echo "SKIP upstream: cycle policy deferred"
fi

echo "$POLICY" > "$EVIDENCE_DIR/tick_cycle_policy_latest.json"
_refresh_saved_pace_bundle || echo "WARN: tick_post pace reconcile skipped"

echo "=== tick_post: inbox_zero_timescape (post-policy/AQE) ==="
bash "$ROOT/scripts/metrics/inbox_zero_timescape.sh" || _tick_post_enforce_fail "inbox_zero_timescape" $?

CORRELATE_EXIT=0
if [[ -f "$ROOT/scripts/metrics/correlate_timescape_evidence.py" ]]; then
  set +e
  python3 "$ROOT/scripts/metrics/correlate_timescape_evidence.py"
  CORRELATE_EXIT=$?
  set -e
  if [[ $CORRELATE_EXIT -ne 0 ]]; then
    if [[ "${AF_CORRELATE_ENFORCE:-0}" == "1" ]]; then
      echo "CORRELATE BLOCK enforced (AF_CORRELATE_ENFORCE=1)"
      _tick_post_enforce_fail "correlate" "$CORRELATE_EXIT"
    else
      echo "WARN: correlate BLOCK (set AF_CORRELATE_ENFORCE=1 to hard-fail tick)"
    fi
  fi
fi

if [[ -f "$ROOT/scripts/metrics/timescape_envelope.py" ]]; then
  _ts_enforce_default=0
  if is_ci_env; then
    _ts_enforce_default=1
  fi
  AF_TIMESCAPE_ENFORCE="${AF_TIMESCAPE_ENFORCE:-$_ts_enforce_default}" \
    python3 "$ROOT/scripts/metrics/timescape_envelope.py" || _tick_post_enforce_fail "timescape_envelope" $?
fi

if [[ -x "$ROOT/scripts/cicd/pi_plan_sync.sh" ]]; then
  SKIP_WSJF=1 bash "$ROOT/scripts/cicd/pi_plan_sync.sh" || echo "WARN: pi_plan_sync failed"
fi

if [[ -x "$ROOT/scripts/cicd/receipt_chain.sh" ]]; then
  echo "=== tick_post: receipt_chain ==="
  _receipt_enforce_default=0
  if is_ci_env; then
    _receipt_enforce_default=1
  fi

  # CI fail-closed: ensure canonical scorecard exists before receipt enforce (SKIP → exit 1).
  if ! python3 "$ROOT/scripts/metrics/scorecard_resolver.py" --resolve-path >/dev/null 2>&1; then
    if [[ -f "$ROOT/.goalie/scorecards/required.json" ]]; then
      cp "$ROOT/.goalie/scorecards/required.json" "$ROOT/.goalie/scorecards/current.json"
      echo "tick_post: scorecard bootstrap from required.json (CI receipt enforce)"
    fi
  fi
  AF_RECEIPT_CHAIN_ENFORCE="${AF_RECEIPT_CHAIN_ENFORCE:-$_receipt_enforce_default}" bash "$ROOT/scripts/cicd/receipt_chain.sh" || _tick_post_enforce_fail "receipt_chain" $?
fi

exit "${TICK_POST_EXIT}"
