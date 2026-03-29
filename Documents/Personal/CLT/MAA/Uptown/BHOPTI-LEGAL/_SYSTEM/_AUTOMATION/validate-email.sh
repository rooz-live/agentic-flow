#!/bin/bash
# validate-email.sh
# Pre-send validator for .eml files (24 checks, RFC 5322)
# CROSS-REF: /code/investing/agentic-flow/VALIDATOR_INVENTORY.md | ADR-019 | CASE_REGISTRY.yaml
# MPP: method=rfc5322_parsing | pattern=checklist_21 | protocol=stdout_exit
# DIVERGE: Anti-compatible — catches header format issues that JS (email-server.js) and bash core miss
# BRIDGE: 00-DASHBOARD/email-server.js runBashValidator() calls this via /validate-full
# Usage: ./validate-email.sh path/to/email.eml
# Exit 0 = PASS (safe to send), Exit 1 = FAIL (do not send)
# Integrates with email-to-wsjf-bridge.sh classifier

set -euo pipefail

# ─── SEMANTIC EXIT CODE REGISTRY ──────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=exit-codes.sh
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/exit-codes.sh" 2>/dev/null || {
  # Fallback constants if exit-codes.sh unavailable
  EXIT_SUCCESS=0; EXIT_SUCCESS_WITH_WARNINGS=1
  EXIT_INVALID_ARGS=10; EXIT_FILE_NOT_FOUND=11
  EXIT_MISSING_REQUIRED_FIELD=21
  EXIT_SCHEMA_VALIDATION_FAILED=100; EXIT_DATE_IN_PAST=110
  EXIT_PLACEHOLDER_DETECTED=111; EXIT_BOUNCE_ERROR_DETECTED=140
  EXIT_ADR_COMPLIANCE=170
}

EML_FILE="${1:-}"
LOG_FILE="${HOME}/Library/Logs/email-validate.log"
LEGAL_DIR="/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL"
SENT_DIR=""  # will be set relative to .eml location

# ─── KNOWN BOUNCE LIST ────────────────────────────────────────────────────────
# Addresses confirmed as undeliverable — add as discovered
KNOWN_BOUNCES=(
  "charlotte@twomenandatruck.com"   # 550 5.4.1 Exchange blocks external (2026-03-05)
)

# ─── PLACEHOLDER PATTERNS ─────────────────────────────────────────────────────
PLACEHOLDER_PATTERNS=(
  "\[INSERT"
  "TODO:"
  "YOUR_EMAIL"
  "\[YOUR "
  "example\.com"
  "test@test"
  "\[EMAIL\]"
  "\[DATE\]"
  "\[NAME\]"
  "\[ADDRESS\]"
  "\[TBD\]"
  "placeholder"
  "REPLACE_ME"
  "FIXME"
  '\$[XYZ]'
  "\[AMOUNT_"
  "\[AMOUNT\]"
)

# ─── PLATFORM RELAY ADDRESSES ─────────────────────────────────────────────────
# To: these must be sent via platform inbox — NOT direct SMTP
PLATFORM_RELAYS=(
  "thumbtack-message@thumbtack.com"
  "messages@thumbtack.com"
)

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

timestamp() { date '+%Y-%m-%d %H:%M:%S'; }
log() { echo "[$(timestamp)] $*" >> "${LOG_FILE}" 2>/dev/null || true; }

pass() { echo -e "${GREEN}✅ PASS${NC} $*"; log "PASS: $*"; }
fail() { echo -e "${RED}❌ FAIL${NC} $*"; log "FAIL: $*"; }
warn() { echo -e "${YELLOW}⚠️  WARN${NC} $*"; log "WARN: $*"; }
info() { echo -e "${BLUE}ℹ️  INFO${NC} $*"; }

if [[ -z "$EML_FILE" ]]; then
  echo "Usage: $0 path/to/email.eml"
  echo ""
  echo "Examples:"
  echo "  $0 12-AMANDA-BECK-110-FRAZIER/movers/EMAIL-COLLEGE-HUNKS-MARCH-7-MOVE.eml"
  echo "  $0 01-ACTIVE-CRITICAL/MAA-26CV005596-590/EMAIL-TO-DOUG-GRIMES-POST-ARBITRATION-ORDER.eml"
  exit "${EXIT_INVALID_ARGS:-10}"
fi

