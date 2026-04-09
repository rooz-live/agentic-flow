#!/bin/bash
# check-maa-inbox.sh - MAA Inbox Monitor with AppleScript (Fixed)
# Polls Mail.app for MAA correspondence and triggers desktop notifications
# 
# FIXES APPLIED (Risk R1):
# - JSON serialization in AppleScript for reliable parsing
# - Proper JSON parsing using jq or native bash
# - Enhanced metadata validation before firing alerts
# - Retry mechanism for race conditions
# - Comprehensive logging for debugging

# CRITICAL FIX (QE Review): Remove -e to prevent immediate exit on error
set -uo pipefail

# Configuration
CASE_NUMBER="${CASE_NUMBER:-26CV005596-590}"
CASE_DIR="${CASE_DIR:-$HOME/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-${CASE_NUMBER}}"
LOG_DIR="${CASE_DIR}/INBOX_MONITOR_LOGS"
LAST_CHECK_FILE="${LOG_DIR}/last_check.txt"
ALERT_LOG="${LOG_DIR}/alerts.log"
ERROR_LOG="${LOG_DIR}/../../logs/errors.log"
PARSING_LOG="${LOG_DIR}/parsing.log"

# MAA email filters
MAA_SENDERS=("@maac.com" "Bolton" "DelPriore" "@maa")

# Retry configuration
MAX_RETRIES="${MAX_RETRIES:-3}"
RETRY_DELAY="${RETRY_DELAY:-2}"  # seconds

# Ensure log directory exists
mkdir -p "${LOG_DIR}"
mkdir -p "$(dirname "${ERROR_LOG}")"

# Function: Log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${ALERT_LOG}"
}

# CRITICAL FIX (R1): Add error logging function
log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" | tee -a "${ERROR_LOG}" "${ALERT_LOG}"
}

# CRITICAL FIX (R1): Add parsing debug log function
log_parse() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] PARSE: $*" >> "${PARSING_LOG}"
}

# Function: Get last check timestamp
get_last_check() {
    if [[ -f "${LAST_CHECK_FILE}" ]]; then
        cat "${LAST_CHECK_FILE}"
    else
        echo "1970-01-01 00:00:00"
    fi
}

# Function: Update last check timestamp
update_last_check() {
    date '+%Y-%m-%d %H:%M:%S' > "${LAST_CHECK_FILE}"
}

# Function: Check if sender matches MAA filters
is_maa_sender() {
    local sender="$1"
    for filter in "${MAA_SENDERS[@]}"; do
        if [[ "${sender}" == *"${filter}"* ]]; then
            return 0
        fi
    done
    return 1
}

# CRITICAL FIX (R1): Escape JSON special characters
escape_json() {
    local str="$1"
    # Escape backslashes, double quotes, newlines, tabs
    str="${str//\\/\\\\}"
    str="${str//\"/\\\"}"
    str="${str//$'\n'/\\n}"
    str="${str//$'\r'/\\r}"
    str="${str//$'\t'/\\t}"
    echo -n "${str}"
}

