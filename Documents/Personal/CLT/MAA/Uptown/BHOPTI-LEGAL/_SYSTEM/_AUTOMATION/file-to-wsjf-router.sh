#!/bin/bash
# file-to-wsjf-router.sh
# MISSING LINK: Filesystem watcher → ROAM/WSJF auto-router
#
# Closes the gap: TRIAL-DEBRIEF, ARBITRATION-NOTICE, applications.json
# exist in folders but were never detected and routed to WSJF/ROAM.
#
# How it works:
#   - Runs every 30min via launchd (same interval as portal-check)
#   - find -newer last-scan-timestamp detects new/modified files
#   - Classifies by filename pattern → maps to ROAM row + escalation
#   - Updates ROAM-BOARD.csv Notes field
#   - Sends macOS notification + stores in RuVector memory
#   - Calls generate-wsjf-html.sh to rebuild dashboard
#
# Install:
#   Add to LaunchAgent or run manually:
#   launchctl load ~/Library/LaunchAgents/com.bhopti.legal.filewatcher.plist

LEGAL="/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL"
ROAM_FILE="${LEGAL}/_SYSTEM/_ROAM-BOARD.csv"
STATE_DIR="${HOME}/.bhopti-legal"
STAMP_FILE="${STATE_DIR}/file-watcher-last-scan.stamp"
SEEN_DB="${STATE_DIR}/seen-files.db"    # Dedup: prevents re-routing already-escalated files
LOG_FILE="${HOME}/Library/Logs/file-wsjf-router.log"
RED_LOG="${STATE_DIR}/red-escalations.log"
AUTO_DIR="${LEGAL}/_SYSTEM/_AUTOMATION"

# BACKFILL MODE: scan files newer than N days ago (default: 0)
# Usage: BACKFILL_DAYS=5 ./file-to-wsjf-router.sh
BACKFILL_DAYS="${BACKFILL_DAYS:-0}"

# ─── MODE CONFIGURATION ───────────────────────────────────────────────────────
# ROUTER_MODE: semi_auto (notify only, HITL required for ROAM update)
#              full_auto (notify + update ROAM + store memory + rebuild HTML)
# Override via env var ROUTER_MODE or --semi-auto / --full-auto CLI flags
ROUTER_MODE="${ROUTER_MODE:-full_auto}"

# ALL_FILES mode: ignore timestamp, scan everything (like BACKFILL_DAYS=9999)
# Usage: ./file-to-wsjf-router.sh --all-files
ALL_FILES=false

# Parse CLI args
for _arg in "$@"; do
  case "$_arg" in
    --all-files)               ALL_FILES=true ;;
    --semi-auto|--mode=semi_auto) ROUTER_MODE=semi_auto ;;
    --full-auto|--mode=full_auto) ROUTER_MODE=full_auto ;;
    --backfill=*)              BACKFILL_DAYS="${_arg#--backfill=}" ;;
    --context=*)               : ;; # accepted but unused (for compatibility with semi-auto.sh)
  esac
done

mkdir -p "${STATE_DIR}"
touch "${LOG_FILE}"
touch "${SEEN_DB}" 2>/dev/null || true

timestamp() { date '+%Y-%m-%d %H:%M:%S'; }
log() { echo "[$(timestamp)] $*" | tee -a "${LOG_FILE}"; }
notify() { osascript -e "display notification \"$2\" with title \"$1\" sound name \"Basso\"" 2>/dev/null || true; }

# ─── CLASSIFIER RULES (sourced from shared module) ───────────────────────────
# shellcheck source=./_classifier-rules.sh
source "${AUTO_DIR}/_classifier-rules.sh"

