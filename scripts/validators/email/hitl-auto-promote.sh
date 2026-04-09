#!/usr/bin/env bash
# hitl-auto-promote.sh — Watches validated/ and auto-promotes to sent/
# when Mail.app confirms dispatch via AppleScript Sent mailbox check.
#
# Designed to run via LaunchAgent on a StartInterval (e.g. every 5 min).
# Only promotes files that have been in validated/ for >60s (debounce).

set -euo pipefail

LEGAL_DIR="${LEGAL_DIR:-${HOME}/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL}"
VALIDATED_DIR="${LEGAL_DIR}/06-EMAILS/validated"
SENT_DIR="${LEGAL_DIR}/06-EMAILS/sent"
HITL_LOG="${LEGAL_DIR}/06-EMAILS/hitl-verification.log"
EVENTS_LOG="${HOME}/Library/Logs/wsjf-events.jsonl"
MIN_AGE_SECONDS=60

mkdir -p "$VALIDATED_DIR" "$SENT_DIR"
touch "$HITL_LOG"

emit_event() {
  local action="$1" target="$2" status="$3" severity="$4" evidence="$5"
  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%s)
  printf '{"timestamp":"%s","component":"hitl-auto-promote","action":"%s","target":"%s","status":"%s","severity":"%s","evidence_path":"%s"}\n' \
    "$ts" "$action" "$target" "$status" "$severity" "$evidence" >> "$EVENTS_LOG" 2>/dev/null || true
}

# Check if Mail.app is running
if ! pgrep -x "Mail" > /dev/null 2>&1; then
  emit_event "check" "Mail.app" "SKIP" "INFO" "Mail.app not running"
  exit 0
fi

promoted=0
skipped=0

for eml in "$VALIDATED_DIR"/*.eml; do
  [[ ! -f "$eml" ]] && continue
  fname=$(basename "$eml")

  # Debounce: skip files modified less than MIN_AGE_SECONDS ago
  file_mtime=$(stat -f %m "$eml" 2>/dev/null || echo 0)
  now=$(date +%s)
  age=$(( now - file_mtime ))
  if [[ $age -lt $MIN_AGE_SECONDS ]]; then
    ((skipped+=1))
    continue
  fi

  # Extract subject for Mail.app Sent mailbox lookup
  subject=$(grep -i "^Subject:" "$eml" | head -1 | sed 's/^Subject:[[:space:]]*//' | tr -d '\r' || echo "")
  if [[ -z "$subject" ]]; then
    ((skipped+=1))
    continue
  fi

  # AppleScript: check if subject appears in Sent mailbox (last 48h)
  found=$(osascript -e "
    tell application \"Mail\"
      try
        set sentBox to sent mailbox of account 1
        set msgs to messages of sentBox whose date sent > (current date) - (2 * days) and subject contains \"$(echo "$subject" | sed 's/"/\\"/g')\"
        if (count of msgs) > 0 then
          return \"FOUND\"
        else
          return \"NOT_FOUND\"
        end if
      on error
        return \"ERROR\"
      end try
    end tell
  " 2>/dev/null || echo "ERROR")

  if [[ "$found" == "FOUND" ]]; then
    # Promote to sent/
    mv "$eml" "$SENT_DIR/$fname"
    echo "$(date '+%Y-%m-%dT%H:%M:%S')|PROMOTED|$fname|Auto-promoted: Mail.app confirmed dispatch" >> "$HITL_LOG"
    emit_event "promote" "$fname" "PASS" "INFO" "Mail.app Sent mailbox confirmed"
    ((promoted+=1))
  else
    ((skipped+=1))
  fi
done

if [[ $promoted -gt 0 ]]; then
  emit_event "batch" "hitl-auto-promote" "PASS" "INFO" "promoted=$promoted,skipped=$skipped"
fi

exit 0