# CRITICAL FIX (R1): Extract email metadata using AppleScript with JSON output
check_mail_app() {
    local last_check="$1"
    local attempt="${2:-1}"
    
    log_parse "Attempt ${attempt}: Querying Mail.app (last_check: ${last_check})"
    
    # CRITICAL FIX (R1): AppleScript now returns JSON for reliable parsing
    local applescript=$(cat <<'EOF'
tell application "Mail"
    try
        set emailList to {}
        set inboxes to mailboxes whose name is "Inbox"
        
        repeat with inbox in inboxes
            set messages to (every message of inbox whose date received > (current date) - (1 * days))
            
            repeat with msg in messages
                set msgSubject to subject of msg
                set msgSender to sender of msg
                set msgDate to date received of msg
                
                -- Handle missing values
                if msgSubject is missing value then set msgSubject to ""
                if msgSender is missing value then set msgSender to ""
                
                -- Only include emails with non-empty metadata
                if (length of msgSubject > 0) and (length of msgSender > 0) then
                    -- Escape special characters for JSON
                    set msgSubject to my escapeJSON(msgSubject)
                    set msgSender to my escapeJSON(msgSender)
                    
                    -- Create JSON object for this email
                    set jsonEntry to "{\"subject\":\"" & msgSubject & "\",\"sender\":\"" & msgSender & "\"}"
                    set end of emailList to jsonEntry
                end if
            end repeat
        end repeat
        
        -- Return JSON array
        if (length of emailList) > 0 then
            set jsonOutput to "["
            repeat with i from 1 to length of emailList
                set jsonOutput to jsonOutput & (item i of emailList)
                if i < (length of emailList) then
                    set jsonOutput to jsonOutput & ","
                end if
            end repeat
            set jsonOutput to jsonOutput & "]"
            return jsonOutput
        else
            return "[]"
        end if
        
    on error errMsg
        return "{\"error\":\"" & errMsg & "\"}"
    end try
end tell

on escapeJSON(str)
    set str to str as string
    -- Escape backslashes
    set str to my replace(str, "\\", "\\\\")
    -- Escape double quotes
    set str to my replace(str, "\"", "\\\"")
    -- Escape newlines
    set str to my replace(str, ASCII character 10, "\\n")
    -- Escape carriage returns
    set str to my replace(str, ASCII character 13, "\\r")
    -- Escape tabs
    set str to my replace(str, ASCII character 9, "\\t")
    return str
end escapeJSON

on replace(str, oldChar, newChar)
    set AppleScript's text item delimiters to oldChar
    set textItems to every text item of str
    set AppleScript's text item delimiters to newChar
    return textItems as string
end replace
EOF
)
    
    # Execute AppleScript and capture output
    local raw_output
    raw_output=$(osascript -e "${applescript}" 2>&1)
    local exit_code=$?
    
    log_parse "Attempt ${attempt}: osascript exit code: ${exit_code}"
    log_parse "Attempt ${attempt}: Raw output length: ${#raw_output}"
    log_parse "Attempt ${attempt}: Raw output (first 200 chars): ${raw_output:0:200}"
    
    if [[ ${exit_code} -ne 0 ]]; then
        log_error "AppleScript execution failed (attempt ${attempt}): ${raw_output}"
        echo ""
        return 1
    fi
    
    echo "${raw_output}"
}

