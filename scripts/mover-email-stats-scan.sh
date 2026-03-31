#!/usr/bin/env bash
# mover-email-stats-scan.sh - Scan 02-EMAILS and mover subdirs for mover EML stats
# Output: JSON with drafted/validated/sent counts and unique recipient count
# @business-context WSJF-MOVE: mover ETA backed by email-backed stats

set -euo pipefail

LEGAL_ROOT="${LEGAL_ROOT:-$HOME/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL}"
MOVER_RE='mover|packer|unpacker|twomenandatruck|uhaul|moving|thumbtack'

drafted=0 validated=0 sent=0
declare -A RECIPIENTS

scan_eml() {
  local f="$1" status="$2"
  [[ -f "$f" ]] || return 0
  grep -qiE "$MOVER_RE" "$f" 2>/dev/null || return 0
  case "$status" in
    draft) ((drafted++)) ;;
    validated) ((validated++)) ;;
    sent) ((sent++)) ;;
  esac
  local to
  to=$(grep -i "^To:" "$f" 2>/dev/null | head -1 | grep -oE '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' | head -1)
  [[ -n "$to" ]] && RECIPIENTS[$to]=1
}

for f in "$LEGAL_ROOT/02-EMAILS/drafts"/*.eml "$LEGAL_ROOT/12-AMANDA-BECK-110-FRAZIER/movers"/*.eml 2>/dev/null; do
  scan_eml "$f" draft
done
for f in "$LEGAL_ROOT/02-EMAILS/validated"/*.eml "$LEGAL_ROOT/06-EMAILS/validated"/*.eml 2>/dev/null; do
  scan_eml "$f" validated
done
for f in "$LEGAL_ROOT/02-EMAILS/sent"/*.eml "$LEGAL_ROOT/12-AMANDA-BECK-110-FRAZIER/movers/sent"/*.eml 2>/dev/null; do
  scan_eml "$f" sent
done

unique_recipients=${#RECIPIENTS[@]}
total=$((drafted + validated + sent))

echo '{"moverEmails":'$total',"drafted":'$drafted',"validated":'$validated',"sent":'$sent',"uniqueRecipients":'$unique_recipients',"ts":'$(date +%s000)'}'
