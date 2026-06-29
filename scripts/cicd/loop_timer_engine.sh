#!/usr/bin/env bash
# loop_timer_engine.sh — /loop engine: tick → optional idle task → heartbeat sleep → repeat.
# Env: LOOP_INTERVAL_MINUTES, LOOP_DURATION_HOURS, LOOP_ONCE=1, LOOP_LIGHT=1,
#      LOOP_IDLE_TASK=coherence|upstream-dry-run|ceremony|timescape, LOOP_CEREMONY=light|full,
#      LOOP_HEARTBEAT_SECONDS=60
set -euo pipefail
ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$ROOT"
export AF_LNNNL_ENFORCE="${AF_LNNNL_ENFORCE:-1}"
export AF_TICK_POST_ENFORCE="${AF_TICK_POST_ENFORCE:-1}"
export AF_LNNNL_STALE_ENFORCE="${AF_LNNNL_STALE_ENFORCE:-1}"
export AF_ALLOW_OP_READ="${AF_ALLOW_OP_READ:-1}"

source "$ROOT/scripts/cicd/lib/cls_common.sh"

read_timer_cfg() {
  python3 - <<'PY'
import os, yaml
from pathlib import Path
root = Path(os.environ.get("REPO_ROOT", "."))
cfg = {}
p = root / "config/cicd/loop_prompts.yaml"
if p.is_file():
    doc = yaml.safe_load(p.read_text(encoding="utf-8")) or {}
    cfg = doc.get("timer") or {}
interval = int(os.environ.get("LOOP_INTERVAL_MINUTES", cfg.get("interval_minutes", 20)))
duration = float(os.environ.get("LOOP_DURATION_HOURS", cfg.get("duration_hours", 4)))
idle_task = os.environ.get("LOOP_IDLE_TASK", cfg.get("default_idle_task", ""))
ceremony_in_idle = "1" if cfg.get("ceremony_in_idle") else "0"
loop_iterate = "0" if cfg.get("iterate_after_tick") is False else "1"
print(f"{interval} {duration} {idle_task} {ceremony_in_idle} {loop_iterate}")
PY
}

write_loop_evidence() {
  # Args: phase + optional extra JSON keys via env LOOP_EVIDENCE_EXTRA
  local phase="$1"
  python3 - "$EVIDENCE" "$phase" <<'PY'
import json, os, sys
from datetime import datetime, timezone
from pathlib import Path

path, phase = Path(sys.argv[1]), sys.argv[2]
extra = {}
raw = os.environ.get("LOOP_EVIDENCE_EXTRA", "")
if raw.strip():
    extra = json.loads(raw)

doc = {
    "schema": "loop_timer.v1",
    "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "run_id": os.environ.get("RUN_ID", ""),
    "phase": phase,
    "ticks_completed": int(os.environ.get("TICKS", "0")),
    "failures": int(os.environ.get("FAILURES", "0")),
    "interval_minutes": int(os.environ.get("INTERVAL", "20")),
    "duration_hours": float(os.environ.get("DURATION_HOURS", "4")),
    "loop_once": os.environ.get("LOOP_ONCE", "0") == "1",
    "loop_light": os.environ.get("LOOP_LIGHT", "0") == "1",
    "idle_task": os.environ.get("LOOP_IDLE_TASK", ""),
    **extra,
}
if "last_tick_exit" in os.environ:
    doc["last_tick_exit"] = int(os.environ["last_tick_exit"])
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")
PY
}



run_roi_iterate() {
  [[ "${LOOP_ITERATE:-1}" == "0" ]] && return 0
  echo "loop_timer: roi iterate (goal + ceremony + next step)"
  timeout "${LOOP_ITERATE_MAX_MINUTES:-3}m" python3 "$ROOT/scripts/cicd/lib/roi_iterate.py" --json     > "$ROOT/.goalie/evidence/roi_iterate_latest.json"     || echo "WARN: roi iterate failed"
}