# CRITICAL FIX (R1): Parse JSON output using jq or native bash
parse_json_output() {
    local json_output="$1"
    
    # Check if jq is available
    if command -v jq &> /dev/null; then
        log_parse "Using jq for JSON parsing"
        
        # Validate JSON format
        if ! echo "${json_output}" | jq empty 2>/dev/null; then
            log_parse "Invalid JSON format detected"
            return 1
        fi
        
        # Extract emails from JSON array
        local emails
        emails=$(echo "${json_output}" | jq -r '.[] | "\(.subject)|\(.sender)"' 2>/dev/null || echo "")
        
        if [[ -n "${emails}" ]]; then
            log_parse "Successfully parsed ${emails} emails using jq"
            echo "${emails}"
            return 0
        fi
    else
        log_parse "jq not available, using native bash JSON parsing"
        
        # Native bash JSON parsing (fallback)
        # Extract subject and sender from JSON objects
        local emails=""
        local in_subject=false
        local in_sender=false
        local current_subject=""
        local current_sender=""
        local i=0
        local len=${#json_output}
        local char
        local next_char
        
        while [[ $i -lt $len ]]; do
            char="${json_output:$i:1}"
            
            # Look for "subject":" pattern
            if [[ "${json_output:$i:10}" == '"subject":"' ]]; then
                i=$((i + 10))
                in_subject=true
                current_subject=""
                continue
            fi
            
            # Look for "sender":" pattern
            if [[ "${json_output:$i:9}" == '"sender":"' ]]; then
                i=$((i + 9))
                in_sender=true
                current_sender=""
                continue
            fi
            
            # Handle escaped characters
            if [[ "${char}" == "\\" ]] && [[ $((i + 1)) -lt $len ]]; then
                next_char="${json_output:$((i+1)):1}"
                case "${next_char}" in
                    n) char=$'\n'; i=$((i + 1)) ;;
                    r) char=$'\r'; i=$((i + 1)) ;;
                    t) char=$'\t'; i=$((i + 1)) ;;
                    "\\") char='\\'; i=$((i + 1)) ;;
                    '"') char='"'; i=$((i + 1)) ;;
                esac
            fi
            
            # End of string
            if [[ "${char}" == '"' ]]; then
                if [[ "${in_subject}" == true ]]; then
                    in_subject=false
                elif [[ "${in_sender}" == true ]]; then
                    in_sender=false
                    # We have both subject and sender
                    if [[ -n "${current_subject}" ]] && [[ -n "${current_sender}" ]]; then
                        if [[ -n "${emails}" ]]; then
                            emails="${emails}"$'\n'
                        fi
                        emails="${emails}${current_subject}|${current_sender}"
                    fi
                    current_subject=""
                    current_sender=""
                fi
            elif [[ "${in_subject}" == true ]]; then
                current_subject="${current_subject}${char}"
            elif [[ "${in_sender}" == true ]]; then
                current_sender="${current_sender}${char}"
            fi
            
            i=$((i + 1))
        done
        
        if [[ -n "${emails}" ]]; then
            log_parse "Successfully parsed emails using native bash parsing"
            echo "${emails}"
            return 0
        fi
    fi
    
    log_parse "No valid emails found in JSON output"
    return 1
}

