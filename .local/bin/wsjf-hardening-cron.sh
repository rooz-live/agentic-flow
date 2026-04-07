#!/usr/bin/env bash
set -euo pipefail

ENV_ID="${ENV_ID:-}"
CYCLES_DEFAULT="${CYCLES_DEFAULT:-6}"
HOME_DIR="${HOME:-/Users/shahroozbhopti}"
WSJF_DIR="${HOME_DIR}/.wsjf"
STATE_FILE="${HOME_DIR}/.wsjf-hardening-state.json"
PROMPT_TEMPLATE="${WSJF_DIR}/master-cron-driver-prompt.txt"
PROMPT_RENDERED_DIR="${WSJF_DIR}/rendered-prompts"
AUDIT_DIR="${WSJF_DIR}/audits"
RUN_LOG_DIR="${HOME_DIR}/Library/Logs/wsjf-hardening"
EVENTS_JSONL="${RUN_LOG_DIR}/events.jsonl"
OUTPUT_LOG="${RUN_LOG_DIR}/wsjf-hardening-cron.log"

mkdir -p "${WSJF_DIR}" "${PROMPT_RENDERED_DIR}" "${AUDIT_DIR}" "${RUN_LOG_DIR}"
touch "${EVENTS_JSONL}" "${OUTPUT_LOG}"

usage() {
  cat <<EOF
Usage: $0 [--env ENV_ID] [--cycles N] [--init-t0] [--init-only] [--force-resume]

Options:
  --env ENV_ID      Oz cloud environment ID (or set ENV_ID env var)
  --cycles N        Max cycles to run (default: ${CYCLES_DEFAULT})
  --init-t0         Initialize baseline artifacts and state (read-only audit bootstrap)
  --init-only       Run initialization only and exit (no cloud cycle run)
  --force-resume    Resume even if state is HOLD (does not override STOP)
EOF
}

log() {
  printf '[%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*" | tee -a "${OUTPUT_LOG}" >/dev/null
}

emit_event() {
  local component="$1"
  local action="$2"
  local target="$3"
  local status="$4"
  local severity="$5"
  local evidence_path="$6"
  printf '{"timestamp":"%s","component":"%s","mode":"cron","action":"%s","target":"%s","status":"%s","severity":"%s","evidence_path":"%s"}\n' \
    "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "${component}" "${action}" "${target}" "${status}" "${severity}" "${evidence_path}" >> "${EVENTS_JSONL}"
}

read_state_value() {
  local key="$1"
  python3 - "$STATE_FILE" "$key" <<'PY'
import json, sys
state_file, key = sys.argv[1], sys.argv[2]
with open(state_file, 'r') as f:
    data = json.load(f)
value = data.get(key)
if isinstance(value, bool):
    print("true" if value else "false")
elif value is None:
    print("")
else:
    print(value)
PY
}

write_state() {
  local current_cycle="$1"
  local max_cycles="$2"
  local status="$3"
  local last_gate="$4"
  local reason="${5:-}"
  python3 - "$STATE_FILE" "$current_cycle" "$max_cycles" "$status" "$last_gate" "$reason" <<'PY'
import json, sys
state_file, current_cycle, max_cycles, status, last_gate, reason = sys.argv[1:]
payload = {
    "current_cycle": int(current_cycle),
    "max_cycles": int(max_cycles),
    "status": status,
    "last_gate": last_gate or None,
    "reason": reason or None,
    "updated_at": __import__("datetime").datetime.utcnow().isoformat() + "Z"
}
with open(state_file, "w") as f:
    json.dump(payload, f, indent=2)
PY
}

