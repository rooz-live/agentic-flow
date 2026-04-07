#!/bin/bash
# la-health-check.sh — LaunchAgent health reporter for bhopti-legal pipeline
#
# Usage:
#   la-health-check.sh              full status table (all bhopti/wsjf agents)
#   la-health-check.sh --json       JSON output
#   la-health-check.sh --fail-only  show only FAIL agents
#   la-health-check.sh --summary    one-line pass/fail count
#
# Status meanings:
#   RUNNING  — agent has an active PID and last exit was 0
#   IDLE_HEALTHY — no active PID, last exit 0 (normal for interval-based agents)
#   FAIL     — no active PID, last exit non-zero
#   UNKNOWN  — label not found in launchctl list
#
# Exit codes:
#   0  — all agents IDLE or RUNNING
#   1  — one or more FAIL agents
#   2  — launchctl unavailable

set -uo pipefail

OUTPUT_JSON=false
FAIL_ONLY=false
SUMMARY=false

for _a in "$@"; do
  case "$_a" in
    --json)      OUTPUT_JSON=true ;;
    --fail-only) FAIL_ONLY=true ;;
    --summary)   SUMMARY=true ;;
  esac
done

if ! command -v launchctl &>/dev/null; then
  echo "ERROR: launchctl not available" >&2; exit 2
fi

# ─── AGENT LIST ───────────────────────────────────────────────────────────────
# Add or remove labels here as agents are added/removed
AGENTS=(
  "com.bhopti.legal.filewatcher"
  "com.bhopti.legal.portalcheck"
  "com.bhopti.wsjf.email-dashboard"
  "com.bhopti.legal.validator13"
  "com.bhopti.legal.wsjf-escalator"
  "com.bhopti.legal.roam-watchdog"
  "com.bhopti.roam.staleness.watchdog"
  "com.bhopti.swarm.supervisor"
  "com.bhopti.validator12.enhanced"
  "com.wsjf.validator"
)

# ─── LAUNCHCTL SNAPSHOT ───────────────────────────────────────────────────────
# Format: "PID  exit_code  label"  (PID = "-" if not running)
_lctl=$(launchctl list 2>/dev/null)

lookup_agent() {
  local label="$1"
  echo "$_lctl" | awk -v lbl="$label" '$3 == lbl { print $1, $2 }'
}

# ─── REPORT ───────────────────────────────────────────────────────────────────
fail_count=0
total_count=0
healthy_count=0

if $OUTPUT_JSON; then echo "["; first=true; fi
if ! $OUTPUT_JSON && ! $SUMMARY; then
  printf '%-12s  %-40s  %s\n' "STATUS" "LABEL" "LAST_EXIT"
  printf '%s\n' "------------------------------------------------------------------------"
fi

for label in "${AGENTS[@]}"; do
  info=$(lookup_agent "$label")
  pid=$(echo "$info" | awk '{print $1}')
  exitcode=$(echo "$info" | awk '{print $2}')

  if [[ -z "$info" ]]; then
    status="UNKNOWN"
    exitcode="?"
    pid="-"
  elif [[ "$pid" != "-" ]]; then
    status="RUNNING"
  elif [[ "$exitcode" == "0" ]]; then
    status="IDLE_HEALTHY"
  else
    status="FAIL"
    ((fail_count++))
  fi
  if [[ "$status" == "RUNNING" || "$status" == "IDLE_HEALTHY" ]]; then
    ((healthy_count++))
  fi

  ((total_count++))

  if $FAIL_ONLY && [[ "$status" != "FAIL" ]]; then continue; fi

  if $OUTPUT_JSON; then
    $first || echo ","
    first=false
    printf '  {"label":"%s","status":"%s","pid":"%s","last_exit":"%s"}' \
      "$label" "$status" "$pid" "$exitcode"
  elif ! $SUMMARY; then
    case "$status" in
      RUNNING) marker="✅" ;;
      IDLE_HEALTHY) marker="⚪" ;;
      FAIL)    marker="🔴" ;;
      *)       marker="❓" ;;
    esac
    printf '%s %-10s  %-40s  exit=%s\n' "$marker" "$status" "$label" "$exitcode"
  fi
done

if $OUTPUT_JSON; then echo ""; echo "]"; fi

if $SUMMARY; then
  good=$((total_count - fail_count))
  echo "${good}/${total_count} healthy | ${fail_count} FAIL"
fi

# ─── JSONL EVENT EMISSION ─────────────────────────────────────────────────────
# Emit a unified JSONL event for monitoring dashboards/log streams
EVENTS_LOG="${HOME}/Library/Logs/wsjf-events.jsonl"
_severity="INFO"
_status="PASS"
[[ "$fail_count" -gt 0 ]] && _severity="WARN" && _status="FAIL"
_ts=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%s)
printf '{"timestamp":"%s","component":"la-health-check","mode":"health","action":"check","target":"launchagents","status":"%s","severity":"%s","evidence_path":"healthy=%d,fail=%d,total=%d"}\n' \
  "$_ts" "$_status" "$_severity" "$healthy_count" "$fail_count" "$total_count" \
  >> "$EVENTS_LOG" 2>/dev/null || true

[[ "$fail_count" -gt 0 ]] && exit 1 || exit 0
