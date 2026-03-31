#!/bin/bash
# email-hitl-gate.sh — Human-in-the-Loop Gate for Email Sending
# Purpose: Prevent emails from being marked as "sent" until HITL confirms actual Mail.app dispatch
# Usage: ./email-hitl-gate.sh --validate <email.eml> [--hitl-approve]
# Exit Codes: 0=approved for sent/, 1=validation failed, 2=pending HITL, 3=not actually sent

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source exit codes
if [[ -f "$PROJECT_ROOT/_SYSTEM/_AUTOMATION/exit-codes-robust.sh" ]]; then
    source "$PROJECT_ROOT/_SYSTEM/_AUTOMATION/exit-codes-robust.sh"
else
    readonly EX_SUCCESS=0
    readonly EX_VALIDATION_FAILED=150
    readonly EX_HITL_PENDING=170
    readonly EX_NOT_ACTUALLY_SENT=180
fi

# Directories
LEGAL_DIR="${HOME}/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL"
VALIDATED_DIR="${LEGAL_DIR}/02-EMAILS/validated"
SENT_DIR="${LEGAL_DIR}/02-EMAILS/sent"
DRAFTS_DIR="${LEGAL_DIR}/02-EMAILS/drafts"
HITL_LOG="${LEGAL_DIR}/02-EMAILS/hitl-verification.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $*"; }
success() { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*"; }

# Parse arguments
EMAIL_FILE=""
HITL_APPROVE=false
VALIDATE_ONLY=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --validate|-v) EMAIL_FILE="$2"; shift 2 ;;
        --hitl-approve|-a) HITL_APPROVE=true; shift ;;
        --validate-only) VALIDATE_ONLY=true; shift ;;
        --help|-h)
            echo "Usage: $0 --validate <email.eml> [--hitl-approve] [--validate-only]"
            echo ""
            echo "  --validate <file>   Validate email before sending"
            echo "  --hitl-approve      Mark as approved for sent/ (after Mail.app confirms)"
            echo "  --validate-only     Only validate, don't move to sent/"
            echo ""
            echo "Exit codes:"
            echo "  0 = Approved for sent/"
            echo "  150 = Validation failed (blockers found)"
            echo "  170 = Pending HITL approval"
            echo "  180 = Not confirmed as actually sent"
            exit 0
            ;;
        *) error "Unknown option: $1"; exit $EX_VALIDATION_FAILED ;;
    esac
done

if [[ -z "$EMAIL_FILE" ]]; then
    error "--validate <email-file> required"
    exit $EX_VALIDATION_FAILED
fi

if [[ ! -f "$EMAIL_FILE" ]]; then
    error "File not found: $EMAIL_FILE"
    exit $EX_VALIDATION_FAILED
fi

FILENAME=$(basename "$EMAIL_FILE")

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 1: Run lean validation
# ═══════════════════════════════════════════════════════════════════════════════
log "Running validation gate for: $FILENAME"

# Run validation and capture exit code
set +e
VALIDATION_OUTPUT=$("${SCRIPT_DIR}/email-gate-lean.sh" --file "$EMAIL_FILE" --json 2>&1)
VALIDATION_EXIT=$?
set -e

echo "$VALIDATION_OUTPUT"

# Handle validation results
# email-gate-lean.sh exit codes: 0=PASS, 2=WARNING, 160=EX_VALIDATION_WARNING, 150=BLOCKER
case $VALIDATION_EXIT in
    0)
        log "Validation passed (no warnings)"
        ;;
    2|160)
        log "Validation passed with warnings (acceptable for HITL)"
        ;;
    150)
        error "Validation failed with BLOCKERS (exit 150)"
        error "Email NOT approved for sent/ — fix blockers first"
        
        # Move to drafts if not already there
        if [[ ! -f "${DRAFTS_DIR}/${FILENAME}" ]]; then
            cp "$EMAIL_FILE" "${DRAFTS_DIR}/${FILENAME}"
            log "Copied to drafts: ${DRAFTS_DIR}/${FILENAME}"
        fi
        
        exit $EX_VALIDATION_FAILED
        ;;
    *)
        error "Validation failed with unexpected exit code $VALIDATION_EXIT"
        error "Email NOT approved for sent/"
        exit $EX_VALIDATION_FAILED
        ;;
esac

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2: Check if already in validated/
# ═══════════════════════════════════════════════════════════════════════════════
if [[ ! -f "${VALIDATED_DIR}/${FILENAME}" ]]; then
    # Copy to validated/
    cp "$EMAIL_FILE" "${VALIDATED_DIR}/${FILENAME}"
    success "Email validated and copied to: ${VALIDATED_DIR}/${FILENAME}"
else
    log "Already in validated/: $FILENAME"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3: HITL Verification Gate
# ═══════════════════════════════════════════════════════════════════════════════
if [[ "$VALIDATE_ONLY" == true ]]; then
    warn "VALIDATE-ONLY mode: Email validated but NOT moved to sent/"
    warn "Next step: Manually send via Mail.app, then run with --hitl-approve"
    
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "HITL CHECKPOINT: Manual verification required"
    echo "════════════════════════════════════════════════════════════════"
    echo "1. Open: $EMAIL_FILE"
    echo "2. Review content in Mail.app"
    echo "3. Send the email"
    echo "4. Run: $0 --validate $EMAIL_FILE --hitl-approve"
    echo "════════════════════════════════════════════════════════════════"
    
    exit $EX_HITL_PENDING