run_between_cycle_ceremony() {
  local tick_no="${1:-1}"
  [[ "${LOOP_CEREMONY:-light}" == "off" ]] && return 0
  [[ "${CEREMONY_IN_IDLE:-0}" == "1" && "${LOOP_IDLE_TASK:-}" == "ceremony" ]] && return 0
  export LOOP_TICK_COUNT="$tick_no"
  echo "loop_timer: between-cycle ceremony (mode=${LOOP_CEREMONY}) tick=$tick_no"
  timeout "${LOOP_CEREMONY_MAX_MINUTES:-5}m" bash "$ROOT/scripts/cicd/ceremony_tick.sh"     || echo "WARN: between-cycle ceremony failed"
}

run_idle_task() {
  local task="${LOOP_IDLE_TASK:-}"
  [[ -z "$task" ]] && return 0
  local max_min="${LOOP_IDLE_MAX_MINUTES:-10}"
  echo "loop_timer: idle task=$task (max ${max_min}m)"
  case "$task" in
    coherence)
      timeout "${max_min}m" bash "$ROOT/scripts/one.sh" coherence || echo "WARN: idle coherence failed"
      ;;
    upstream-dry-run|upstream)
      timeout "${max_min}m" python3 "$ROOT/scripts/cicd/upstream_upgrade_engine.py" --dry-run \
        || echo "WARN: idle upstream dry-run failed"
      ;;
    timescape)
      timeout "${max_min}m" bash "$ROOT/scripts/metrics/inbox_zero_timescape.sh" || echo "WARN: idle timescape failed"
      timeout "${max_min}m" python3 "$ROOT/scripts/metrics/timescape_envelope.py" || echo "WARN: idle timescape_envelope failed"
      ;;
    ceremony)
      export LOOP_CEREMONY="${LOOP_CEREMONY_IDLE:-full}"
      export CEREMONY_IN_IDLE=1
      timeout "${max_min}m" bash "$ROOT/scripts/cicd/ceremony_tick.sh" || echo "WARN: idle ceremony failed"
      ;;
    *)
      echo "WARN: unknown LOOP_IDLE_TASK=$task (use coherence|upstream-dry-run|timescape|ceremony)"
      ;;
  esac
}