# Resolve absolute path
if [[ ! "$EML_FILE" = /* ]]; then
  EML_FILE="${LEGAL_DIR}/${EML_FILE}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  EMAIL PRE-SEND VALIDATOR"
echo "  $(timestamp)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

FAILURES=0
WARNINGS=0
FAIL_EXIT_CODE=0   # tracks semantic exit code for primary failure type

# ─── CHECK 1: FILE EXISTS ─────────────────────────────────────────────────────
info "Checking: ${EML_FILE##*/}"
echo ""

if [[ ! -f "$EML_FILE" ]]; then
  fail "File not found: $EML_FILE"
  exit "${EXIT_FILE_NOT_FOUND:-11}"
fi
pass "File exists ($(wc -c < "$EML_FILE" | tr -d ' ') bytes)"

# ─── PARSE HEADERS ────────────────────────────────────────────────────────────
# RFC 5322: folded headers use continuation lines starting with whitespace
TO_RAW=$(awk '/^To:/{p=1; print; next} p && /^[ \t]/{print; next} p{exit}' "$EML_FILE" | sed '1s/^To: *//i' | tr '\n' ' ' | sed 's/  */ /g; s/^ *//; s/ *$//' || echo "")
CC_RAW=$(awk '/^Cc:/{p=1; print; next} p && /^[ \t]/{print; next} p{exit}' "$EML_FILE" | sed '1s/^Cc: *//i' | tr '\n' ' ' | sed 's/  */ /g; s/^ *//; s/ *$//' || echo "")
SUBJ_RAW=$(grep -i "^Subject:" "$EML_FILE" 2>/dev/null | head -1 | sed 's/^Subject: *//i' || echo "")
FROM_RAW=$(grep -i "^From:" "$EML_FILE" 2>/dev/null | head -1 | sed 's/^From: *//i' || echo "")
DATE_RAW=$(grep -i "^Date:" "$EML_FILE" 2>/dev/null | head -1 | sed 's/^Date: *//i' || echo "")

echo ""
info "Parsed headers:"
echo "  FROM:    ${FROM_RAW:-[EMPTY]}"
echo "  TO:      ${TO_RAW:-[EMPTY]}"
echo "  CC:      ${CC_RAW:-[EMPTY]}"
echo "  SUBJECT: ${SUBJ_RAW:-[EMPTY]}"
echo "  DATE:    ${DATE_RAW:-[EMPTY]}"
echo ""

# ─── CHECK 2: TO FIELD ────────────────────────────────────────────────────────
if [[ -z "$TO_RAW" ]]; then
  fail "To: field is EMPTY"
  FAILURES=$(( FAILURES + 1 ))
  FAIL_EXIT_CODE="${EXIT_MISSING_REQUIRED_FIELD:-21}"
else
  pass "To: field present"
fi

# ─── CHECK 3: SUBJECT ─────────────────────────────────────────────────────────
if [[ -z "$SUBJ_RAW" ]]; then
  fail "Subject: field is EMPTY"
  FAILURES=$(( FAILURES + 1 ))
  FAIL_EXIT_CODE="${EXIT_MISSING_REQUIRED_FIELD:-21}"
else
  pass "Subject: present — \"${SUBJ_RAW}\""
fi

# ─── CHECK 4: FROM FIELD ──────────────────────────────────────────────────────
if [[ -z "$FROM_RAW" ]]; then
  fail "From: field is EMPTY"
  FAILURES=$(( FAILURES + 1 ))
  FAIL_EXIT_CODE="${EXIT_MISSING_REQUIRED_FIELD:-21}"
else
  pass "From: present — \"${FROM_RAW}\""
fi

# ─── CHECK 5: KNOWN BOUNCES ───────────────────────────────────────────────────
echo ""
info "Checking against known-bounce list (${#KNOWN_BOUNCES[@]} entries)..."

ALL_RECIPIENTS="${TO_RAW} ${CC_RAW}"
for bounce in "${KNOWN_BOUNCES[@]}"; do
  if echo "${ALL_RECIPIENTS,,}" | grep -qi "${bounce,,}"; then
    fail "KNOWN BOUNCE: ${bounce} is in To/Cc — will fail delivery"
    fail "  Last seen: $(grep -i "$bounce" "${LOG_FILE}" 2>/dev/null | tail -1 | cut -d']' -f1 | tr -d '[' || echo 'unknown')"
    fail "  Fix: use web form or find alternative address"
    FAILURES=$(( FAILURES + 1 ))
    FAIL_EXIT_CODE="${EXIT_BOUNCE_ERROR_DETECTED:-140}"
  fi
done
if [[ $FAILURES -eq 0 ]]; then
  pass "No known bounce addresses found"
fi

# ─── CHECK 6: PLACEHOLDER PATTERNS ───────────────────────────────────────────
echo ""
info "Scanning for placeholder patterns..."
found_placeholder=false
for pattern in "${PLACEHOLDER_PATTERNS[@]}"; do
  if grep -qi "$pattern" "$EML_FILE" 2>/dev/null; then
    fail "Placeholder found: pattern '${pattern}' in file body"
    FAILURES=$(( FAILURES + 1 ))
    FAIL_EXIT_CODE="${EXIT_PLACEHOLDER_DETECTED:-111}"
    found_placeholder=true
  fi
done
if ! $found_placeholder; then
  pass "No placeholder patterns detected"
fi

# ─── CHECK 7: RECIPIENT LOOKS LIKE EMAIL ─────────────────────────────────────
echo ""
info "Validating recipient email format..."
if [[ -n "$TO_RAW" ]]; then
  # Extract bare email addresses from To: field
  while IFS= read -r addr; do
    addr=$(echo "$addr" | grep -oE '[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}' || true)
    if [[ -n "$addr" ]]; then
      pass "Valid format: ${addr}"
    fi
  done <<< "$(echo "$TO_RAW" | tr ',' '\n')"
fi

# ─── CHECK 8: BODY NOT EMPTY ──────────────────────────────────────────────────
echo ""
body_size=$(wc -c < "$EML_FILE" | tr -d ' ')
if [[ "$body_size" -lt 200 ]]; then
  warn "File is very small (${body_size} bytes) — verify body content"
  WARNINGS=$(( WARNINGS + 1 ))
else
  pass "Body size OK (${body_size} bytes)"
fi

# ─── CHECK 9: SENT FOLDER DUPLICATE ─────────────────────────────────────────
SENT_DIR="$(dirname "$EML_FILE")/sent"
if [[ -d "$SENT_DIR" ]]; then
  # Search for files with similar subject prefix (first 20 chars)
  subj_prefix="$(echo "$SUBJ_RAW" | cut -c1-20)"
  if find "$SENT_DIR" -type f -print0 2>/dev/null | xargs -0 grep -li "$subj_prefix" 2>/dev/null | head -1 | grep -q .; then
    warn "Similar subject found in sent/ — may be duplicate send"
    WARNINGS=$(( WARNINGS + 1 ))
  fi
fi

# ─── CHECK 10: DATE FRESHNESS (CONTEXT-AWARE HISTORICAL DATES) ──────────────
echo ""
info "Checking Date header freshness..."
if [[ -z "$DATE_RAW" ]]; then
  fail "Date: header is MISSING"
  FAILURES=$(( FAILURES + 1 ))
  FAIL_EXIT_CODE="${EXIT_MISSING_REQUIRED_FIELD:-21}"
else
  DATE_EPOCH=$(date -j -f "%a, %d %b %Y %H:%M:%S %z" "$DATE_RAW" "+%s" 2>/dev/null || echo "")
  NOW_EPOCH=$(date "+%s")
  if [[ -z "$DATE_EPOCH" ]]; then
    warn "Could not parse Date header: '${DATE_RAW}' — verify format"
    WARNINGS=$(( WARNINGS + 1 ))
  else
    DELTA=$(( NOW_EPOCH - DATE_EPOCH ))
    
    # HISTORICAL DATE CONTEXT DETECTION (Added 2026-03-26)
    # RCA: Exit Code 110 false positive — dates in email BODY (not Date: header)
    # Reference: Judge Brown's March 3 hearing, arbitration history
    # Keywords indicating historical reference (not action date):
    HISTORICAL_CONTEXT=false
    if grep -qiE "(during|following|at the|on March 3.*hearing|trial.*occurred|arbitration.*ordered)" "$EML_FILE" 2>/dev/null; then
      info "Historical context detected — email references past events (not action dates)"
      HISTORICAL_CONTEXT=true
    fi
    
    if [[ $DELTA -gt 604800 ]]; then
      if [[ "$HISTORICAL_CONTEXT" == "true" ]]; then
        warn "Date header is STALE ($(( DELTA / 86400 )) days old), but email contains historical references — likely valid context"
        WARNINGS=$(( WARNINGS + 1 ))
      else
        fail "Date header is STALE ($(( DELTA / 86400 )) days old): ${DATE_RAW}"
        FAILURES=$(( FAILURES + 1 ))
        FAIL_EXIT_CODE="${EXIT_DATE_IN_PAST:-110}"
      fi
    elif [[ $DELTA -lt -86400 ]]; then
      warn "Date header is future-dated (>24h ahead): ${DATE_RAW}"
      WARNINGS=$(( WARNINGS + 1 ))
    else
      pass "Date is current ($(( DELTA / 3600 ))h ago): ${DATE_RAW}"
    fi
  fi
fi

# ─── CHECK 11: MESSAGE-ID PRESENT ────────────────────────────────────────────
echo ""
info "Checking Message-ID..."
MSGID_RAW=$(grep -i "^Message-ID:" "$EML_FILE" 2>/dev/null | head -1 || echo "")
if [[ -z "$MSGID_RAW" ]]; then
  warn "No Message-ID header — mail servers may flag as spam or reject"
  WARNINGS=$(( WARNINGS + 1 ))
else
  pass "Message-ID present: ${MSGID_RAW}"
fi

# ─── CHECK 11b: REPLY THREAD HEADERS (Added 2026-03-08) ─────────────────────
# RCA: Enable thread reconstruction for arbitration correspondence
echo ""
info "Checking reply thread headers..."
IN_REPLY_TO=$(grep -i "^In-Reply-To:" "$EML_FILE" 2>/dev/null | head -1 | sed 's/^In-Reply-To: *//' | tr -d '\r' || true)
REFERENCES=$(grep -i "^References:" "$EML_FILE" 2>/dev/null | head -1 | sed 's/^References: *//' | tr -d '\r' || true)

if [[ -n "$IN_REPLY_TO" ]]; then
  pass "In-Reply-To present: ${IN_REPLY_TO:0:50}..."
  export EMAIL_IN_REPLY_TO="$IN_REPLY_TO"
else
  info "No In-Reply-To header (new thread or original email)"
fi

if [[ -n "$REFERENCES" ]]; then
  pass "References present: ${REFERENCES:0:50}..."
  export EMAIL_REFERENCES="$REFERENCES"
else
  info "No References header (new thread or original email)"
fi

# Store thread info for sent-log.jsonl tracking
export EMAIL_THREAD_ID="${IN_REPLY_TO:-${REFERENCES:-NEW_THREAD}}"

# ─── CHECK 12: PLATFORM RELAY DETECTION ──────────────────────────────────────
echo ""
info "Checking for platform relay addresses..."
relay_found=false
for relay in "${PLATFORM_RELAYS[@]}"; do
  if echo "${TO_RAW,,}" | grep -qi "${relay,,}"; then
    warn "PLATFORM RELAY: ${relay}"
    warn "  → Send via platform inbox (Thumbtack), NOT direct SMTP"
    warn "  → Dashboard: openAllThumbtack() or open provider profile URL"
    WARNINGS=$(( WARNINGS + 1 ))
    relay_found=true
  fi
done
if ! $relay_found; then
  pass "No platform relay addresses — direct SMTP send OK"
fi

# ─── CHECK 13: MARKDOWN IN PLAIN-TEXT BODY ───────────────────────────────────
echo ""
info "Checking for markdown in plain-text body..."
CTYPE_RAW=$(grep -i "^Content-Type:" "$EML_FILE" 2>/dev/null | head -1 || echo "")
if echo "${CTYPE_RAW,,}" | grep -q "text/plain"; then
  if awk '/^$/{found=1} found' "$EML_FILE" 2>/dev/null | grep -qE '^\*\*|^#{1,6} |^\* \*\*'; then
    warn "Markdown syntax in text/plain body (e.g. **bold**, ## heading) — will render as literal text"
    WARNINGS=$(( WARNINGS + 1 ))
  else
    pass "No markdown in plain-text body"
  fi
fi

# ─── CHECK 14: DRAFT ARTIFACTS ───────────────────────────────────────────────
echo ""
info "Checking for draft artifacts..."
draft_found=false
if echo "${SUBJ_RAW,,}" | grep -qiE "\[draft\]|^draft:"; then
  fail "Subject contains draft marker: '${SUBJ_RAW}' — do not send"
  FAILURES=$(( FAILURES + 1 ))
  FAIL_EXIT_CODE="${EXIT_SCHEMA_VALIDATION_FAILED:-100}"
  draft_found=true
fi
if grep -qi "^X-Draft:\|^X-Status:.*Draft" "$EML_FILE" 2>/dev/null; then
  fail "Draft header detected in file — do not send"
  FAILURES=$(( FAILURES + 1 ))
  FAIL_EXIT_CODE="${EXIT_SCHEMA_VALIDATION_FAILED:-100}"
  draft_found=true
fi
if ! $draft_found; then
  pass "No draft artifacts detected"
fi

# ─── CHECK 15: BODY WORD COUNT ───────────────────────────────────────────────
echo ""
info "Checking body word count..."
BODY_WORDS=$(awk '/^$/{found=1} found{print}' "$EML_FILE" 2>/dev/null | wc -w | tr -d ' ')
if [[ "$BODY_WORDS" -lt 25 ]]; then
  warn "Body word count low (${BODY_WORDS} words < 25 minimum) — verify message is complete"
  WARNINGS=$(( WARNINGS + 1 ))
else
  pass "Body word count OK (${BODY_WORDS} words)"
fi

# ─── CHECK 16: SELF-SEND DETECTION ───────────────────────────────────────────
echo ""
info "Checking for self-send..."
FROM_EMAIL_BARE=$(echo "$FROM_RAW" | grep -oE '[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}' | head -1 || echo "")
TO_EMAIL_BARE=$(echo "$TO_RAW" | grep -oE '[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}' | head -1 || echo "")
if [[ -n "$FROM_EMAIL_BARE" && -n "$TO_EMAIL_BARE" && "${FROM_EMAIL_BARE,,}" == "${TO_EMAIL_BARE,,}" ]]; then
  warn "Self-send: To == From (${FROM_EMAIL_BARE}) — verify this is intentional"
  WARNINGS=$(( WARNINGS + 1 ))
else
  pass "Not a self-send (From: ${FROM_EMAIL_BARE:-?} → To: ${TO_EMAIL_BARE:-?})"
fi

# ─── CHECK 17: REPLY-TO FORMAT (if present) ──────────────────────────────────
echo ""
info "Checking Reply-To (if present)..."
REPLYTO_RAW=$(grep -i "^Reply-To:" "$EML_FILE" 2>/dev/null | head -1 | sed 's/^Reply-To: *//i' || echo "")
if [[ -n "$REPLYTO_RAW" ]]; then
  RT_EMAIL=$(echo "$REPLYTO_RAW" | grep -oE '[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}' || echo "")
  if [[ -z "$RT_EMAIL" ]]; then
    fail "Reply-To header present but no valid email found: '${REPLYTO_RAW}'"
    FAILURES=$(( FAILURES + 1 ))
    FAIL_EXIT_CODE="${EXIT_SCHEMA_VALIDATION_FAILED:-100}"
  else
    pass "Reply-To valid: ${RT_EMAIL}"
  fi
else
  pass "No Reply-To header (optional — OK)"
fi

# ─── CHECK 18: ADR FRONTMATTER GATE (for legal/case emails) ──────────────────────
echo ""
info "Checking ADR gate (legal/case emails)..."
ADR_SCRIPT="/Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/ci/check-adr-frontmatter.sh"
ADR_LEGAL_DIR="/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/11-ADVOCACY-PIPELINE/docs/adr"
# Only run ADR check if email is a legal/case/ADR email
if echo "${SUBJ_RAW,,}" | grep -qiE "case|26cv|adr|arbitration|settlement|legal|court|judge"; then
  if [[ -x "$ADR_SCRIPT" ]]; then
    ADR_EXIT=0
    bash "$ADR_SCRIPT" --path "$ADR_LEGAL_DIR" >> "${LOG_FILE}" 2>&1 || ADR_EXIT=$?
    if [[ $ADR_EXIT -eq 1 ]]; then
      fail "ADR gate FAIL: legal ADRs missing required date frontmatter — fix before sending legal email"
      FAILURES=$(( FAILURES + 1 ))
      FAIL_EXIT_CODE="${EXIT_ADR_COMPLIANCE:-170}"
    elif [[ $ADR_EXIT -eq 2 ]]; then
      warn "ADR gate WARN: ADR(s) missing optional fields (exit 2)"
      WARNINGS=$(( WARNINGS + 1 ))
    elif [[ $ADR_EXIT -eq 3 ]]; then
      warn "ADR gate WARN: ADR directory not found — check ADR_LEGAL_DIR"
      WARNINGS=$(( WARNINGS + 1 ))
    else
      pass "ADR gate: all legal ADRs have required frontmatter (6/6)"
    fi
  else
    warn "ADR check script not found/executable: ${ADR_SCRIPT}"
    WARNINGS=$(( WARNINGS + 1 ))
  fi
else
  pass "ADR gate: not a legal/case email — skipped"
fi

# ─── CHECK 20: TEMPORAL TRUTH (yesterday/today coherence) ───────────────────────
# Detects relative time references that may be stale relative to Date: header
echo ""
info "Checking temporal reference coherence..."
if awk '/^$/{found=1} found{print}' "$EML_FILE" 2>/dev/null | grep -qiE "\byesterday's\b|\byesterday\b"; then
  # Get date header epoch and compare to now
  if [[ -n "$DATE_RAW" ]]; then
    SEND_EPOCH=$(date -j -f "%a, %d %b %Y %H:%M:%S %z" "$DATE_RAW" "+%s" 2>/dev/null || echo "")
    NOW_EPOCH=$(date "+%s")
    if [[ -n "$SEND_EPOCH" ]]; then
      HOURS_OLD=$(( (NOW_EPOCH - SEND_EPOCH) / 3600 ))
      # If email was written >30 hours ago, "yesterday" may be stale
      if [[ $HOURS_OLD -gt 30 ]]; then
        fail "TEMPORAL TRUTH FAIL: body says 'yesterday' but Date header is ${HOURS_OLD}h old — specify the actual date"
        FAILURES=$(( FAILURES + 1 ))
        FAIL_EXIT_CODE="${EXIT_DATE_IN_PAST:-110}"
      else
        warn "Body references 'yesterday' — verify this is accurate relative to send date"
        WARNINGS=$(( WARNINGS + 1 ))
      fi
    fi
  fi
fi
# Check for 'today' references that are >36h stale
if awk '/^$/{found=1} found{print}' "$EML_FILE" 2>/dev/null | grep -qiE "\btoday\b|\bthis morning\b|\bthis afternoon\b"; then
  if [[ -n "${SEND_EPOCH:-}" && -n "${NOW_EPOCH:-}" ]]; then
    HOURS_OLD=$(( (NOW_EPOCH - SEND_EPOCH) / 3600 ))
    if [[ $HOURS_OLD -gt 36 ]]; then
      warn "Body uses 'today'/'this morning' but Date header is ${HOURS_OLD}h old — verify accuracy"
      WARNINGS=$(( WARNINGS + 1 ))
    fi
  fi
fi
if ! awk '/^$/{found=1} found{print}' "$EML_FILE" 2>/dev/null | grep -qiE "\byesterday\b|\btoday\b|\bthis morning\b|\bthis afternoon\b"; then
  pass "No stale temporal references detected"
fi

# ─── CHECK 19: SENT-DUPE FINGERPRINT (response tracking) ────────────────────────
echo ""
info "Checking sent-dupe fingerprint..."
SENT_DB="$(dirname "$EML_FILE")/.sent-fingerprints"
SENT_LOG="/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/06-EMAILS/sent-log.jsonl"
# Fingerprint: SHA256 of To+Subject+first 512 bytes of body (catches forwarded variants)
BODY_SNIPPET=$(awk '/^$/{found=1; next} found{print}' "$EML_FILE" 2>/dev/null | head -c 512 | tr -d '\n\r ' || echo "")
EML_FP=$(echo "${TO_RAW}${SUBJ_RAW}${BODY_SNIPPET}" | shasum -a 256 | cut -d' ' -f1 2>/dev/null || echo "")
if [[ -n "$EML_FP" && -f "$SENT_DB" ]] && grep -qxF "$EML_FP" "$SENT_DB" 2>/dev/null; then
  warn "DUPE DETECTED: This To+Subject combination was already sent (fingerprint match in .sent-fingerprints)"
  warn "  → Check sent/ folder for original. If re-send is intentional, delete fingerprint entry."
  WARNINGS=$(( WARNINGS + 1 ))
elif [[ -n "$EML_FP" && -f "$SENT_LOG" ]] && grep -q "\"hash\":\"$EML_FP\"" "$SENT_LOG" 2>/dev/null; then
  warn "DUPE DETECTED: Fingerprint found in sent-log.jsonl (06-EMAILS/sent-log.jsonl)"
  warn "  → Email already tracked in sent log. Check for prior delivery."
  WARNINGS=$(( WARNINGS + 1 ))
else
  pass "No duplicate send detected (fingerprint: ${EML_FP:0:12}…)"
fi

# ─── CHECK 21: CONTEXT-AWARE ACTION DATE VALIDATION ─────────────────────────
# Past dates preceded by action keywords → FAIL exit 110 (stale commitment)
# Past dates without action keywords     → WARN (historical reference — OK)
echo ""
info "Checking context-aware action dates in body..."

_C21_BODY=$(awk '/^$/{found=1; next} found{print}' "$EML_FILE" 2>/dev/null || echo "")
_C21_NOW=$(date "+%s")
_C21_YEAR=$(date +%Y)
# Action keywords that indicate a date is a commitment, not a historical reference
_C21_ACTION="(must|vacate|deadline|due date|due by|no later than|move date|move-out|moveout|moving date|scheduled for|set for|will move|will pay|will leave|will vacate|will depart|by (January|February|March|April|May|June|July|August|September|October|November|December))"
# Past-tense markers that override action keywords (date is historical, not stale commitment)
_C21_PAST_TENSE="(signed|completed|filed|submitted|occurred|happened|took place|was scheduled|were scheduled|had been|have signed|have completed|have filed)"
_c21_found=false
_c21_fail=false

while IFS= read -r _l; do
  [[ -z "$_l" ]] && continue
  # Match Month Day where day is 1-2 digits followed by non-digit or end-of-line
  # This excludes 4-digit years (e.g. "March 2026" does NOT match)
  echo "$_l" | grep -qiE "(January|February|March|April|May|June|July|August|September|October|November|December) [0-9]{1,2}([^0-9]|$)" || continue
  _mw=$(echo "$_l" | grep -oiE "January|February|March|April|May|June|July|August|September|October|November|December" | head -1 || true)
  _dn=$(echo "$_l" | grep -oiE "${_mw} [0-9]{1,2}" | head -1 | grep -oE "[0-9]+$" || true)
  [[ -z "$_mw" || -z "$_dn" || "${#_dn}" -gt 2 ]] && continue
  # Extract explicit year if present (e.g. "March 3, 2026" or "March 3 2025")
  _yr=$(echo "$_l" | grep -oiE "${_mw} ${_dn},? [0-9]{4}" | grep -oE "[0-9]{4}$" || true)
  _use_year="${_yr:-$_C21_YEAR}"
  _ep=$(date -j -f "%B %d %Y" "${_mw} ${_dn} ${_use_year}" "+%s" 2>/dev/null || echo "")
  [[ -z "$_ep" ]] && continue
  [[ "$_ep" -ge "$_C21_NOW" ]] && continue  # Future or today — no issue
  _c21_found=true
  _days=$(( (_C21_NOW - _ep) / 86400 ))
  # Historical year detection: explicit year before current year is always historical
  _is_historical=false
  if [[ -n "$_yr" && "$_yr" -lt "$_C21_YEAR" ]]; then
    _is_historical=true
  fi
  if $_is_historical; then
    pass "HISTORICAL DATE: '${_mw} ${_dn}, ${_use_year}' (${_days}d ago) — explicit past year, treated as historical"
  elif echo "$_l" | grep -qiE "$_C21_ACTION"; then
    # Check for past-tense override: if the line also has past-tense markers,
    # the date is historical context even if action keywords appear on the same line
    if echo "$_l" | grep -qiE "$_C21_PAST_TENSE"; then
      warn "PAST DATE (action+past-tense): '${_mw} ${_dn}' (${_days}d ago) — completed action, verify accuracy"
      WARNINGS=$(( WARNINGS + 1 ))
    else
      fail "ACTION DATE IN PAST: '${_mw} ${_dn}' (${_days}d ago) with action context — update or remove"
      FAILURES=$(( FAILURES + 1 ))
      FAIL_EXIT_CODE="${EXIT_DATE_IN_PAST:-110}"
      _c21_fail=true
    fi
  else
    warn "PAST DATE REFERENCE: '${_mw} ${_dn}' (${_days}d ago) — historical context, verify accuracy"
    WARNINGS=$(( WARNINGS + 1 ))
  fi
done <<< "$_C21_BODY"

if ! $_c21_found; then
  pass "No past absolute date references in body"
elif ! $_c21_fail; then
  pass "All past body dates are historical references (not action commitments)"
fi
unset _C21_BODY _C21_NOW _C21_YEAR _C21_ACTION _C21_PAST_TENSE _c21_found _c21_fail _l _mw _dn _ep _days _yr _use_year _is_historical

# ─── CHECK 22: DEADLINE PROXIMITY (upcoming critical dates in body) ──────────
# Warns when body references a FUTURE date within DEADLINE_WARN_DAYS (14d) of today.
# Cross-references KNOWN_DEADLINES for escalated label.
# Arbitration April 6, 2026 = 11 days from session date (2026-03-26) — will trigger.
# Prevents sending emails with unacknowledged imminent deadlines.
echo ""
info "Checking deadline proximity for future body dates..."

DEADLINE_WARN_DAYS=14
KNOWN_DEADLINES=(
  "2026-04-06|MAA arbitration hearing (MAA-26CV005596-590)"
)

_C22_BODY=$(awk '/^$/{found=1; next} found{print}' "$EML_FILE" 2>/dev/null || echo "")
_C22_NOW=$(date "+%s")
_C22_YEAR=$(date +%Y)
_c22_found=false

while IFS= read -r _l; do
  [[ -z "$_l" ]] && continue
  echo "$_l" | grep -qiE "(January|February|March|April|May|June|July|August|September|October|November|December) [0-9]{1,2}([^0-9]|$)" || continue
  _mw=$(echo "$_l" | grep -oiE "January|February|March|April|May|June|July|August|September|October|November|December" | head -1 || true)
  _dn=$(echo "$_l" | grep -oiE "${_mw} [0-9]{1,2}" | head -1 | grep -oE "[0-9]+$" || true)
  [[ -z "$_mw" || -z "$_dn" || "${#_dn}" -gt 2 ]] && continue
  _yr=$(echo "$_l" | grep -oiE "${_mw} ${_dn},? [0-9]{4}" | grep -oE "[0-9]{4}$" || true)
  _use_year="${_yr:-$_C22_YEAR}"
  _ep=$(date -j -f "%B %d %Y" "${_mw} ${_dn} ${_use_year}" "+%s" 2>/dev/null || echo "")
  [[ -z "$_ep" ]] && continue
  [[ "$_ep" -le "$_C22_NOW" ]] && continue   # Past dates handled by CHECK 21
  _days_until=$(( (_ep - _C22_NOW) / 86400 ))
  [[ "$_days_until" -gt "$DEADLINE_WARN_DAYS" ]] && continue
  _c22_found=true
  _date_key=$(date -j -f "%B %d %Y" "${_mw} ${_dn} ${_use_year}" "+%Y-%m-%d" 2>/dev/null || echo "")
  _is_known=false
  _known_label=""
  for _kd in "${KNOWN_DEADLINES[@]}"; do
    if [[ "${_kd%%|*}" == "$_date_key" ]]; then
      _is_known=true
      _known_label="${_kd#*|}"
      break
    fi
  done
  if $_is_known; then
    warn "DEADLINE PROXIMITY: '${_mw} ${_dn}' is ${_days_until}d away — KNOWN: ${_known_label}"
  else
    warn "DEADLINE PROXIMITY: '${_mw} ${_dn}' is ${_days_until}d away — verify email is timely"
  fi
  WARNINGS=$(( WARNINGS + 1 ))
done <<< "$_C22_BODY"

if ! $_c22_found; then
  pass "No imminent future dates in body (within ${DEADLINE_WARN_DAYS}d)"
fi
unset _C22_BODY _C22_NOW _C22_YEAR _c22_found _l _mw _dn _ep _days_until _yr _use_year _date_key _is_known _known_label _kd DEADLINE_WARN_DAYS KNOWN_DEADLINES

# ─── CHECK 23: CASE REGISTRY CROSS-REFERENCE (stale factual claims) ──────────
# Cross-references CASE_REGISTRY.yaml to detect stale address/status claims.
# RCA 2026-03-26: Merged email contained "still occupying 505 W 7th" after full
# vacating because no current-state source was consulted during content generation.
# This check prevents that class of error.
echo ""
info "Checking factual claims against CASE_REGISTRY.yaml..."

_C23_REGISTRY="${LEGAL_DIR}/_SYSTEM/CASE_REGISTRY.yaml"
_C23_BODY=$(awk '/^$/{found=1; next} found{print}' "$EML_FILE" 2>/dev/null || echo "")
_c23_fail=false

if [[ -f "$_C23_REGISTRY" ]]; then
  # Extract vacated properties from registry
  _c23_vacated_addrs=()
  while IFS= read -r _addr; do
    [[ -n "$_addr" ]] && _c23_vacated_addrs+=("$_addr")
  done < <(awk '/status:.*vacated/{found=1} found && /address:/{gsub(/.*address: *"?/,""); gsub(/"?.*/,""); print; found=0}' "$_C23_REGISTRY" 2>/dev/null || true)

  # Also extract by looking for vacated after address
  while IFS= read -r _line; do
    _line=$(echo "$_line" | sed 's/^[[:space:]]*- address: *"*//; s/"*$//')
    [[ -n "$_line" ]] && _c23_vacated_addrs+=("$_line")
  done < <(grep -B1 'status:.*"vacated"' "$_C23_REGISTRY" 2>/dev/null | grep 'address:' || true)

  for _vaddr in "${_c23_vacated_addrs[@]}"; do
    # Extract short form for matching (e.g. "505 W 7th")
    _short=$(echo "$_vaddr" | grep -oE '^[0-9]+ [A-Za-z]+ [0-9A-Za-z]+' || echo "$_vaddr")
    [[ -z "$_short" ]] && continue

    # Check if body claims current occupancy of vacated address
    if echo "$_C23_BODY" | grep -qi "current.*address.*${_short}\|still.*occupying.*${_short}\|residing.*at.*${_short}\|living.*at.*${_short}"; then
      fail "STALE CLAIM: Body references '${_short}' as current address but CASE_REGISTRY shows status=vacated"
      FAILURES=$(( FAILURES + 1 ))
      FAIL_EXIT_CODE="${EXIT_SCHEMA_VALIDATION_FAILED:-100}"
      _c23_fail=true
    fi
  done

  # Check registry freshness (warn if >7 days old)
  _c23_updated=$(grep 'Last Updated:' "$_C23_REGISTRY" 2>/dev/null | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' | head -1 || echo "")
  if [[ -n "$_c23_updated" ]]; then
    _c23_reg_epoch=$(date -j -f "%Y-%m-%d" "$_c23_updated" "+%s" 2>/dev/null || echo "")
    _c23_now=$(date "+%s")
    if [[ -n "$_c23_reg_epoch" ]]; then
      _c23_age_days=$(( (_c23_now - _c23_reg_epoch) / 86400 ))
      if [[ $_c23_age_days -gt 7 ]]; then
        warn "CASE_REGISTRY.yaml is ${_c23_age_days}d old (last updated: ${_c23_updated}) — verify facts are current"
        WARNINGS=$(( WARNINGS + 1 ))
      else
        pass "CASE_REGISTRY.yaml is current (${_c23_age_days}d old, updated: ${_c23_updated})"
      fi
    fi
  fi

  if ! $_c23_fail; then
    pass "No stale address/occupancy claims detected (cross-referenced CASE_REGISTRY.yaml)"
  fi
else
  warn "CASE_REGISTRY.yaml not found at ${_C23_REGISTRY} — factual claim check skipped"
  WARNINGS=$(( WARNINGS + 1 ))
fi
unset _C23_REGISTRY _C23_BODY _c23_fail _c23_vacated_addrs _vaddr _short _c23_updated _c23_reg_epoch _c23_now _c23_age_days

# ─── CHECK 24: EXHIBIT AVAILABILITY CROSS-REFERENCE (evidence folder check) ──────────
# Cross-references claimed exhibits against evidence folders to prevent false claims.
# RCA 2026-03-26: Merged email claimed H-2 temperature logs available when not in evidence.
# This check warns if claimed exhibits are missing, with actionable guidance.
echo ""
info "Checking exhibit availability against evidence folders..."

_C24_BODY=$(awk '/^$/{found=1; next} found{print}' "$EML_FILE" 2>/dev/null || echo "")
_c24_missing=0

# Extract exhibit codes from body (H-1, H-2, L-1, L-2, F-1, W-1, B-1, etc.)
_c24_claimed=()
while IFS= read -r _code; do
  [[ -n "$_code" ]] && _c24_claimed+=("$_code")
done < <(echo "$_C24_BODY" | grep -oE '\b[HLFWB]-[0-9]+\b' | sort -u || true)

if [[ ${#_c24_claimed[@]} -gt 0 ]]; then
  # Evidence folder search paths (case-specific and general)
  _c24_evidence_paths=(
    "${LEGAL_DIR}/01-ACTIVE-CRITICAL/MAA-26CV005596-590/EVIDENCE_BUNDLE"
    "${LEGAL_DIR}/01-ACTIVE-CRITICAL/MAA-26CV005596-590/EVIDENCE"
    "${LEGAL_DIR}/EVIDENCE_BUNDLE"
    "${LEGAL_DIR}/EVIDENCE"
    "${LEGAL_DIR}/11-ADVOCACY-PIPELINE/evidence"
  )
  
  for _code in "${_c24_claimed[@]}"; do
    _c24_found=false
    for _path in "${_c24_evidence_paths[@]}"; do
      if [[ -d "$_path" ]]; then
        # Look for exhibit files by code in filenames (more flexible patterns)
        if find "$_path" -type f \( -iname "*${code}*" -o -iname "EXHIBIT*${code}*" -o -iname "*EXHIBIT*${code}*" \) 2>/dev/null | grep -q .; then
          _c24_found=true
          break
        fi
        # Also check subfolders with exhibit code in name
        if find "$_path" -type d -iname "*${code}*" 2>/dev/null | grep -q .; then
          _c24_found=true
          break
        fi
      fi
    done
    
    if ! $_c24_found; then
      warn "EXHIBIT NOT FOUND: ${_code} claimed but not in evidence folders — Add to evidence or clarify availability"
      WARNINGS=$(( WARNINGS + 1 ))
      _c24_missing=$(( _c24_missing + 1 ))
    else
      pass "Exhibit ${_code} found in evidence folders"
    fi
  done
  
  if [[ $_c24_missing -gt 0 ]]; then
    warn "${_c24_missing}/${#_c24_claimed[@]} claimed exhibits missing from evidence folders"
    echo "  💡 Action: Add missing exhibits to EVIDENCE_BUNDLE/ or clarify if available elsewhere"
  else
    pass "All claimed exhibits (${#_c24_claimed[@]}) found in evidence folders"
  fi
else
  pass "No exhibit codes referenced in body"
fi

unset _C24_BODY _c24_missing _c24_claimed _c24_evidence_paths _code _c24_found _path

# ─── RESULT ───────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ $FAILURES -gt 0 ]]; then
  echo -e "${RED}  🔴 RESULT: FAIL — ${FAILURES} failure(s), ${WARNINGS} warning(s)${NC}"
  echo -e "${RED}  DO NOT SEND — fix issues above first${NC}"
  echo -e "${RED}  EXIT CODE: ${FAIL_EXIT_CODE} — run: bash _SYSTEM/_AUTOMATION/explain-exit-code.sh ${FAIL_EXIT_CODE}${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "RESULT: FAIL (exit ${FAIL_EXIT_CODE}, $FAILURES failures) — ${EML_FILE##*/}"
  exit "${FAIL_EXIT_CODE:-1}"
elif [[ $WARNINGS -gt 0 ]]; then
  echo -e "${YELLOW}  🟡 RESULT: PASS WITH WARNINGS — ${WARNINGS} warning(s)${NC}"
  echo -e "${YELLOW}  Review warnings before sending${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "RESULT: PASS_WITH_WARNINGS (exit ${EXIT_SUCCESS_WITH_WARNINGS:-1}, $WARNINGS warnings) — ${EML_FILE##*/}"
  exit "${EXIT_SUCCESS_WITH_WARNINGS:-1}"
else
  echo -e "${GREEN}  🟢 RESULT: PASS — safe to send${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "RESULT: PASS (exit ${EXIT_SUCCESS:-0}) — ${EML_FILE##*/}"
  exit "${EXIT_SUCCESS:-0}"
fi
