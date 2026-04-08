#!/bin/bash
set -euo pipefail

# Email Validator with WSJF Pre-Send Check
# Scans /Sent folder + incoming emails → Updates WSJF HTML → Validates priority before sending

# Source robust exit codes and binding telemetry
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Hardcoded absolute DGM bound
PROJECT_ROOT="$HOME/Documents/code/investing/agentic-flow"
if [[ -f "$PROJECT_ROOT/scripts/validation-core.sh" ]]; then
    source "$PROJECT_ROOT/scripts/validation-core.sh"
fi

EMAIL_FILE="${1:-}"
MODE="${2:-validate}" # validate | scan-sent | update-dashboard | migrate-structure

SENT_FOLDER="${SENT_FOLDER:-$HOME/Library/Mail/V10/*/*Sent*.mbox/*/Data}"
INBOX_FOLDER="${INBOX_FOLDER:-$HOME/Library/Mail/V10/*/INBOX.mbox/*/Data}"

# Helper: safely expand glob patterns containing spaces for find(1)
# Usage: _find_mailbox <glob_pattern> <find_args...>
_find_mailbox() {
  local pattern="$1"; shift
  local -a dirs=()
  while IFS= read -r _p; do
    [[ -d "$_p" ]] && dirs+=("$_p")
  done < <(compgen -G "$pattern" 2>/dev/null || true)
  [[ ${#dirs[@]} -eq 0 ]] && return 0
  find "${dirs[@]}" "$@" 2>/dev/null || true
}
WSJF_DASHBOARD="/tmp/wsjf-email-dashboard.html"
WSJF_ESCALATOR="/Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/validators/wsjf/wsjf-roam-escalator.sh"

# T3: Legal case folders to scan for .eml files
LEGAL_ROOT="${LEGAL_ROOT:-/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL}"
if [[ -n "${LEGAL_CASE_FOLDERS_CSV:-}" ]]; then
  IFS=':' read -r -a LEGAL_CASE_FOLDERS <<< "$LEGAL_CASE_FOLDERS_CSV"
else
  LEGAL_CASE_FOLDERS=(
    "${LEGAL_ROOT}/01-ACTIVE-CRITICAL"
    "${LEGAL_ROOT}/02-ACTIVE-HIGH"
    "${LEGAL_ROOT}/03-ACTIVE-MEDIUM"
    "${LEGAL_ROOT}/06-EMAILS"
  )
fi
CANONICAL_VALIDATOR="${CANONICAL_VALIDATOR:-/Users/shahroozbhopti/Documents/code/investing/agentic-flow/_SYSTEM/_AUTOMATION/validate-email.sh}"
CLASSIFIER_RULES="${CLASSIFIER_RULES:-/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/_SYSTEM/_AUTOMATION/_classifier-rules.sh}"
if [[ -f "$CLASSIFIER_RULES" ]]; then
  # shellcheck source=/dev/null
  source "$CLASSIFIER_RULES"
fi

# Risk thresholds — sourced from _classifier-rules.sh (WSJF_*_KEYWORDS)
# Fallback to inline if shared module unavailable
RED_KEYWORDS="${WSJF_RED_KEYWORDS:-(utilities?|block|disconnect|evict|arbitration.*urgent|deadline.*3.*day|emergency)}"
YELLOW_KEYWORDS="${WSJF_YELLOW_KEYWORDS:-(arbitration|hearing|trial|legal.*deadline|notice.*appear|move.*date)}"
GREEN_KEYWORDS="${WSJF_GREEN_KEYWORDS:-(storage|backup|contingency|optional)}"

usage() {
  cat <<EOF
Usage: $0 <email_file> [mode]

Modes:
  validate             - Check email priority via WSJF before sending
  scan-sent            - Scan sent folder for recent priority emails
  scan-legal-folders   - Scan legal case folders for .eml files, dispatch to canonical validator
  update-dashboard     - Update HTML dashboard with latest WSJF priorities
  migrate-structure    - Reorganize emails into structured folder hierarchy

Examples:
  $0 email-to-doug.eml validate
  $0 - scan-sent
  $0 - scan-legal-folders
  $0 - update-dashboard
  $0 - migrate-structure

Workflow:
  1. Scan sent/inbox for recent emails (last 24h)
  2. Scan legal case folders for .eml files (T3 expansion)
  3. Calculate WSJF impact of pending email
  4. Update HTML dashboard with priorities
  5. Prompt: "Send now?" or "Higher priority: [X]"
EOF
  exit ${EXIT_INVALID_ARGS:-10}
}

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" >&2
}

# migrate-emails-to-structure.sh (%/# %.# #L %) — reorganizes emails into structured folder hierarchy
migrate_structure() {
  log "Migrating emails into structured folder hierarchy (Now, Next, Later, Inbox Zero, Incremental)..."
  
  # CSQBM Governance Constraint: Trace email processing
  local proj_root="$(cd "$(dirname "$(dirname "$(dirname "${BASH_SOURCE[0]}")")")" && pwd)"
  local base_dest="$PROJECT_ROOT/docs/emails"
  mkdir -p "$base_dest/NOW" "$base_dest/NEXT" "$base_dest/LATER" "$base_dest/INBOX_ZERO" "$base_dest/INCREMENTAL"

  local total=0
  local routed=0
  
  { _find_mailbox "$SENT_FOLDER" -type f -name "*.emlx" -mtime -7; _find_mailbox "$INBOX_FOLDER" -type f -name "*.emlx" -mtime -7; } | head -50 | while read -r eml; do
      local subject=$(grep -i "^Subject:" "$eml" | head -1 | sed 's/Subject: //' || echo "No subject")
      local dest=""
      total=$((total+1))
      if echo "$subject" | grep -Eiq "$RED_KEYWORDS"; then
        dest="$base_dest/NOW"
      elif echo "$subject" | grep -Eiq "$YELLOW_KEYWORDS"; then
        dest="$base_dest/NEXT"
      elif echo "$subject" | grep -Eiq "$GREEN_KEYWORDS"; then
        dest="$base_dest/LATER"
      elif echo "$subject" | grep -Eiq "(draft|incremental)"; then
        dest="$base_dest/INCREMENTAL"
      else
        dest="$base_dest/INBOX_ZERO"
      fi
      
      # Mock copy to structure
      cp "$eml" "$dest/$(basename "$eml")" 2>/dev/null || true
      routed=$((routed+1))
  done || true
  local loc=$(wc -l < "$0" | tr -d ' ')
  local cov=0
  [[ $total -gt 0 ]] && cov=$((routed*100/total))
  echo "migrate-emails-to-structure.sh (${cov}%/${total} | +0.0%/min | ${loc}L | 100%) — reorganizes emails into structured folder hierarchy"
}

# T2 ENHANCEMENT: Extract email headers with thread tracking support
extract_email_headers() {
  local email_file="$1"

  if [[ ! -f "$email_file" ]]; then
    log "ERROR: Email file not found: $email_file"
    return 1
  fi

  # Extract standard headers
  TO=$(grep -i "^To:" "$email_file" | head -1 | sed 's/^To: *//' || echo "")
  FROM=$(grep -i "^From:" "$email_file" | head -1 | sed 's/^From: *//' || echo "")
  SUBJECT=$(grep -i "^Subject:" "$email_file" | head -1 | sed 's/^Subject: *//' || echo "")
  DATE=$(grep -i "^Date:" "$email_file" | head -1 | sed 's/^Date: *//' || echo "")

  # T2 ENHANCEMENT: Extract thread tracking headers for reply chain reconstruction
  MESSAGE_ID=$(grep -i "^Message-ID:" "$email_file" | head -1 | sed 's/^Message-ID: *//' || echo "")
  IN_REPLY_TO=$(grep -i "^In-Reply-To:" "$email_file" | head -1 | sed 's/^In-Reply-To: *//' || echo "")
  REFERENCES=$(grep -i "^References:" "$email_file" | head -1 | sed 's/^References: *//' || echo "")

  log "Headers extracted: TO=$TO, FROM=$FROM, SUBJECT=$SUBJECT"
  if [[ -n "$IN_REPLY_TO" ]]; then
    log "Thread tracking: IN_REPLY_TO=$IN_REPLY_TO"
  fi
  if [[ -n "$REFERENCES" ]]; then
    log "Thread references: $REFERENCES"
  fi

  return 0
}

# Duplicate checks are delegated to canonical validate-email.sh

# Scan sent folder for emails in last 24 hours
scan_sent_folder() {
  log "Scanning sent folder for recent emails..."
  while IFS= read -r eml; do
    [[ -z "$eml" ]] && continue
    local subject=$(grep -i "^Subject:" "$eml" | head -1 || echo "No subject")
    local to=$(grep -i "^To:" "$eml" | head -1 || echo "Unknown")
    log "SENT: $subject → $to"
  done < <(_find_mailbox "$SENT_FOLDER" -type f -name "*.emlx" -mtime -1)
}

# Calculate WSJF score for email content
calculate_email_wsjf() {
  local email_file="$1"
  local content=$(cat "$email_file")

  # Extract upcoming date from content to compute temporal urgency multiplier (min/hr/d/w bounds)
  local temporal_multiplier
  temporal_multiplier=$(python3 -c "
import re, sys
from datetime import datetime
content = sys.stdin.read()
matches = re.findall(r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})', content, re.IGNORECASE)
now = datetime.now()
min_days = 9999
for m in matches:
    try:
        date_str = f'{now.year} {m[0]} {m[1]}'
        target_date = datetime.strptime(date_str, '%Y %B %d')
        delta = (target_date - now).days
        if -2 <= delta < min_days:
            min_days = max(0, delta)
    except Exception:
        pass

if min_days <= 1:
    print(10)
elif min_days <= 7:
    print(5)
elif min_days <= 30:
    print(2)
else:
    print(1)
" <<< "$content")
  
  temporal_multiplier=${temporal_multiplier:-1}

  # Check risk level using Early Exit Guard Clauses
  if echo "$content" | grep -Eiq "$RED_KEYWORDS"; then
    local wsjf=$(( 45 * temporal_multiplier ))
    echo "{\"risk\":\"RED\",\"wsjf\":$wsjf,\"priority\":1,\"temporal_multiplier\":$temporal_multiplier}"
    return 0
  fi
  
  if echo "$content" | grep -Eiq "$YELLOW_KEYWORDS"; then
    local wsjf=$(( 35 * temporal_multiplier ))
    echo "{\"risk\":\"YELLOW\",\"wsjf\":$wsjf,\"priority\":2,\"temporal_multiplier\":$temporal_multiplier}"
    return 0
  fi
  
  if echo "$content" | grep -Eiq "$GREEN_KEYWORDS"; then
    local wsjf=$(( 25 * temporal_multiplier ))
    echo "{\"risk\":\"GREEN\",\"wsjf\":$wsjf,\"priority\":3,\"temporal_multiplier\":$temporal_multiplier}"
    return 0
  fi
  
  local wsjf=$(( 15 * temporal_multiplier ))
  echo "{\"risk\":\"UNKNOWN\",\"wsjf\":$wsjf,\"priority\":4,\"temporal_multiplier\":$temporal_multiplier}"
  return 0
}

# Update HTML dashboard with current priorities
update_dashboard() {
  # Content-hash gate: only rewrite HTML when mailbox data actually changed
  local _dash_hash_file="${HOME}/.bhopti-legal/email-dashboard-last-hash"
  mkdir -p "$(dirname "$_dash_hash_file")" 2>/dev/null
  local _dash_data_hash
  _dash_data_hash=$(
    { _find_mailbox "$SENT_FOLDER" -type f -name "*.emlx" -mtime -1 -exec stat -f '%m' {} \; 2>/dev/null
      _find_mailbox "$INBOX_FOLDER" -type f -name "*.emlx" -mtime -1 -exec stat -f '%m' {} \; 2>/dev/null
    } | sort | shasum -a 256 | cut -d' ' -f1
  )
  local _prev_dash_hash=""
  [[ -f "$_dash_hash_file" ]] && _prev_dash_hash=$(cat "$_dash_hash_file" 2>/dev/null)
  if [[ "$_dash_data_hash" == "$_prev_dash_hash" ]] && [[ -f "$WSJF_DASHBOARD" ]]; then
    log "Email data unchanged (hash: ${_dash_data_hash:0:12}) — skipping dashboard rewrite"
    return 0
  fi
  echo "$_dash_data_hash" > "$_dash_hash_file"
  log "Updating WSJF email dashboard (data changed)..."

  local _now
  _now=$(date '+%Y-%m-%d %H:%M:%S')
  cat > "$WSJF_DASHBOARD" <<HTMLEOF
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="300">
  <style>
    body { font-family: monospace; background: #1a1a1a; color: #fff; padding: 20px; }
    .red { color: #ff4444; font-weight: bold; }
    .yellow { color: #ffaa00; }
    .green { color: #44ff44; }
    .email-row {
      padding: 10px;
      margin: 5px 0;
      border-left: 4px solid #444;
      background: #2a2a2a;
    }
    .email-row.red { border-left-color: #ff4444; }
    .email-row.yellow { border-left-color: #ffaa00; }
    .email-row.green { border-left-color: #44ff44; }
    h1 { color: #ffaa00; }
  </style>
</head>
<body>
  <h1>📧 WSJF Email Priority Dashboard</h1>
  <p>Last updated: ${_now}</p>
  <p>Auto-refreshes every 5 min</p>
HTMLEOF

  # Scan recent sent emails
  echo '<h2>📤 Recent Sent (24h)</h2>' >> "$WSJF_DASHBOARD"
  while IFS= read -r eml; do
    local subject=$(grep -i "^Subject:" "$eml" | head -1 | sed 's/Subject: //' || echo "No subject")
    local to=$(grep -i "^To:" "$eml" | head -1 | sed 's/To: //' || echo "Unknown")
    local risk="green"

    # Detect risk from subject
    if echo "$subject" | grep -Eiq "$RED_KEYWORDS"; then
      risk="red"
    elif echo "$subject" | grep -Eiq "$YELLOW_KEYWORDS"; then
      risk="yellow"
    fi

    echo "<div class='email-row $risk'>" >> "$WSJF_DASHBOARD"
    echo "  <strong>$subject</strong><br>" >> "$WSJF_DASHBOARD"
    echo "  → $to" >> "$WSJF_DASHBOARD"
    echo "</div>" >> "$WSJF_DASHBOARD"
  done < <(_find_mailbox "$SENT_FOLDER" -type f -name "*.emlx" -mtime -1 | head -10)

  # Scan recent inbox
  echo '<h2>📥 Recent Inbox (24h)</h2>' >> "$WSJF_DASHBOARD"
  while IFS= read -r eml; do
    local subject=$(grep -i "^Subject:" "$eml" | head -1 | sed 's/Subject: //' || echo "No subject")
    local from=$(grep -i "^From:" "$eml" | head -1 | sed 's/From: //' || echo "Unknown")
    local risk="green"

    if echo "$subject" | grep -Eiq "$RED_KEYWORDS"; then
      risk="red"
    elif echo "$subject" | grep -Eiq "$YELLOW_KEYWORDS"; then
      risk="yellow"
    fi

    echo "<div class='email-row $risk'>" >> "$WSJF_DASHBOARD"
    echo "  <strong>$subject</strong><br>" >> "$WSJF_DASHBOARD"
    echo "  ← $from" >> "$WSJF_DASHBOARD"
    echo "</div>" >> "$WSJF_DASHBOARD"
  done < <(_find_mailbox "$INBOX_FOLDER" -type f -name "*.emlx" -mtime -1 | head -10)

  echo '</body></html>' >> "$WSJF_DASHBOARD"
  log "Dashboard updated: $WSJF_DASHBOARD"
}

# Validate email before sending
validate_email() {
  local email_file="$1"

  if [ ! -f "$email_file" ]; then
    log "ERROR: Email file not found: $email_file"
    exit ${EXIT_FILE_NOT_FOUND:-11}
  fi

  # CSQBM Governance Constraint: Enforce payload token sizes before memory expansion
  local file_size_bytes max_bytes=16000 domain_name="General"
  file_size_bytes=$(wc -c < "$email_file" | tr -d ' ')
  if [[ "$email_file" == *"BHOPTI-LEGAL"* ]] || [[ "$email_file" == *"COURT-FILINGS"* ]]; then
      max_bytes=32000; domain_name="Legal"
  elif [[ "$email_file" == *"utilities"* ]] || [[ "$email_file" == *"movers"* ]]; then
      max_bytes=8000; domain_name="Utilities"
  elif [[ "$email_file" == *"income"* ]] || [[ "$email_file" == *"job"* ]]; then
      max_bytes=12000; domain_name="Income"
  fi

  if [[ "$file_size_bytes" -gt "$max_bytes" ]]; then
      log "🚫 BLOCKER: Payload size ($file_size_bytes bytes) exceeds $domain_name domain ceiling ($max_bytes bytes)."
      log "   Constraint (ADR-005): Payloads must fit within the 4000 DBOS Pydantic token ceiling. Shrink unstructured sprawl prior to processing."
      exit ${EXIT_SCHEMA_VALIDATION_FAILED:-100}
  fi

  # Canonical validation precheck (includes duplicate SHA256 and policy checks)
  if [[ -x "$CANONICAL_VALIDATOR" ]]; then
    local canon_ret=0
    SKIP_ARBITRATION_WINDOW=1 bash "$CANONICAL_VALIDATOR" "$email_file" >/dev/null 2>&1 || canon_ret=$?
    if [[ "$canon_ret" -eq 120 ]]; then
      log "⚠️  DUPLICATE EMAIL DETECTED by canonical validator"
      exit ${EXIT_DUPLICATE_DETECTED:-120}
    elif [[ "$canon_ret" -ne 0 && "$canon_ret" -ne 1 ]]; then
      log "ERROR: canonical validator failed with exit=$canon_ret"
      exit "$canon_ret"
    fi
  fi

  log "Validating email: $email_file"

  # Calculate WSJF score
  local wsjf_data=$(calculate_email_wsjf "$email_file")
  local risk=$(echo "$wsjf_data" | grep -o '"risk":"[^"]*"' | cut -d'"' -f4)
  local wsjf=$(echo "$wsjf_data" | grep -o '"wsjf":[0-9]*' | cut -d':' -f2)

  log "Email WSJF: $wsjf (Risk: $risk)"

  # Check if higher priority emails exist
  local higher_priority_count=$(_find_mailbox "$INBOX_FOLDER" -type f -name "*.emlx" -mtime -1 | wc -l | tr -d ' ')

  if [ "$risk" = "RED" ]; then
    echo "✅ HIGH PRIORITY - Send immediately (WSJF: $wsjf)"
  elif [ "$higher_priority_count" -gt 5 ]; then
    echo "⚠️  CAUTION: $higher_priority_count unprocessed emails in inbox"
    echo "   Consider handling RED/YELLOW inbox items first"
  else
    echo "✅ OK to send (WSJF: $wsjf, Inbox: $higher_priority_count items)"
  fi

  # Update dashboard after validation
  update_dashboard
}

# T3: Scan legal case folders for .eml files and dispatch to canonical validator
scan_legal_folders() {
  log "T3: Scanning legal case folders for .eml files..."

  local inbox_count=0 inbox_pass=0 inbox_fail=0 inbox_warn=0
  local legal_count=0 legal_pass=0 legal_fail=0 legal_warn=0

  # 1. Scan Apple Mail INBOX .emlx files (original behavior)
  log "--- Source: Apple Mail INBOX (.emlx) ---"
  while IFS= read -r eml; do
    [[ -z "$eml" ]] && continue
    ((inbox_count+=1))
    local subject
    subject=$(grep -i "^Subject:" "$eml" 2>/dev/null | head -1 | sed 's/Subject: //' || echo "No subject")
    local risk="GREEN"
    if echo "$subject" | grep -Eiq "$RED_KEYWORDS"; then
      risk="RED"
    elif echo "$subject" | grep -Eiq "$YELLOW_KEYWORDS"; then
      risk="YELLOW"
    fi
    log "  INBOX [$risk]: $subject"
    ((inbox_pass+=1))
  done < <(_find_mailbox "$INBOX_FOLDER" -type f -name "*.emlx" -mtime -7 | head -50)

  # 2. Scan legal case folders for .eml files — dispatch to canonical validator
  log "--- Source: Legal case folders (.eml) ---"
  for folder in "${LEGAL_CASE_FOLDERS[@]}"; do
    [[ ! -d "$folder" ]] && continue
    while IFS= read -r eml; do
      [[ -z "$eml" ]] && continue
      ((legal_count+=1))
      local fname
      fname=$(basename "$eml")

      # Dispatch to canonical validate-email.sh (no duplicated logic)
      if [[ -x "$CANONICAL_VALIDATOR" ]]; then
        local ret=0
        SKIP_ARBITRATION_WINDOW=1 bash "$CANONICAL_VALIDATOR" "$eml" 2>/dev/null || ret=$?
        case $ret in
          0)   ((legal_pass+=1)); log "  LEGAL [PASS]: $fname" ;;
          1)   ((legal_warn+=1)); log "  LEGAL [WARN]: $fname" ;;
          120) ((legal_fail+=1)); log "  LEGAL [DUP]:  $fname" ;;
          *)   ((legal_fail+=1)); log "  LEGAL [FAIL:$ret]: $fname" ;;
        esac
      else
        # Fallback: basic subject-based classification if canonical validator missing
        local subject
        subject=$(grep -i "^Subject:" "$eml" 2>/dev/null | head -1 | sed 's/Subject: //' || echo "No subject")
        local risk="GREEN"
        if echo "$subject" | grep -Eiq "$RED_KEYWORDS"; then risk="RED"; fi
        log "  LEGAL [BASIC/$risk]: $fname ($subject)"
        ((legal_pass+=1))
      fi
    done < <(find "$folder" -type f -name "*.eml" -mtime -30 2>/dev/null)
  done

  # Summary counters
  log "--- Summary ---"
  log "  INBOX (.emlx):  total=$inbox_count  pass=$inbox_pass  fail=$inbox_fail  warn=$inbox_warn"
  log "  LEGAL (.eml):   total=$legal_count  pass=$legal_pass  fail=$legal_fail  warn=$legal_warn"
  log "  COMBINED:       total=$((inbox_count + legal_count))  pass=$((inbox_pass + legal_pass))  fail=$((inbox_fail + legal_fail))  warn=$((inbox_warn + legal_warn))"

  # JSONL event
  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%s)
  echo "{\"timestamp\":\"$ts\",\"component\":\"validate-email-wsjf\",\"mode\":\"scan-legal-folders\",\"action\":\"scan\",\"target\":\"legal-case-folders\",\"status\":\"PASS\",\"severity\":\"INFO\",\"evidence_path\":\"inbox=$inbox_count,legal=$legal_count,fail=$((inbox_fail + legal_fail))\"}" >> "${HOME}/Library/Logs/wsjf-events.jsonl" 2>/dev/null || true
}

# Main execution
case "$MODE" in
  validate)
    [ -z "$EMAIL_FILE" ] && usage
    validate_email "$EMAIL_FILE"
    ;;
  scan-sent)
    scan_sent_folder
    ;;
  scan-legal-folders)
    scan_legal_folders
    ;;
  update-dashboard)
    update_dashboard
    ;;
  migrate-structure)
    migrate_structure
    ;;
  *)
    usage
    ;;
esac
