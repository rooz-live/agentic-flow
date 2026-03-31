#!/bin/bash
# Enhanced Email Validator with Robust Exit Codes v2.0
# Usage: validate-emails-robust.sh <email_file> [--json]

# Source robust exit codes
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../_SYSTEM/_AUTOMATION/exit-codes-robust.sh" 2>/dev/null || {
    echo "⚠️  Warning: exit-codes.sh not found, using fallback codes"
    EXIT_SUCCESS=0
    EXIT_INVALID_ARGS=10
    EXIT_FILE_NOT_FOUND=11
    EXIT_INVALID_FORMAT=12
    EXIT_PLACEHOLDER_DETECTED=111
    EXIT_DATE_IN_PAST=110
    EXIT_ADDRESS_MISMATCH=130
    EXIT_LEGAL_CITATION_MALFORMED=150
}

EMAIL_FILE="$1"
JSON_OUTPUT=false
CHECKS_TOTAL=8
CHECKS_PASSED=0
VALIDATION_ITERATION="${VALIDATION_ITERATION:-1}"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        -*)
            echo "❌ ERROR: Unknown option $1"
            exit $EXIT_INVALID_ARGS
            ;;
        *)
            if [ -z "$EMAIL_FILE" ]; then
                EMAIL_FILE="$1"
            fi
            shift
            ;;
    esac
done

# Validation functions
log_result() {
    local status="$1"
    local code="$2"
    local message="$3"
    local suggestion="$4"
    
    if [ "$JSON_OUTPUT" = true ]; then
        echo "{\"status\":\"$status\",\"code\":$code,\"message\":\"$message\",\"suggestion\":\"$suggestion\",\"file\":\"$EMAIL_FILE\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"checks_passed\":$CHECKS_PASSED,\"checks_total\":$CHECKS_TOTAL,\"iteration\":$VALIDATION_ITERATION,\"%/#\":{\"checks_passed\":$CHECKS_PASSED,\"checks_total\":$CHECKS_TOTAL},\"%.#\":{\"iteration\":$VALIDATION_ITERATION}}"
    else
        if [ "$status" = "success" ]; then
            echo "✅ $message"
        elif [ "$status" = "warning" ]; then
            echo "⚠️  $message"
        else
            echo "❌ ERROR: $message"
            [ -n "$suggestion" ] && echo "👉 Suggestion: $suggestion"
        fi
    fi
}

# Check 1: Arguments provided?
if [ -z "$EMAIL_FILE" ]; then
    log_result "error" $EXIT_INVALID_ARGS "No email file provided" "Usage: validate-emails-robust.sh <email_file> [--json]"
    exit $EXIT_INVALID_ARGS
fi
CHECKS_PASSED=$((CHECKS_PASSED + 1))

# Check 2: File exists?
if [ ! -f "$EMAIL_FILE" ]; then
    log_result "error" $EXIT_FILE_NOT_FOUND "File not found: $EMAIL_FILE" "Check file path and permissions"
    exit $EXIT_FILE_NOT_FOUND
fi
CHECKS_PASSED=$((CHECKS_PASSED + 1))

# Check 3: Valid email format?
if [[ ! "$EMAIL_FILE" =~ \.eml$ ]]; then
    log_result "error" $EXIT_INVALID_FORMAT "Invalid format: Expected .eml file" "Rename file with .eml extension"
    exit $EXIT_INVALID_FORMAT
fi
CHECKS_PASSED=$((CHECKS_PASSED + 1))

# Check 4: Required email headers present?
if ! grep -q "^From:" "$EMAIL_FILE" || ! grep -q "^To:" "$EMAIL_FILE" || ! grep -q "^Subject:" "$EMAIL_FILE"; then
    log_result "error" $EXIT_MISSING_REQUIRED_FIELD "Missing required email headers (From:, To:, Subject:)" "Add missing headers to email file"
    exit $EXIT_MISSING_REQUIRED_FIELD
fi
CHECKS_PASSED=$((CHECKS_PASSED + 1))