# ─── ROAM UPDATER ─────────────────────────────────────────────────────────────
update_roam() {
  local row_id="$1" note="$2"
  [[ "$row_id" == "none" ]] && return 0
  local ts; ts=$(date '+%Y-%m-%d')
  awk -v rowid=",$row_id," -v note="$note" -v ts="$ts" '
    { if (index($0, rowid) > 0) {
        n = split($0, arr, ",")
        arr[n] = arr[n] " [FILE-ROUTER:" ts ": " note "]"
        result = arr[1]
        for (i=2; i<=n; i++) result = result "," arr[i]
        print result
      } else { print $0 }
    }
  ' "$ROAM_FILE" > "${ROAM_FILE}.tmp" && mv "${ROAM_FILE}.tmp" "$ROAM_FILE" 2>/dev/null || true
}

# ─── RUVECTOR STORE ───────────────────────────────────────────────────────────
store_memory() {
  local key="$1" value="$2"
  # timeout 5: prevents npx from hanging indefinitely and blocking the router loop
  timeout 5 npx @claude-flow/cli@latest memory store \
    --key "$key" --value "$value" --namespace patterns 2>/dev/null || true
}

# ─── MAIN ─────────────────────────────────────────────────────────────────────
log "=== File-to-WSJF router started ==="

# Create initial stamp if missing (scan last 24h on first run)
if [[ ! -f "$STAMP_FILE" ]]; then
  touch -t "$(date -v-24H '+%Y%m%d%H%M' 2>/dev/null || date -d '24 hours ago' '+%Y%m%d%H%M')" "$STAMP_FILE" 2>/dev/null || touch "$STAMP_FILE"
  log "First run — scanning last 24h"
fi

# Backfill mode: override stamp with N days ago
if [[ "$BACKFILL_DAYS" -gt 0 ]]; then
  log "BACKFILL MODE: scanning last ${BACKFILL_DAYS} days"
  BACKFILL_STAMP="${STATE_DIR}/backfill.stamp"
  touch -t "$(date -v-${BACKFILL_DAYS}d '+%Y%m%d%H%M' 2>/dev/null || date -d "${BACKFILL_DAYS} days ago" '+%Y%m%d%H%M')" "$BACKFILL_STAMP" 2>/dev/null || touch "$BACKFILL_STAMP"
  EFFECTIVE_STAMP="$BACKFILL_STAMP"
else
  EFFECTIVE_STAMP="$STAMP_FILE"
fi

# ─── FILE DISCOVERY ───────────────────────────────────────────────────────────
log "MODE: ROUTER_MODE=${ROUTER_MODE} | ALL_FILES=${ALL_FILES} | BACKFILL_DAYS=${BACKFILL_DAYS}"

# Standard exclusions (git, DS_Store, tmp, legacy, node_modules, etc.)
_EXCL=(
  ! -path '*/.git/*'
  ! -name '.DS_Store'
  ! -name '*.tmp'
  ! -name '*.bak'
  ! -path '*/_LEGACY-ARCHIVE/*'
  ! -path '*/node_modules/*'
  ! -path '*/venv*/*'
  ! -path '*/__pycache__/*'
  ! -path '*/.agentic-qe/*'
  ! -path '*/archive.bak/*'
  ! -name '*.pyc'
)

if [[ "$ALL_FILES" == "true" ]]; then
  log "ALL-FILES MODE: scanning all files (timestamp filter disabled)"
  new_files=$(find "$LEGAL" -type f "${_EXCL[@]}" 2>/dev/null)
elif [[ "$BACKFILL_DAYS" -gt 0 ]]; then
  new_files=$(find "$LEGAL" -newer "$EFFECTIVE_STAMP" -type f "${_EXCL[@]}" 2>/dev/null)
else
  new_files=$(find "$LEGAL" -newer "$EFFECTIVE_STAMP" -type f "${_EXCL[@]}" 2>/dev/null)
fi

if [[ -z "$new_files" ]]; then
  log "No new files since last scan"
  touch "$STAMP_FILE"
  log "=== Router complete (no new files) ==="
  exit 0
fi

processed=0
escalations=0