idle_sleep_with_heartbeat() {
  local sleep_secs="$1"
  local end_idle
  end_idle="$(($(date +%s) + sleep_secs))"
  local hb="${LOOP_HEARTBEAT_SECONDS:-60}"
  [[ "$hb" -lt 5 ]] && hb=60

  while [[ "$(date +%s)" -lt "$end_idle" ]]; do
    run_idle_task

    local now remain
    now="$(date +%s)"
    remain=$((end_idle - now))
    [[ $remain -le 0 ]] && break

    local idle_until next_tick
    idle_until="$(python3 -c "from datetime import datetime, timezone; print(datetime.fromtimestamp($end_idle, timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'))")"
    next_tick="$idle_until"

    export LOOP_EVIDENCE_EXTRA
    LOOP_EVIDENCE_EXTRA="$(python3 -c "import json; print(json.dumps({'idle_until': '$idle_until', 'next_tick_at': '$next_tick', 'idle_seconds_remaining': $remain}))")"
    write_loop_evidence "idle"

    echo "loop_timer: heartbeat phase=idle remaining=${remain}s next_tick_at=$next_tick"

    local slice=$hb
    [[ $remain -lt $slice ]] && slice=$remain
    sleep "$slice"
  done
}


run_tick() {
  if [[ "${LOOP_LIGHT:-0}" == "1" ]]; then
    echo "loop_timer: LOOP_LIGHT=1 → run_loop_tick.sh (skip dev_tick contracts)"
    bash "$ROOT/scripts/cicd/run_loop_tick.sh"
  elif [[ -x "$ROOT/scripts/cicd/dev_tick.sh" ]]; then
    bash "$ROOT/scripts/cicd/dev_tick.sh"
  else
    bash "$ROOT/scripts/cicd/run_loop_tick.sh"
  fi
}

read -r INTERVAL DURATION_HOURS DEFAULT_IDLE_TASK CEREMONY_IN_IDLE_CFG LOOP_ITERATE_CFG < <(REPO_ROOT="$ROOT" read_timer_cfg)
export CEREMONY_IN_IDLE="${CEREMONY_IN_IDLE:-$CEREMONY_IN_IDLE_CFG}"
export LOOP_IDLE_TASK="${LOOP_IDLE_TASK:-$DEFAULT_IDLE_TASK}"
export LOOP_CEREMONY="${LOOP_CEREMONY:-light}"
export LOOP_ITERATE="${LOOP_ITERATE:-$LOOP_ITERATE_CFG}"
START_EPOCH="$(date +%s)"
END_EPOCH="$(python3 -c "import time; print(int(time.time() + $DURATION_HOURS * 3600))")"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
EVIDENCE="$ROOT/.goalie/evidence/loop_timer_latest.json"
mkdir -p "$(dirname "$EVIDENCE")"

export ROOT RUN_ID INTERVAL DURATION_HOURS EVIDENCE
export LOOP_ONCE="${LOOP_ONCE:-0}" LOOP_LIGHT="${LOOP_LIGHT:-0}"

STATS="$(python3 -c "
import math
interval = int('$INTERVAL')
duration_h = float('$DURATION_HOURS')
duration_s = duration_h * 3600
interval_s = interval * 60
# first tick immediate; then sleeps between
if interval_s <= 0:
    expected = 1
else:
    expected = max(1, 1 + int(duration_s // interval_s))
sleep_total_min = max(0, (expected - 1) * interval)
if '${LOOP_ONCE}' == '1':
    expected = 1
    sleep_total_min = 0
print(f'{expected} {sleep_total_min}')
")"
read -r EXPECTED_TICKS TOTAL_SLEEP_MIN <<<"$STATS"

echo "══════════════════════════════════════════════════════════════"
echo "loop_timer /loop engine"
echo "  interval:      ${INTERVAL}m  (override: LOOP_INTERVAL_MINUTES)"
echo "  duration:      ${DURATION_HOURS}h (override: LOOP_DURATION_HOURS)"
echo "  expected ticks: ~${EXPECTED_TICKS}"
echo "  expected sleep: ~${TOTAL_SLEEP_MIN}m between ticks (idle is intentional)"
echo "  LOOP_ONCE:     ${LOOP_ONCE}  LOOP_LIGHT: ${LOOP_LIGHT}"
echo "  LOOP_IDLE_TASK: ${LOOP_IDLE_TASK:-<none>}"
echo "  evidence:      $EVIDENCE"
echo "  run_id:        $RUN_ID"
echo "══════════════════════════════════════════════════════════════"

TICKS=0
FAILURES=0

while [[ "$(date +%s)" -lt "$END_EPOCH" ]]; do
  TICKS=$((TICKS + 1))
  echo "=== loop_timer tick $TICKS @ $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

  export TICKS FAILURES
  LOOP_EVIDENCE_EXTRA="$(python3 -c "import json; print(json.dumps({'tick_number': $TICKS}))")"
  write_loop_evidence "tick"

  set +e
  run_tick
  EC=$?
  set -e
  export last_tick_exit=$EC
  [[ $EC -ne 0 ]] && FAILURES=$((FAILURES + 1))

  LOOP_EVIDENCE_EXTRA="$(python3 -c "import json; print(json.dumps({'tick_number': $TICKS, 'last_tick_exit': $EC}))")"
  write_loop_evidence "tick_complete"

  run_between_cycle_ceremony "$TICKS"
  run_roi_iterate

  if [[ "${LOOP_ONCE:-0}" == "1" ]]; then
    echo "loop_timer: LOOP_ONCE=1 — exiting after tick $TICKS (no inter-tick sleep)"
    break
  fi

  [[ "$(date +%s)" -ge "$END_EPOCH" ]] && break

  local_sleep_secs=$((INTERVAL * 60))
  echo "loop_timer: entering idle phase for ${INTERVAL}m (${local_sleep_secs}s) — heartbeat every ${LOOP_HEARTBEAT_SECONDS:-60}s"
  idle_sleep_with_heartbeat "$local_sleep_secs"
done

export TICKS FAILURES
LOOP_EVIDENCE_EXTRA='{}'
write_loop_evidence "done"

echo "loop_timer: done ticks=$TICKS failures=$FAILURES wall_s=$(($(date +%s) - START_EPOCH))"
echo "AGENT_LOOP_WAKE_CLS {\"run_id\":\"$RUN_ID\",\"ticks\":$TICKS,\"failures\":$FAILURES,\"loop_once\":${LOOP_ONCE:-0}}"
[[ $FAILURES -eq 0 ]]
