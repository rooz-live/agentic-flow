#!/usr/bin/env bash
# Post-tick termination: relate (inbox, agentic, correlate) → WSJF once → pace-gated AQE/upstream.
set -euo pipefail
ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$ROOT"

read_pace_from_lnnnl() {
  python3 - <<'PY'
import sys
from pathlib import Path
import yaml

sys.path.insert(0, str(Path("scripts/metrics")))
from pace_from_lnnnl import pace_cod_weight_from_schedule

lnnnl = Path(".goalie/LNNNL.yaml")
doc = yaml.safe_load(lnnnl.read_text(encoding="utf-8")) if lnnnl.is_file() else {}
print(pace_cod_weight_from_schedule(doc.get("schedule")))
PY
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

echo "=== tick_post: WSJF (single owner per tick; before upstream pull) ==="
python3 "$ROOT/scripts/cicd/update_lnnnl.py" || echo "WARN: update_lnnnl failed (non-blocking)"

PACE="$(read_pace_from_lnnnl)"
echo "pace_cod_weight=$PACE (post-WSJF LNNNL; shippable LOOP_ITEM only)"

if python3 -c "import sys; sys.exit(0 if float('${PACE}') >= 1.0 else 1)"; then
  echo "=== tick_post: pace>=1.0 — AQE then upstream (CoD-weighted) ==="
  bash "$ROOT/scripts/one.sh" aqe status 2>/dev/null || echo "SKIP aqe status"
  if bash "$ROOT/scripts/one.sh" aqe test --help >/dev/null 2>&1; then
    bash "$ROOT/scripts/one.sh" aqe test 2>/dev/null || echo "WARN: aqe test failed (non-blocking)"
  else
    bash "$ROOT/scripts/cicd/continuous_learning_swarm.sh" 2>/dev/null || echo "WARN: CLS fallback failed"
  fi
  python3 "$ROOT/scripts/cicd/upstream_upgrade_engine.py" --dry-run 2>/dev/null || true
else
  echo "SKIP AQE/upstream: post-WSJF pace_cod_weight=$PACE < 1.0 (non-shippable or deferrable)"
fi

if [[ -x "$ROOT/scripts/cicd/pi_plan_sync.sh" ]]; then
  SKIP_WSJF=1 bash "$ROOT/scripts/cicd/pi_plan_sync.sh" || true
fi

exit 0