fi

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 4: HITL Approval Check
# ═══════════════════════════════════════════════════════════════════════════════
if [[ "$HITL_APPROVE" == false ]]; then
    warn "HITL approval required before moving to sent/"
    warn "Email is validated but NOT marked as sent"
    
    # Log the pending HITL
    echo "$(date '+%Y-%m-%dT%H:%M:%S')|PENDING|$FILENAME|Awaiting HITL approval" >> "$HITL_LOG"
    
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "HITL GATE ACTIVE: Email held in validated/"
    echo "════════════════════════════════════════════════════════════════"
    echo "File: $FILENAME"
    echo "Status: VALIDATED → PENDING HITL"
    echo "Location: ${VALIDATED_DIR}/${FILENAME}"
    echo ""
    echo "To approve (after confirming Mail.app sent it):"
    echo "  $0 --validate $EMAIL_FILE --hitl-approve"
    echo "════════════════════════════════════════════════════════════════"
    
    exit $EX_HITL_PENDING
fi

# T0 ENHANCEMENT: AppleScript Mail.app verification function
verify_mail_app_dispatch() {
    local subject="$1"
    local recipient="$2"

    log "Verifying Mail.app dispatch for: $subject → $recipient"

    # Check if Mail.app is running
    if ! pgrep -x "Mail" > /dev/null; then
        warn "Mail.app is not running - cannot verify dispatch"
        return 1
    fi

    # Use AppleScript to check Sent mailbox for the email
    local applescript="
    tell application \"Mail\"
        try
            set sentMailbox to sent mailbox of account 1
            set recentMessages to messages of sentMailbox whose date sent > (current date) - (1 * days)
            repeat with msg in recentMessages
                if subject of msg contains \"$subject\" then
                    return \"FOUND\"
                end if
            end repeat
            return \"NOT_FOUND\"
        on error
            return \"ERROR\"
        end try
    end tell"

    local result
    result=$(osascript -e "$applescript" 2>/dev/null || echo "ERROR")

    case "$result" in
        "FOUND")
            log "✅ Email found in Mail.app Sent mailbox"
            return 0
            ;;
        "NOT_FOUND")
            warn "⚠️ Email not found in Mail.app Sent mailbox"
            return 1
            ;;
        "ERROR"|*)
            warn "❌ Error checking Mail.app Sent mailbox: $result"
            return 1
            ;;
    esac
}

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 5: HITL Approval — Move to sent/
# ═══════════════════════════════════════════════════════════════════════════════
if [[ "$HITL_APPROVE" == true ]]; then
    log "HITL approval received for: $FILENAME"
    
    # Verify email exists in validated/
    if [[ ! -f "${VALIDATED_DIR}/${FILENAME}" ]]; then
        error "Email not found in validated/: $FILENAME"
        error "Cannot approve — validation required first"
        exit $EX_VALIDATION_FAILED
    fi

    # T0 ENHANCEMENT: Extract subject and recipient for Mail.app verification
    local email_subject
    local email_recipient
    email_subject=$(grep -i "^Subject:" "${VALIDATED_DIR}/${FILENAME}" | head -1 | sed 's/^Subject: *//' || echo "")
    email_recipient=$(grep -i "^To:" "${VALIDATED_DIR}/${FILENAME}" | head -1 | sed 's/^To: *//' || echo "")

    # Verify Mail.app dispatch (optional - warn if not found but don't block)
    if [[ -n "$email_subject" ]]; then
        if verify_mail_app_dispatch "$email_subject" "$email_recipient"; then
            log "✅ Mail.app verification: Email confirmed in Sent mailbox"
        else
            warn "⚠️ Mail.app verification: Email not found in Sent mailbox"
            warn "   This may indicate the email was not actually sent"
            warn "   Proceeding with HITL approval but flagging for review"
            echo "$(date '+%Y-%m-%dT%H:%M:%S')|WARNING|$FILENAME|Mail.app verification failed but HITL approved" >> "$HITL_LOG"
        fi
    fi

    # Move to sent/
    cp "${VALIDATED_DIR}/${FILENAME}" "${SENT_DIR}/${FILENAME}"
    
    # Log the approval
    echo "$(date '+%Y-%m-%dT%H:%M:%S')|APPROVED|$FILENAME|HITL confirmed Mail.app dispatch" >> "$HITL_LOG"
    
    success "════════════════════════════════════════════════════════════════"
    success "HITL GATE PASSED: Email moved to sent/"
    success "════════════════════════════════════════════════════════════════"
    success "File: $FILENAME"
    success "Status: VALIDATED → HITL APPROVED → SENT"
    success "Location: ${SENT_DIR}/${FILENAME}"
    success "════════════════════════════════════════════════════════════════"
    
    exit $EX_SUCCESS
fi

# Should not reach here
error "Unknown state — check arguments"
exit $EX_VALIDATION_FAILED
