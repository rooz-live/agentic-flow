#!/usr/bin/env bash
# scripts/validators/semantic/validate-email-presend.sh
# Pre-send email validator: Checks WSJF matrix and validates email before sending

set -euo pipefail

# Source robust exit codes
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
if [[ -f "$PROJECT_ROOT/scripts/validation-core.sh" ]]; then
    source "$PROJECT_ROOT/scripts/validation-core.sh"
fi

EMAIL_FILE="$1"
WSJF_MATRIX="/Users/shahroozbhopti/Documents/code/investing/agentic-flow/WSJF-RISK-MATRIX.yaml"
LOG_FILE="/Users/shahroozbhopti/Library/Logs/email-presend.log"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Check if email file exists
if [[ ! -f "$EMAIL_FILE" ]]; then
    log "${RED}ERROR: Email file not found: $EMAIL_FILE${NC}"
    exit $EXIT_SCHEMA_VALIDATION_FAILED
fi

log "${GREEN}=== Pre-Send Email Validator v1.0 ===${NC}"
log "Validating: $EMAIL_FILE"

# STEP 1: Extract email metadata
extract_metadata() {
    local subject=$(grep -i "^Subject:" "$EMAIL_FILE" | head -1 | cut -d: -f2- | xargs)
    local to=$(grep -i "^To:" "$EMAIL_FILE" | head -1 | cut -d: -f2- | xargs)
    local from=$(grep -i "^From:" "$EMAIL_FILE" | head -1 | cut -d: -f2- | xargs)
    
    echo "SUBJECT: $subject"
    echo "TO: $to"
    echo "FROM: $from"
}

metadata=$(extract_metadata)
log "$metadata"

# STEP 2: Check WSJF matrix for conflicting priorities
check_wsjf_conflicts() {
    if [[ ! -f "$WSJF_MATRIX" ]]; then
        log "${YELLOW}WSJF matrix not found, skipping conflict check${NC}"
        return 0
    fi
    
    # Check if email recipient has HIGH priority tasks pending
    local recipient=$(echo "$metadata" | grep "^TO:" | cut -d: -f2- | xargs | cut -d@ -f1)
    
    if grep -qi "HIGH.*$recipient\|$recipient.*HIGH" "$WSJF_MATRIX"; then
        log "${YELLOW}WARNING: Recipient has HIGH priority tasks in WSJF matrix${NC}"
        return 1
    fi
    
    return 0
}

# STEP 3: Validate email content
validate_content() {
    local body=$(sed -n '/^$/,$p' "$EMAIL_FILE")
    
    # Check for common issues
    if echo "$body" | grep -qi "TODO\|FIXME\|XXX"; then
        log "${RED}ERROR: Email contains TODO/FIXME markers${NC}"
        return 1
    fi
    
    if echo "$body" | grep -qi "DRAFT\|DO NOT SEND"; then
        log "${RED}ERROR: Email is marked as DRAFT${NC}"
        return 1
    fi
    
    # Check for date accuracy (future dates)
    local today=$(date +%Y-%m-%d)
    if echo "$body" | grep -oE "[0-9]{4}-[0-9]{2}-[0-9]{2}" | while read date; do
        if [[ "$date" > "$today" ]]; then
            log "${YELLOW}WARNING: Email contains future date: $date${NC}"
            return 1
        fi
    done; then
        return 1
    fi
    
    return 0
}

# STEP 4: Run validators
check_wsjf_conflicts
wsjf_status=$?

validate_content
content_status=$?

# STEP 5: Final verdict
if [[ $wsjf_status -eq 0 && $content_status -eq 0 ]]; then
    log "${GREEN}✅ PASS: Email is safe to send${NC}"
    exit $EXIT_SUCCESS
else
    log "${RED}❌ FAIL: Email validation failed${NC}"
    log "WSJF conflicts: $wsjf_status"
    log "Content validation: $content_status"
    exit $EXIT_SCHEMA_VALIDATION_FAILED
fi
