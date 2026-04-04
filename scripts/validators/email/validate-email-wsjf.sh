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

SENT_FOLDER="$HOME/Library/Mail/V*/*/Sent Messages.mbox/Data"
INBOX_FOLDER="$HOME/Library/Mail/V*/*/INBOX.mbox/Data"
WSJF_DASHBOARD="/tmp/wsjf-email-dashboard.html"
WSJF_ESCALATOR="/Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/validators/wsjf/wsjf-roam-escalator.sh"

# T0 FIX: SHA256 hash duplicate detection (prevent duplicate/redundant emails)
EMAIL_HASH_DB="/tmp/email-hashes.db"

# Risk thresholds for email priority
RED_KEYWORDS="(utilities?|block|disconnect|evict|arbitration.*urgent|deadline.*3.*day|emergency)"
YELLOW_KEYWORDS="(arbitration|hearing|trial|legal.*deadline|notice.*appear|move.*date)"
GREEN_KEYWORDS="(storage|backup|contingency|optional)"

usage() {
  cat <<EOF
Usage: $0 <email_file> [mode]

Modes:
  validate        - Check email priority via WSJF before sending
  scan-sent       - Scan sent folder for recent priority emails
  update-dashboard - Update HTML dashboard with latest WSJF priorities

Examples:
  $0 email-to-doug.eml validate
  $0 - scan-sent
  $0 - update-dashboard
  $0 - migrate-structure

Workflow:
  1. Scan sent/inbox for recent emails (last 24h)
  2. Calculate WSJF impact of pending email
  3. Update HTML dashboard with priorities
  4. Prompt: "Send now?" or "Higher priority: [X]"
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
  
  find "$SENT_FOLDER" "$INBOX_FOLDER" -type f -name "*.emlx" -mtime -7 2>/dev/null | head -50 | while read -r eml; do
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

# T0 FIX: SHA256 hash duplicate detection function
check_email_duplicate() {
  local email_file="$1"

  if [[ ! -f "$email_file" ]]; then
    log "ERROR: Email file not found: $email_file"
    return 1
  fi

  # Extract email body (skip headers) and compute hash
  local email_body
  email_body=$(sed -n '/^$/,$p' "$email_file" | tail -n +2)
  local email_hash
  email_hash=$(echo "$email_body" | shasum -a 256 | cut -d' ' -f1)

  # Initialize hash database if not exists
  if [[ ! -f "$EMAIL_HASH_DB" ]]; then
    touch "$EMAIL_HASH_DB"
    log "Initialized email hash database: $EMAIL_HASH_DB"
  fi

  # Check for duplicate
  if grep -q "^$email_hash" "$EMAIL_HASH_DB"; then
    local duplicate_info
    duplicate_info=$(grep "^$email_hash" "$EMAIL_HASH_DB")
    log "⚠️  DUPLICATE EMAIL DETECTED!"
    log "Hash: $email_hash"
    log "Previous: $duplicate_info"
    return 2  # Exit code 2 = duplicate detected
  fi

  # Store hash with timestamp and subject
  local subject
  subject=$(grep -i "^Subject:" "$email_file" | head -1 | cut -d' ' -f2- || echo "No Subject")
  echo "$email_hash $(date '+%Y-%m-%d %H:%M:%S') $subject" >> "$EMAIL_HASH_DB"
  log "✅ Email hash stored: $email_hash"
  return 0
}

# Scan sent folder for emails in last 24 hours
scan_sent_folder() {
  log "Scanning sent folder for recent emails..."
  local yesterday=$(date -v-24H +%Y%m%d)

  find "$SENT_FOLDER" -type f -name "*.emlx" -mtime -1 2>/dev/null | while read -r eml; do
    local subject=$(grep -i "^Subject:" "$eml" | head -1 || echo "No subject")
    local to=$(grep -i "^To:" "$eml" | head -1 || echo "Unknown")
    log "SENT: $subject → $to"
  done
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
  log "Updating WSJF email dashboard..."

  cat > "$WSJF_DASHBOARD" <<'HTMLEOF'
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="60">
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
  <p>Last updated: $(date)</p>
  <p>Auto-refreshes every 60s</p>
HTMLEOF

  # Scan recent sent emails
  echo '<h2>📤 Recent Sent (24h)</h2>' >> "$WSJF_DASHBOARD"
  find "$SENT_FOLDER" -type f -name "*.emlx" -mtime -1 2>/dev/null | head -10 | while read -r eml; do
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
  done

  # Scan recent inbox
  echo '<h2>📥 Recent Inbox (24h)</h2>' >> "$WSJF_DASHBOARD"
  find "$INBOX_FOLDER" -type f -name "*.emlx" -mtime -1 2>/dev/null | head -10 | while read -r eml; do
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
  done

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

  # T0 FIX: Check for duplicate emails first
  log "Checking for duplicate emails..."
  check_email_duplicate "$email_file"
  local dup_status=$?

  # Early Exit Guard Clauses
  if [ "$dup_status" -eq 1 ]; then
    log "ERROR: Failed to check email duplicate"
    exit ${EXIT_SCHEMA_VALIDATION_FAILED:-100}
  fi

  if [ "$dup_status" -eq 2 ]; then
    log "⚠️  DUPLICATE EMAIL DETECTED - Aborting send to prevent redundancy"
    echo ""
    echo "🚫 EMAIL SEND BLOCKED: Duplicate content detected"
    echo "   This email appears to be identical to a previously sent message."
    echo "   Review the email hash database: $EMAIL_HASH_DB"
    echo ""
    exit ${EXIT_DUPLICATE_DETECTED:-120}  # Exit code 120 = duplicate detected
  fi

  log "Validating email: $email_file"

  # Calculate WSJF score
  local wsjf_data=$(calculate_email_wsjf "$email_file")
  local risk=$(echo "$wsjf_data" | grep -o '"risk":"[^"]*"' | cut -d'"' -f4)
  local wsjf=$(echo "$wsjf_data" | grep -o '"wsjf":[0-9]*' | cut -d':' -f2)

  log "Email WSJF: $wsjf (Risk: $risk)"

  # Check if higher priority emails exist
  local higher_priority_count=$(find "$INBOX_FOLDER" -type f -name "*.emlx" -mtime -1 2>/dev/null | wc -l | tr -d ' ')

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

  # Open dashboard
  open "$WSJF_DASHBOARD" 2>/dev/null || true
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
  update-dashboard)
    update_dashboard
    open "$WSJF_DASHBOARD"
    ;;
  migrate-structure)
    migrate_structure
    ;;
  *)
    usage
    ;;
esac