while IFS= read -r filepath; do
  [[ -z "$filepath" ]] && continue

  # Skip files already routed — prevents duplicate ROAM entries on --backfill / --all-files reruns
  grep -qxF "$filepath" "$SEEN_DB" 2>/dev/null && continue

  classification=$(classify_file "$filepath")
  IFS=':' read -r roam_id level message <<< "$classification"

  # ── SMTP BOUNCE CONTENT SCAN (for .eml files) ──────────────────────────────
  bounce_detected=false
  bounce_code=""
  if scan_smtp_bounce "$filepath"; then
    bounce_detected=true
    bounce_code=$(get_bounce_code "$filepath")
    bounce_roam=$(get_bounce_roam_ref "$filepath")
    bounce_msg="SMTP BOUNCE ${bounce_code} — $(basename "$filepath")"
    log "🔴 BOUNCE DETECTED: ${filepath##*/} | code: ${bounce_code} | ROAM: ${bounce_roam}"
    echo "[$(timestamp)] BOUNCE:${bounce_code} | FILE: ${filepath} | ROAM: ${bounce_roam}" >> "${RED_LOG}"
    notify "🔴 SMTP BOUNCE" "${bounce_code}: ${filepath##*/} → ${bounce_roam}"
    # Escalate bounce to ROAM + memory regardless of filename classification
    if [[ "$ROUTER_MODE" == "full_auto" ]]; then
      update_roam "${bounce_roam}" "SMTP BOUNCE ${bounce_code} confirmed (file: ${filepath##*/})"
    fi
    store_memory "smtp-bounce-$(date +%s)" "{\"file\": \"${filepath##*/}\", \"path\": \"${filepath}\", \"code\": \"${bounce_code}\", \"roam\": \"${bounce_roam}\", \"level\": \"RED\", \"type\": \"smtp_bounce\"}"
    ((escalations++))
    ((processed++))
    echo "$filepath" >> "$SEEN_DB"  # mark as seen before continue
    continue  # bounce handled; skip filename classification for this file
  fi

  if [[ "$level" != "NONE" ]]; then
    log "${level}: ${filepath##*/} → ROAM:${roam_id} — ${message}"

    # ROAM update — FULL_AUTO only
    if [[ "$ROUTER_MODE" == "full_auto" ]]; then
      update_roam "$roam_id" "${message} (file: ${filepath##*/})"
    else
      log "SEMI-AUTO: ROAM update staged (not committed) for ${filepath##*/}"
    fi

    # Notify (both modes)
    local_icon="ℹ️"
    case "$level" in
      RED)    local_icon="🔴"; echo "[$(timestamp)] ${message} | FILE: ${filepath}" >> "${RED_LOG}" ;;
      YELLOW) local_icon="🟡" ;;
      GREEN)  local_icon="🟢" ;;
    esac
    notify "${local_icon} File Router [${ROUTER_MODE}]" "${filepath##*/} → ${message}"

    # Store in RuVector (both modes)
    store_memory "file-route-$(date +%s)" "{\"file\": \"${filepath##*/}\", \"path\": \"${filepath}\", \"roam\": \"${roam_id}\", \"level\": \"${level}\", \"mode\": \"${ROUTER_MODE}\", \"message\": \"${message}\"}"

    ((escalations++))
  else
    log "SKIP (unclassified): ${filepath##*/}"
  fi

  ((processed++))
  echo "$filepath" >> "$SEEN_DB"  # mark as seen (classified or not)
done <<< "$new_files"

# Update scan timestamp
touch "$STAMP_FILE"

log "Processed: ${processed} files, ${escalations} routed"

# Rebuild HTML dashboard — FULL_AUTO only
if [[ "$ROUTER_MODE" == "full_auto" ]]; then
  bash "${AUTO_DIR}/generate-wsjf-html.sh" 2>/dev/null || log "WARN: HTML rebuild failed"
else
  log "SEMI-AUTO: HTML rebuild skipped (HITL required — run with --full-auto to commit)"
fi

log "=== Router complete [mode: ${ROUTER_MODE}] | processed: ${processed} | escalated: ${escalations} ==="
