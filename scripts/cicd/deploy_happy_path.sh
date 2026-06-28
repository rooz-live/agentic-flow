#!/usr/bin/env bash
# deploy_happy_path.sh — DoR → swarm iterations → deploy-uapi → post-deploy TLD gate
#
# Usage:
#   bash scripts/cicd/deploy_happy_path.sh              # assess only (no deploy)
#   DEPLOY_HAPPY_CONFIRM=1 bash scripts/cicd/deploy_happy_path.sh   # full happy path
#   SWARM_ITERATIONS=2 DEPLOY_HAPPY_CONFIRM=1 ...       # N agentic iterations before deploy
#
# Env:
#   SWARM_ITERATIONS=1        wave_autopilot + iterate per rotation
#   DEPLOY_STRICT_GATE=1      run test:e2e:tld-gate:strict after deploy
#   DEPLOY_HAPPY_DRY_RUN=1    skip UAPI network calls (DoR + swarm only)
set -euo pipefail
ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$ROOT"
source "$ROOT/scripts/cicd/lib/cls_common.sh"

RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
EVIDENCE="$ROOT/.goalie/evidence/deploy_happy_path_${RUN_ID}.json"
ITERATIONS="${SWARM_ITERATIONS:-1}"
CONFIRM="${DEPLOY_HAPPY_CONFIRM:-0}"
DRY="${DEPLOY_HAPPY_DRY_RUN:-0}"
STRICT="${DEPLOY_STRICT_GATE:-0}"
LIGHT="${DEPLOY_HAPPY_LIGHT:-0}"
SWARM_TIMEOUT="${SWARM_TIMEOUT_SEC:-600}"
EXIT=0
PHASES=()

log_phase() { PHASES+=("$1"); echo "=== deploy_happy_path | $1 ==="; }

write_evidence() {
  python3 - "$EVIDENCE" "$RUN_ID" "$EXIT" "$ITERATIONS" "$CONFIRM" "$DRY" "$STRICT" <<PY
import json, sys
from datetime import datetime, timezone
from pathlib import Path
path, run_id, exit_code, iters, confirm, dry, strict = sys.argv[1:8]
phases = []
import os
raw = os.environ.get("HAPPY_PHASES_JSON", "[]")
try:
    phases = json.loads(raw)
except json.JSONDecodeError:
    phases = []
doc = {
    "schema": "deploy_happy_path.v1",
    "run_id": run_id,
    "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "swarm_iterations": int(iters),
    "deploy_confirm": confirm == "1",
    "dry_run": dry == "1",
    "strict_gate": strict == "1",
    "exit_code": int(exit_code),
    "phases": phases,
}
Path(path).parent.mkdir(parents=True, exist_ok=True)
Path(path).write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")
ln = Path(path).parent / "deploy_happy_path_latest.json"
if True:
    ln.write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")
print(path)
PY
}

record_phase() {
  local name="$1" status="$2" detail="${3:-}"
  HAPPY_PHASES_JSON="$(python3 - "$name" "$status" "$detail" <<'PYREC'
import json, os, sys
name, status, detail = sys.argv[1:4]
phases = json.loads(os.environ.get("HAPPY_PHASES_JSON", "[]"))
phases.append({"phase": name, "status": status, "detail": detail})
print(json.dumps(phases))
PYREC
)"
  export HAPPY_PHASES_JSON
}

# ── Phase 0: destination snapshot ───────────────────────────────────────────
log_phase "goal"
set +e
python3 "$ROOT/scripts/cicd/lib/roi_iterate.py" --json > "$ROOT/.goalie/evidence/roi_iterate_latest.json"
GOAL_EC=$?
set -e
record_phase "goal" "$([[ $GOAL_EC -eq 0 ]] && echo ok || echo warn)" "roi_iterate exit=$GOAL_EC"

# ── Phase 1: DoR (env + coherence) ──────────────────────────────────────────
log_phase "dor"
set +e
python3 "$ROOT/scripts/cicd/lib/env_key_resolver.py" --sync-roam >/dev/null 2>&1
bash "$ROOT/scripts/one.sh" coherence
COH_EC=$?
set -e
record_phase "dor" "$([[ $COH_EC -eq 0 ]] && echo ok || echo block)" "coherence exit=$COH_EC light=$LIGHT"
if [[ $COH_EC -ne 0 && "$LIGHT" != "1" ]]; then
  EXIT=$COH_EC
  write_evidence
  echo "deploy_happy_path: BLOCK at DoR (coherence failed; DEPLOY_HAPPY_LIGHT=1 for swarm-only)"
  exit "$EXIT"
fi
if [[ $COH_EC -ne 0 && "$LIGHT" == "1" ]]; then
  echo "deploy_happy_path: WARN coherence failed — continuing swarm-only (DEPLOY_HAPPY_LIGHT=1)"
fi