backup_targets() {
  local backup_dir="${AUDIT_DIR}/backups-$(date +%Y%m%dT%H%M%S)"
  mkdir -p "${backup_dir}"
  local targets=(
    "${HOME_DIR}/Library/LaunchAgents/com.wsjf.validator.plist"
    "${HOME_DIR}/Library/Scripts/bhopti/validate-email-wsjf.sh"
    "${HOME_DIR}/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/_SYSTEM/_AUTOMATION/file-to-wsjf-router.sh"
    "${HOME_DIR}/Documents/code/investing/agentic-flow/_SYSTEM/_AUTOMATION/validate-email.sh"
    "${HOME_DIR}/Documents/code/investing/agentic-flow/scripts/monitoring/tm_disk_guardian.sh"
  )
  for t in "${targets[@]}"; do
    if [[ -f "${t}" ]]; then
      cp "${t}" "${backup_dir}/$(basename "${t}").bak"
    fi
  done
  echo "${backup_dir}"
}

init_t0_baseline() {
  local ts
  ts="$(date +%Y%m%dT%H%M%S)"
  local report="${AUDIT_DIR}/t0-baseline-${ts}.md"
  local backup_dir
  backup_dir="$(backup_targets)"

  {
    echo "# T0 Baseline Audit (${ts})"
    echo
    echo "## Backups"
    echo "- backup_dir: ${backup_dir}"
    echo
    echo "## Disk Free"
    df -h / /System/Volumes/Data 2>&1 || true
    echo
    echo "## Time Machine Snapshots"
    tmutil listlocalsnapshots /System/Volumes/Data 2>&1 || true
    echo
    echo "## Key Directory Sizes"
    du -sh "${HOME_DIR}/.codeium" "${HOME_DIR}/.git/objects" "${HOME_DIR}/.cache" 2>&1 || true
    echo
    echo "## LaunchAgent Status"
    launchctl list | grep -E 'com\.wsjf\.validator' 2>&1 || true
    echo
    echo "## Exit Gates"
    echo "- no LaunchAgent restart loop"
    echo "- no duplicate routing"
    echo "- no false down for idle agents"
    echo "- stable disk trend after cleanup tasks"
  } > "${report}"

  write_state 1 "${CYCLES_DEFAULT}" "RUNNING" "INIT" ""
  emit_event "wsjf-hardening-cron" "init_t0" "${report}" "PASS" "INFO" "${report}"
  log "T0 baseline initialized: ${report}"
}

render_prompt() {
  local cycles="$1"
  local current_cycle="$2"
  local rendered="${PROMPT_RENDERED_DIR}/cycle-${current_cycle}.txt"
  python3 - "$PROMPT_TEMPLATE" "$rendered" "$cycles" "$current_cycle" <<'PY'
import sys
template_path, out_path, cycles, current_cycle = sys.argv[1:]
with open(template_path, "r") as f:
    content = f.read()
content = content.replace("{{CYCLES}}", str(cycles))
content = content.replace("{{CURRENT_CYCLE}}", str(current_cycle))
with open(out_path, "w") as f:
    f.write(content)
print(out_path)
PY
}

detect_gate_result() {
  local run_output="$1"
  python3 - "$run_output" <<'PY'
import re, sys
text = open(sys.argv[1], "r", errors="ignore").read()
patterns = [
    r"Gate result:\s*(PASS|HOLD|STOP)",
    r"DECISION:\s*(CONTINUE|HOLD|STOP)",
]
for pat in patterns:
    m = re.findall(pat, text, flags=re.IGNORECASE)
    if m:
        last = m[-1].upper()
        if last == "CONTINUE":
            print("PASS")
        else:
            print(last)
        sys.exit(0)
print("PASS")
PY
}

