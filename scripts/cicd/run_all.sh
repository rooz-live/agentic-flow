#!/usr/bin/env bash
# run_all.sh — Two-tier CI runner: fast (gates/pace/provenance) + slow (OP live/deploy).
#
# FAST TIER (default, ~30-60s):
#   coherence gate, scorecard gate, pytest, pace read, provenance emit
#   Gives rapid go/no-go on shippable state — run this on every push.
#
# SLOW TIER (opt-in via --slow or AF_RUN_ALL_SLOW=1, minutes):
#   upstream upgrade, edge gateway sync, OP live checks, deploy verification
#   Decoupled from fast-feedback loop — run on merge or scheduled tick.
#
# Usage:
#   bash scripts/cicd/run_all.sh              # fast tier only
#   bash scripts/cicd/run_all.sh --slow       # fast + slow tiers
#   bash scripts/cicd/run_all.sh --slow-only  # slow tier only (skip fast)
#   AF_RUN_ALL_SLOW=1 bash scripts/cicd/run_all.sh  # env-driven slow

set -euo pipefail
ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$ROOT"
source "$ROOT/scripts/cicd/lib/is_ci_env.sh"

FAST=1
SLOW=0
for _a in "$@"; do
  case "$_a" in
    --slow)      SLOW=1 ;;
    --slow-only) FAST=0; SLOW=1 ;;
    --fast-only) FAST=1; SLOW=0 ;;
  esac
done
[[ "${AF_RUN_ALL_SLOW:-0}" == "1" ]] && SLOW=1

FAST_EXIT=0
SLOW_EXIT=0

# ─── FAST TIER ────────────────────────────────────────────────────────────────
if [[ "$FAST" == "1" ]]; then
  echo "=== run_all: FAST TIER ==="

  echo "--- coherence ---"
  set +e
  bash "$ROOT/scripts/one.sh" coherence
  FAST_EXIT=$?
  set -e
  [[ $FAST_EXIT -ne 0 ]] && echo "FAST TIER FAIL: coherence (exit=$FAST_EXIT)"

  if [[ $FAST_EXIT -eq 0 ]]; then
    echo "--- scorecard gate ---"
    set +e
    AF_GATE_CONTEXT="${AF_GATE_CONTEXT:-precommit}" \
      python3 "$ROOT/scripts/gates/scorecard_gate.py" \
        --file "$ROOT/.goalie/scorecards/current.json" \
        --json --ingest-only 2>/dev/null \
      | python3 -c "
import json,sys
d=json.load(sys.stdin)
disp=d.get('disposition','?')
print(f'scorecard: disposition={disp}')
sys.exit(0 if disp=='SHIP' else 1)
"
    FAST_EXIT=$?
    set -e
    [[ $FAST_EXIT -ne 0 ]] && echo "FAST TIER FAIL: scorecard gate (exit=$FAST_EXIT)"
  fi

  if [[ $FAST_EXIT -eq 0 ]]; then
    echo "--- pytest (fast) ---"
    set +e
    python3 -m pytest tests/pytest/ -q --tb=line \
      --ignore=tests/pytest/test_upstream_ci_loop.py 2>&1 | tail -5
    FAST_EXIT=$?
    set -e
    [[ $FAST_EXIT -ne 0 ]] && echo "FAST TIER FAIL: pytest (exit=$FAST_EXIT)"
  fi

  if [[ $FAST_EXIT -eq 0 ]]; then
    echo "--- pace read ---"
    set +e
    python3 "$ROOT/scripts/metrics/pace_from_lnnnl.py" --json 2>/dev/null \
      | python3 -c "import json,sys; b=json.load(sys.stdin); print(f\"pace_source={b.get('pace_source','?')} pace_cod_weight={b.get('pace_cod_weight','?')}\")"
    set -e
  fi

  if [[ $FAST_EXIT -eq 0 && -x "$ROOT/scripts/gates/emit_ci_provenance.sh" ]]; then
    echo "--- provenance ---"
    set +e
    # Named-skip list: AF_CI_SIGNING_KEY absent → skip is documented, not silenced.
    # Bare || true is banned; capture rc and warn instead.
    bash "$ROOT/scripts/gates/emit_ci_provenance.sh" 2>/dev/null
    _PROV_EXIT=$?
    set -e
    if [[ $_PROV_EXIT -ne 0 ]]; then
      if [[ -z "${AF_CI_SIGNING_KEY:-}" ]]; then
        echo "WARN: provenance emit skipped (AF_CI_SIGNING_KEY absent — expected in forks/local; document blocker if CI)"
      else
        echo "FAST TIER FAIL: provenance emit (exit=$_PROV_EXIT)"
        FAST_EXIT=$_PROV_EXIT
      fi
    fi
  fi

  if [[ $FAST_EXIT -eq 0 ]]; then
    echo "FAST TIER: PASS"
  else
    echo "FAST TIER: FAIL (exit=$FAST_EXIT)"
  fi
fi

# ─── SLOW TIER ────────────────────────────────────────────────────────────────
if [[ "$SLOW" == "1" ]]; then
  echo "=== run_all: SLOW TIER ==="

  echo "--- upstream upgrade (dry-run unless AF_UPSTREAM_FULL=1) ---"
  set +e
  if [[ "${AF_UPSTREAM_FULL:-0}" == "1" ]]; then
    python3 "$ROOT/scripts/cicd/upstream_upgrade_engine.py" --print-receipt
  else
    python3 "$ROOT/scripts/cicd/upstream_upgrade_engine.py" --dry-run
  fi
  SLOW_EXIT=$?
  set -e
  [[ $SLOW_EXIT -ne 0 ]] && echo "SLOW TIER WARN: upstream (exit=$SLOW_EXIT)"

  echo "--- edge gateway sync (dry-run unless AF_EDGE_SYNC_FULL=1) ---"
  set +e
  if [[ -f "$ROOT/scripts/cicd/edge_gateway_sync_engine.py" ]]; then
    if [[ "${AF_EDGE_SYNC_FULL:-0}" == "1" ]]; then
      python3 "$ROOT/scripts/cicd/edge_gateway_sync_engine.py"
      _EDGE_EXIT=$?
    else
      python3 "$ROOT/scripts/cicd/edge_gateway_sync_engine.py" --dry-run 2>/dev/null
      _EDGE_EXIT=$?
    fi
    [[ $_EDGE_EXIT -ne 0 ]] && echo "SLOW TIER WARN: edge sync (exit=$_EDGE_EXIT; non-blocking in slow tier)"
  fi
  set -e

  echo "--- deploy receipt check ---"
  set +e
  # Named skip: fetch_run_report is advisory in slow tier; captured but not fatal.
  python3 "$ROOT/scripts/cicd/fetch_run_report.py" --context deploy 2>/dev/null | tail -5
  _DEPLOY_EXIT=${PIPESTATUS[0]}
  set -e
  [[ $_DEPLOY_EXIT -ne 0 ]] && echo "SLOW TIER WARN: deploy receipt check (exit=$_DEPLOY_EXIT; advisory)"

  if [[ $SLOW_EXIT -eq 0 ]]; then
    echo "SLOW TIER: PASS"
  else
    echo "SLOW TIER: WARN (non-zero exit; non-blocking by default)"
  fi
fi

# ─── SUMMARY ──────────────────────────────────────────────────────────────────
echo "=== run_all: DONE  fast_exit=$FAST_EXIT slow_exit=$SLOW_EXIT ==="
exit "$FAST_EXIT"