# Check 5: Placeholder detection
if grep -q '{{[A-Z_]*}}' "$EMAIL_FILE"; then
    PLACEHOLDERS=$(grep -o '{{[A-Z_]*}}' "$EMAIL_FILE" | sort -u | tr '\n' ' ')
    log_result "error" $EXIT_PLACEHOLDER_DETECTED "Placeholders detected: $PLACEHOLDERS" "Replace template variables with actual values"
    exit $EXIT_PLACEHOLDER_DETECTED
fi
CHECKS_PASSED=$((CHECKS_PASSED + 1))

# Check 6: Date sanity (March 7, 2026 move date)
MOVE_DATE=$(grep -oE 'March [0-9]{1,2}, 2026' "$EMAIL_FILE" | head -1)
if [ -n "$MOVE_DATE" ]; then
    if command -v date >/dev/null 2>&1; then
        MOVE_DATE_UNIX=$(date -j -f "%B %d, %Y" "$MOVE_DATE" "+%s" 2>/dev/null || date -d "$MOVE_DATE" "+%s" 2>/dev/null)
        TODAY_UNIX=$(date "+%s")
        if [ -n "$MOVE_DATE_UNIX" ] && [ "$MOVE_DATE_UNIX" -lt "$TODAY_UNIX" ]; then
            log_result "error" $EXIT_DATE_IN_PAST "Move date $MOVE_DATE is in the past" "Update move date to future date"
            exit $EXIT_DATE_IN_PAST
        fi
    fi
fi
CHECKS_PASSED=$((CHECKS_PASSED + 1))

# Check 7: Address validation (505 W 7th St → 110 Frazier Ave)
if grep -q "505 W 7th St" "$EMAIL_FILE" && grep -q "110 Frazier Ave" "$EMAIL_FILE"; then
    # Both addresses present - good
    :
elif grep -q "505 W 7th St" "$EMAIL_FILE" || grep -q "110 Frazier Ave" "$EMAIL_FILE"; then
    log_result "warning" $EXIT_SUCCESS_WITH_WARNINGS "Only one address found, verify start/end addresses are correct" "Check both 505 W 7th St and 110 Frazier Ave are mentioned"
else
    log_result "error" $EXIT_ADDRESS_MISMATCH "Neither start nor end address found" "Add 505 W 7th St (start) and 110 Frazier Ave (end) addresses"
    exit $EXIT_ADDRESS_MISMATCH
fi
CHECKS_PASSED=$((CHECKS_PASSED + 1))

# Check 8: Legal citation format (N.C.G.S. §)
if grep -q "N\.C\.G\.S\." "$EMAIL_FILE"; then
    if ! grep -q "N\.C\.G\.S\. §" "$EMAIL_FILE"; then
        log_result "error" $EXIT_LEGAL_CITATION_MALFORMED "Legal citation malformed: Missing § symbol after N.C.G.S." "Use format: N.C.G.S. § [section]"
        exit $EXIT_LEGAL_CITATION_MALFORMED
    fi
fi
CHECKS_PASSED=$((CHECKS_PASSED + 1))

# All checks passed — emit %/# and %.# for iteration-telemetry alignment with validation-runner.sh
if [ "$JSON_OUTPUT" = true ]; then
    echo "{\"verdict\":\"PASS\",\"exit_code\":$EXIT_SUCCESS,\"RUNNER_EXIT\":$EXIT_SUCCESS,\"good_enough_to_send\":true,\"%/#\":{\"checks_passed\":$CHECKS_PASSED,\"checks_total\":$CHECKS_TOTAL},\"%.#\":{\"iteration\":$VALIDATION_ITERATION,\"pass_rate_pct\":100,\"checks_failed\":0},\"checks_passed\":$CHECKS_PASSED,\"checks_total\":$CHECKS_TOTAL,\"iteration\":$VALIDATION_ITERATION,\"fix_hints\":[]}"
else
    log_result "success" $EXIT_SUCCESS "Email validation passed - safe to send" "Email is ready for transmission"
fi
exit $EXIT_SUCCESS