# CRITICAL FIX (R1): Parse and validate email metadata with retry
parse_email_metadata() {
    local raw_output="$1"
    local attempt="${2:-1}"
    
    log_parse "Parsing attempt ${attempt}: Input length: ${#raw_output}"
    
    # Check if output is empty
    if [[ -z "${raw_output}" ]]; then
        log_parse "Empty AppleScript output"
        return 1
    fi
    
    # Check for error in output
    if [[ "${raw_output}" == *"error"* ]]; then
        log_parse "Error detected in AppleScript output: ${raw_output}"
        return 1
    fi
    
    # Check for empty array
    if [[ "${raw_output}" == "[]" ]]; then
        log_parse "Empty email array (no new emails)"
        return 1
    fi
    
    # Parse JSON output
    local emails
    if emails=$(parse_json_output "${raw_output}"); then
        # Process each email
        while IFS= read -r email_line; do
            if [[ -n "${email_line}" ]]; then
                local subject=$(echo "${email_line}" | cut -d'|' -f1)
                local sender=$(echo "${email_line}" | cut -d'|' -f2)
                
                log_parse "Processing email - Subject: '${subject}' (${#subject} chars), Sender: '${sender}' (${#sender} chars)"
                
                # CRITICAL FIX (R1): Validate metadata BEFORE processing
                # Check for empty fields
                if [[ -z "${subject}" || -z "${sender}" ]]; then
                    log_parse "WARNING: Empty metadata detected - subject='${subject}' sender='${sender}' - SKIPPING"
                    continue
                fi
                
                # Check for minimum length
                if [[ ${#subject} -lt 3 || ${#sender} -lt 5 ]]; then
                    log_parse "WARNING: Metadata too short - subject='${subject}' (${#subject} chars) sender='${sender}' (${#sender} chars) - SKIPPING"
                    continue
                fi
                
                # Check for placeholder values
                if [[ "${subject}" == *"missing value"* ]] || [[ "${sender}" == *"missing value"* ]]; then
                    log_parse "WARNING: Missing value detected - SKIPPING"
                    continue
                fi
                
                # Check if sender matches MAA filters
                if is_maa_sender "${sender}"; then
                    log_parse "VALID MAA email found - Subject: '${subject}' From: '${sender}'"
                    echo "SUBJECT:${subject}|SENDER:${sender}"
                    return 0
                else
                    log_parse "Email from non-MAA sender: '${sender}' - SKIPPING"
                fi
            fi
        done <<< "${emails}"
    fi
    
    log_parse "No valid MAA emails found in attempt ${attempt}"
    return 1
}

# CRITICAL FIX (R1): Add retry mechanism for race conditions
check_mail_with_retry() {
    local last_check="$1"
    local attempt=1
    
    while [[ ${attempt} -le ${MAX_RETRIES} ]]; do
        log "Checking inbox (attempt ${attempt}/${MAX_RETRIES})"
        
        local raw_output
        raw_output=$(check_mail_app "${last_check}" "${attempt}")
        
        if [[ -n "${raw_output}" ]]; then
            local metadata
            if metadata=$(parse_email_metadata "${raw_output}" "${attempt}"); then
                echo "${metadata}"
                return 0
            fi
        fi
        
        # If not the last attempt, wait before retrying
        if [[ ${attempt} -lt ${MAX_RETRIES} ]]; then
            log "Retry ${attempt} failed, waiting ${RETRY_DELAY}s before next attempt..."
            sleep "${RETRY_DELAY}"
        fi
        
        attempt=$((attempt + 1))
    done
    
    log "All ${MAX_RETRIES} attempts completed - No valid MAA emails found"
    return 1
}

# Function: Send desktop notification
send_notification() {
    local subject="$1"
    local sender="$2"
    
    log_parse "Sending notification - Subject: '${subject}' From: '${sender}'"
    osascript -e "display notification \"From: ${sender}\" with title \"MAA Email Received\" subtitle \"${subject}\" sound name \"Glass\""
    log "ALERT: MAA email detected - Subject: '${subject}' From: '${sender}'"
}

# Function: Check for duplicate alerts
is_duplicate_alert() {
    local subject="$1"
    local sender="$2"
    
    # Check if same email alerted in last 24 hours
    if [[ -f "${ALERT_LOG}" ]]; then
        local recent_alert=$(grep -F "${subject}" "${ALERT_LOG}" | tail -1 || echo "")
        if [[ -n "${recent_alert}" ]]; then
            local alert_time=$(echo "${recent_alert}" | grep -o '\[.*\]' | tr -d '[]')
            local alert_epoch=$(date -j -f "%Y-%m-%d %H:%M:%S" "${alert_time}" +%s 2>/dev/null || echo 0)
            local current_epoch=$(date +%s)
            local diff=$((current_epoch - alert_epoch))
            
            # 24 hours = 86400 seconds
            if [[ ${diff} -lt 86400 ]]; then
                log "SKIP: Duplicate alert for '${subject}' (alerted ${diff}s ago)"
                return 0
            fi
        fi
    fi
    
    return 1
}

# Main execution
main() {
    log "Starting inbox check for case ${CASE_NUMBER}"
    
    local last_check=$(get_last_check)
    log "Last check: ${last_check}"
    
    # CRITICAL FIX (R1): Query Mail.app with retry mechanism
    if metadata=$(check_mail_with_retry "${last_check}"); then
        local subject=$(echo "${metadata}" | cut -d'|' -f1 | cut -d: -f2)
        local sender=$(echo "${metadata}" | cut -d'|' -f2 | cut -d: -f2)
        
        log_parse "Metadata extracted - Subject: '${subject}' Sender: '${sender}'"
        
        # Check for duplicates
        if ! is_duplicate_alert "${subject}" "${sender}"; then
            send_notification "${subject}" "${sender}"
            
            # Trigger scenario classification
            if [[ -x "${CASE_DIR}/../../scripts/inbox-monitor-simple.sh" ]]; then
                log "Triggering scenario classification..."
                "${CASE_DIR}/../../scripts/inbox-monitor-simple.sh" --trigger
            fi
        fi
    else
        log "No new MAA emails found"
    fi
    
    # Update last check timestamp
    update_last_check
    log "Check complete"
}

# Run main function
main "$@"