# ── Phase 2: swarm agentic iterations ───────────────────────────────────────
log_phase "swarm x${ITERATIONS}"
for i in $(seq 1 "$ITERATIONS"); do
  echo "--- swarm iteration $i/$ITERATIONS ---"
  export LOOP_TICK_COUNT="$i"
  set +e
  timeout "${SWARM_TIMEOUT}s" bash "$ROOT/scripts/cicd/wave_autopilot.sh"
  WA_EC=$?
  if [[ $WA_EC -eq 124 ]]; then
    echo "deploy_happy_path: swarm iteration $i timed out after ${SWARM_TIMEOUT}s"
  fi
  python3 "$ROOT/scripts/cicd/lib/ceremony_engine.py" --tick "$i" --json >/dev/null
  CYCLE_EC=0
  if [[ "${DEPLOY_HAPPY_CYCLE_FA:-0}" == "1" ]]; then
    bash "$ROOT/scripts/cicd/cycle_tick.sh" FA
    CYCLE_EC=$?
  fi
  set -e
  record_phase "swarm_${i}" "$([[ $WA_EC -eq 0 ]] && echo ok || echo warn)" "wave=$WA_EC cycle_fa=$CYCLE_EC"
  [[ $WA_EC -ne 0 && $EXIT -eq 0 ]] && EXIT=$WA_EC
done


# LIGHT mode: swarm assess only — never reach UAPI or strict gate with failed coherence
if [[ "$CONFIRM" == "1" && "$LIGHT" == "1" && $COH_EC -ne 0 ]]; then
  log_phase "deploy-blocked-light"
  record_phase "deploy" "block" "DEPLOY_HAPPY_LIGHT=1 cannot deploy with failed coherence"
  write_evidence
  echo "deploy_happy_path: BLOCK deploy — LIGHT mode is swarm-only when coherence failed"
  exit "${EXIT:-1}"
fi

# ── Phase 3: deploy (confirm-gated) ─────────────────────────────────────────
if [[ "$CONFIRM" != "1" ]]; then
  log_phase "deploy-skipped"
  record_phase "deploy" "skip" "set DEPLOY_HAPPY_CONFIRM=1 to deploy"
  write_evidence
  echo "deploy_happy_path: assess complete (deploy skipped — DEPLOY_HAPPY_CONFIRM=1 to run UAPI)"
  exit "${EXIT:-0}"
fi

if [[ "$DRY" == "1" ]]; then
  log_phase "deploy-dry-run"
  record_phase "deploy" "dry" "DEPLOY_HAPPY_DRY_RUN=1"
  write_evidence
  exit "${EXIT:-0}"
fi

log_phase "deploy-uapi"
set +e
bash "$ROOT/scripts/deploy/deploy-uapi.sh"
DEP_EC=$?
set -e
record_phase "deploy_uapi" "$([[ $DEP_EC -eq 0 ]] && echo ok || echo block)" "exit=$DEP_EC"
if [[ $DEP_EC -ne 0 ]]; then
  EXIT=$DEP_EC
  write_evidence
  exit "$EXIT"
fi


# ── Phase 4: post-deploy strict TLD gate (optional) ─────────────────────────
# Single dispatch: deploy-uapi already triggers strict CI by default.
if [[ "$STRICT" == "1" ]]; then
  log_phase "tld-gate-strict"
  TLD_EC=0
  DEPLOY_ART="$ROOT/.goalie/evidence/last_deploy_uapi.json"
  if [[ -f "$DEPLOY_ART" ]]; then
    TLD_VERIFY=$(python3 -c "
import json
d = json.load(open('$DEPLOY_ART', encoding='utf-8'))
status = d.get('tld_gate_status', '')
pw = int(d.get('playwright_exit', -1))
if status == 'pass' and pw == 0:
    print('pass')
elif status == 'fail_open':
    print('fail_open')
else:
    print('fail:' + str(status) + ':pw=' + str(pw))
" 2>/dev/null || echo 'fail:parse')
    case "$TLD_VERIFY" in
      pass)
        record_phase "tld_gate_strict" "ok" "dedupe: deploy-uapi already passed strict CI (single-dispatch)"
        ;;
      fail_open)
        if [[ "${AF_TLD_GATE_FAIL_OPEN:-0}" == "1" ]]; then
          record_phase "tld_gate_strict" "warn" "fail_open=1 receipt=deploy-uapi"
        else
          record_phase "tld_gate_strict" "fail" "fail_open without AF_TLD_GATE_FAIL_OPEN=1"
          TLD_EC=1
          EXIT=$TLD_EC
        fi
        ;;
      *)
        record_phase "tld_gate_strict" "fail" "receipt=$TLD_VERIFY (no duplicate CI dispatch)"
        TLD_EC=1
        EXIT=$TLD_EC
        ;;
    esac
  else
    export DEPLOY_RUN_ID="${RUN_ID:-happy}"
    export AF_TLD_GATE_REQUIRE_WAIT=1
    set +e
    bash "$ROOT/scripts/deploy/trigger_tld_gate_ci.sh"
    TLD_EC=$?
    set -e
    if [[ $TLD_EC -eq 0 ]]; then
      record_phase "tld_gate_strict" "ok" "exit=0 single-dispatch-no-deploy-artifact"
    else
      record_phase "tld_gate_strict" "fail" "exit=$TLD_EC"
      EXIT=$TLD_EC
    fi
  fi
fi

write_evidence
echo "deploy_happy_path: done exit=$EXIT run_id=$RUN_ID"
exit "$EXIT"