run_once() {
  if [[ -z "${ENV_ID}" ]]; then
    log "ENV_ID is required. Use --env or set ENV_ID."
    exit 2
  fi
  if [[ ! -f "${PROMPT_TEMPLATE}" ]]; then
    log "Prompt template missing: ${PROMPT_TEMPLATE}"
    exit 2
  fi

  if [[ ! -f "${STATE_FILE}" ]]; then
    write_state 1 "${CYCLES_DEFAULT}" "RUNNING" "INIT" ""
  fi

  local current_cycle max_cycles state_status
  current_cycle="$(read_state_value current_cycle)"
  max_cycles="$(read_state_value max_cycles)"
  state_status="$(read_state_value status)"

  if [[ "${state_status}" == "STOP" ]]; then
    log "State is STOP. Exiting."
    emit_event "wsjf-hardening-cron" "run_skipped" "state:${state_status}" "STOP" "WARN" "${STATE_FILE}"
    exit 0
  fi
  if [[ "${state_status}" == "HOLD" && "${FORCE_RESUME:-0}" != "1" ]]; then
    log "State is HOLD. Exiting (use --force-resume to continue)."
    emit_event "wsjf-hardening-cron" "run_skipped" "state:${state_status}" "HOLD" "WARN" "${STATE_FILE}"
    exit 0
  fi
  if (( current_cycle > max_cycles )); then
    write_state "${current_cycle}" "${max_cycles}" "COMPLETE" "PASS" ""
    log "All cycles completed (${max_cycles})."
    emit_event "wsjf-hardening-cron" "complete" "cycles:${max_cycles}" "PASS" "INFO" "${STATE_FILE}"
    exit 0
  fi

  local rendered_prompt run_output gate
  rendered_prompt="$(render_prompt "${max_cycles}" "${current_cycle}" | tail -n1)"
  run_output="${RUN_LOG_DIR}/cycle-${current_cycle}-$(date +%Y%m%dT%H%M%S).out"

  log "Running cycle ${current_cycle}/${max_cycles} in env ${ENV_ID}"
  if oz agent run-cloud --env "${ENV_ID}" --prompt-file "${rendered_prompt}" > "${run_output}" 2>&1; then
    gate="$(detect_gate_result "${run_output}")"
  else
    gate="HOLD"
    log "oz run-cloud exited non-zero; setting gate HOLD"
  fi

  case "${gate}" in
    PASS)
      write_state "$((current_cycle + 1))" "${max_cycles}" "RUNNING" "PASS" ""
      emit_event "wsjf-hardening-cron" "cycle_complete" "cycle:${current_cycle}" "PASS" "INFO" "${run_output}"
      ;;
    HOLD)
      write_state "${current_cycle}" "${max_cycles}" "HOLD" "HOLD" "Gate HOLD from cycle output"
      emit_event "wsjf-hardening-cron" "cycle_hold" "cycle:${current_cycle}" "HOLD" "WARN" "${run_output}"
      ;;
    STOP)
      write_state "${current_cycle}" "${max_cycles}" "STOP" "STOP" "Gate STOP from cycle output"
      emit_event "wsjf-hardening-cron" "cycle_stop" "cycle:${current_cycle}" "STOP" "ERROR" "${run_output}"
      ;;
    *)
      write_state "${current_cycle}" "${max_cycles}" "HOLD" "HOLD" "Unknown gate: ${gate}"
      emit_event "wsjf-hardening-cron" "cycle_unknown_gate" "cycle:${current_cycle}" "HOLD" "WARN" "${run_output}"
      ;;
  esac

  log "Cycle ${current_cycle} finished with gate ${gate}; output: ${run_output}"
}

INIT_T0=0
INIT_ONLY=0
FORCE_RESUME=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      ENV_ID="${2:-}"; shift 2 ;;
    --cycles)
      CYCLES_DEFAULT="${2:-6}"; shift 2 ;;
    --init-t0)
      INIT_T0=1; shift ;;
    --init-only)
      INIT_ONLY=1; shift ;;
    --force-resume)
      FORCE_RESUME=1; shift ;;
    --help|-h)
      usage; exit 0 ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1 ;;
  esac
done

if [[ "${INIT_T0}" == "1" ]]; then
  init_t0_baseline
fi
if [[ "${INIT_ONLY}" == "1" ]]; then
  log "Initialization-only mode complete; skipping cloud run."
  exit 0
fi

if [[ "${INIT_T0}" == "1" && -z "${ENV_ID}" ]]; then
  log "T0 initialized and ENV_ID not provided; skipping cloud run."
  exit 0
fi

run_once
