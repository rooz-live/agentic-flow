#!/bin/bash
#
# validate-email.sh - Multi-tenant email validation before sending
# Purpose: Prevent bounce errors by validating email syntax and checking domain MX records
# Usage: ./validate-email.sh <email1> <email2> ...
#
# @business-context WSJF-1: Email validation critically due at least 10d before arbitration
# @planned-change R001: Strict duplicate blocking to pass arbitration evidence routing
# @adr ADR-001: Integrated 10d before arbitration timeline constraints
#
# T2: Thread awareness (In-Reply-To, References) — stable. SHA256 duplicate path hardened.
# Bounce detection emits to 06-EMAILS/.meta/validation-bounce-route.jsonl for routing escalation.
#
# Duplicate backend: default = ./_SYSTEM/_AUTOMATION/email-hash-db.sh (log file + flock).
# Optional: EMAIL_HASH_USE_BHOPTI_TSV=1 + LEGAL_ROOT → source LEGAL/_SYSTEM/_AUTOMATION/email-hash-db.sh (TSV).
# @business-context WSJF-1: Arbitration window enforced via check_arbitration_window_or_exit
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=validation-core.sh
[ -f "$_PROJECT_ROOT/scripts/validation-core.sh" ] && source "$_PROJECT_ROOT/scripts/validation-core.sh"

# Hash DB: default = agentic-flow log-backed module; optional BHOPTI TSV DB (same semantics as post-send-hook).
_USE_BHOPTI_HASH_DB=0
if [[ "${EMAIL_HASH_USE_BHOPTI_TSV:-0}" == "1" ]] && [[ -n "${LEGAL_ROOT:-}" && -f "${LEGAL_ROOT}/_SYSTEM/_AUTOMATION/email-hash-db.sh" ]]; then
    _USE_BHOPTI_HASH_DB=1
    # shellcheck source=/dev/null
    source "${LEGAL_ROOT}/_SYSTEM/_AUTOMATION/email-hash-db.sh"
elif [[ -f "$SCRIPT_DIR/email-hash-db.sh" ]]; then
    # shellcheck source=email-hash-db.sh
    source "$SCRIPT_DIR/email-hash-db.sh"
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Validation results
VALID_EMAILS=()
INVALID_EMAILS=()
WARNING_EMAILS=()

# Fail closed if within MIN_DAYS_BEFORE_ARBITRATION of ARBITRATION_DATE (override with SKIP_ARBITRATION_WINDOW=1 for CI)
check_arbitration_window_or_exit() {
  [[ "${SKIP_ARBITRATION_WINDOW:-0}" == "1" ]] && return 0
  local ref="${ARBITRATION_DATE:-2026-04-06}"
  local min_days="${MIN_DAYS_BEFORE_ARBITRATION:-10}"
  local now_sec ref_sec
  now_sec=$(date +%s)
  if date -j >/dev/null 2>&1; then
    ref_sec=$(date -j -f "%Y-%m-%d" "$ref" +%s 2>/dev/null) || return 0
  else
    ref_sec=$(date -d "$ref" +%s 2>/dev/null) || return 0
  fi
  local diff_sec=$((ref_sec - now_sec))
  local diff_days=$((diff_sec / 86400))
  if [[ "$diff_sec" -gt 0 ]] && [[ "$diff_days" -lt "$min_days" ]]; then
    echo -e "${RED}✗ Policy: within ${min_days}d before arbitration (${ref}); do not send without HITL override${NC}" >&2
    return "${EXIT_ARBITRATION_WINDOW_VIOLATION:-109}"
  fi
  return 0
}

validate_email() {
    local email_file="$1"
    local has_warning=0

    # CSQBM Governance Constraint: Trace Master Email Syntax Validation Checks
    local proj_root="$(cd "$(dirname "$(dirname "$(dirname "${BASH_SOURCE[0]}")")")" && pwd)"

    # Assume we're checking raw .eml files. If it's just an address string, proceed with basic regex
    if [ -f "$email_file" ]; then
        # 1. Thread Tracking Context Detection
        local in_reply_to
        local references
        in_reply_to=$(grep -i "^In-Reply-To:" "$email_file" | sed 's/^In-Reply-To:[[:space:]]*//I' || echo "None")
        references=$(grep -i "^References:" "$email_file" | sed 's/^References:[[:space:]]*//I' || echo "None")

        if [[ "$in_reply_to" != "None" ]] || [[ "$references" != "None" ]]; then
            echo -e "${CYAN}🧵 Thread Context Detected: ${email_file}${NC}"
            [[ "$in_reply_to" != "None" ]] && echo "  In-Reply-To: $in_reply_to"
            [[ "$references" != "None" ]] && echo "  References: $references"
        fi

        # 2. Duplicate detection — BHOPTI TSV (EMAIL_HASH_USE_BHOPTI_TSV=1) or local append-only log
        local recipient_for_hash
        recipient_for_hash=$(grep -i "^To:" "$email_file" | head -1 | sed 's/^To:[[:space:]]*//I' | grep -oE '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' | head -1 || echo "")
        if [[ "${_USE_BHOPTI_HASH_DB:-0}" == "1" ]] && declare -F check_duplicate_email >/dev/null 2>&1; then
            if check_duplicate_email "$email_file" "$recipient_for_hash"; then
                echo -e "${RED}✗ DUPLICATE DETECTED (hash DB): ${email_file}${NC}"
                INVALID_EMAILS+=("$email_file: Duplicate payload (central hash DB)")
                return "${EXIT_DUPLICATE_DETECTED:-120}"
            fi
            record_email_hash "$email_file" "${recipient_for_hash:-unknown@invalid.domain}" "validated" "pre-send validate-email.sh" || {
                echo -e "${RED}✗ Failed to record hash in DB${NC}" >&2
                return "${EX_DATABASE_LOCKED:-230}"
            }
            echo -e "${GREEN}✓ Hash registered (hash DB)${NC}"
        else
            local hash_log="${EMAIL_HASH_LOG:-$HOME/Library/Logs/agentic-email-hashes.log}"
            init_hash_db "$hash_log"
            local hash
            hash=$(compute_email_hash "$email_file") || true
            if [[ -z "$hash" ]]; then
                echo -e "${RED}✗ Could not hash file: ${email_file}${NC}"
                INVALID_EMAILS+=("$email_file: hash failed")
                return "${EX_NOINPUT:-51}"
            fi
            if check_duplicate_email "$hash" "$hash_log"; then
                echo -e "${RED}✗ DUPLICATE DETECTED (SHA256 log): ${email_file}${NC}"
                INVALID_EMAILS+=("$email_file: Duplicate payload signature")
                return "${EXIT_DUPLICATE_DETECTED:-120}"
            fi
            acquire_lock "$hash_log"
            register_hash "$hash" "$(basename "$email_file")" "$hash_log"
            release_lock
            echo -e "${GREEN}✓ SHA256 Registered: ${hash:0:8}...${NC}"
        fi

        # 3. Placeholder detection
        if grep -qE '\{\{[A-Z_]+\}\}' "$email_file"; then
            echo -e "${RED}✗ BLOCKER (Exit 111): Placeholders detected in ${email_file}${NC}"
            INVALID_EMAILS+=("$email_file: Placeholders detected ({{...}})")
            return 111
        fi

        # 4. Context-Aware Date Validation (Exit 110 fix)
        # Legal emails: allow historical dates (arbitration correspondence, case timeline)
        # Action emails: strict future-date validation (movers, appointments)
        if grep -qE '(January|February|March|April|May|June|July|August|September|October|November|December) [0-9]{1,2}, [0-9]{4}' "$email_file"; then
            local detect_date
            detect_date=$(grep -oE '(January|February|March|April|May|June|July|August|September|October|November|December) [0-9]{1,2}, [0-9]{4}' "$email_file" | head -1)
            local date_unix
            local today_unix
            if date -j >/dev/null 2>&1; then
                date_unix=$(date -j -f "%B %d, %Y" "$detect_date" "+%s" 2>/dev/null || echo 0)
            else
                date_unix=$(date -d "$detect_date" "+%s" 2>/dev/null || echo 0)
            fi
            today_unix=$(date "+%s")
            
            if [ "$date_unix" -gt 0 ] && [ "$date_unix" -lt "$today_unix" ]; then
                # Classify email type based on subject + body keywords
                local email_type="unknown"
                local subject_raw
                local body_sample
                subject_raw=$(grep -i "^Subject:" "$email_file" | sed 's/^Subject:[[:space:]]*//I' || echo "")
                body_sample=$(grep -vE '^(From|To|Subject|Date|Content-Type|MIME-Version):' "$email_file" | head -20 | tr '\n' ' ' || echo "")
                
                # Legal keywords: case, arbitration, settlement, court, attorney, 26cv, grimes
                local combined_text
                combined_text=$(echo "${subject_raw} ${body_sample}" | tr '[:upper:]' '[:lower:]')
                if echo "$combined_text" | grep -qiE '(case|26cv|arbitration|settlement|court|attorney|grimes|legal|plaintiff|defendant|complaint|motion|affidavit|declaration|hearing|filing|filed)'; then
                    email_type="legal"
                # Action keywords: move, mover, relocation, appointment, schedule, deadline
                elif echo "$combined_text" | grep -qiE '(move|mover|relocation|moving|vacate|move-out|moveout|appointment|schedule|scheduled|deadline|due by|no later than|must)'; then
                    email_type="action"
                fi
                
                case "$email_type" in
                    legal)
                        # Legal: allow historical dates with no warnings (policy)
                        echo -e "${CYAN}ℹ Historical date OK: $detect_date (legal context)${NC}"
                        ;;
                    action)
                        # Action: strict validation - future dates only
                        echo -e "${RED}✗ BLOCKER (Exit 110): Date $detect_date is in the past (action email requires future date)${NC}"
                        INVALID_EMAILS+=("$email_file: Date in past ($detect_date) - action emails require future dates")
                        return 110
                        ;;
                    unknown)
                        # Unknown type: warn but don't block (fail-open for edge cases)
                        echo -e "${YELLOW}⚠ WARNING: Date $detect_date is in the past (unable to classify email type - verify manually)${NC}"
                        WARNING_EMAILS+=("$email_file: Past date ${detect_date} (unclassified email type)")
                        has_warning=1
                        ;;
                esac
            fi
        fi


        # Extract address from file for MX checks
        local email
        email=$(grep -i "^To:" "$email_file" | sed 's/^To:[[:space:]]*//I' | grep -oE '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}') || email="unknown@invalid.domain"
    else
        local email="$email_file"
    fi

    # Basic RFC 5322 regex validation
    if ! echo "$email" | grep -qE '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'; then
        INVALID_EMAILS+=("$email: Invalid syntax")
        return 1
    fi

    # Extract domain
    local domain="${email##*@}"

    # Check MX records
    if ! dig +short MX "$domain" | grep -q '.'; then
        WARNING_EMAILS+=("$email: No MX records found (may bounce)")
        return 2
    fi

    # Known bounce patterns from rules — emit routing artifact for escalation
    case "$email" in
        charlotte@twomenandatruck.com)
            WARNING_EMAILS+=("$email: Previously bounced (550 5.4.1) - use website form instead")
            # Bounce cross-reference: write routing artifact for escalation hooks
            local legal_root="${LEGAL_ROOT:-$HOME/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL}"
            local meta_dir="$legal_root/06-EMAILS/.meta"
            if [[ -d "$legal_root" && -d "$(dirname "$meta_dir")" ]]; then
                mkdir -p "$meta_dir" 2>/dev/null || true
                local ts
                ts=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%s)
                printf '{"bounce_email":"%s","reason":"550 5.4.1 previously bounced","routing_escalation":"use_website_form","timestamp":"%s"}\n' "$email" "$ts" >> "$meta_dir/validation-bounce-route.jsonl" 2>/dev/null || true
            fi
            return 2
            ;;
    esac

    VALID_EMAILS+=("$email")
    if [[ "$has_warning" -eq 1 ]]; then
        return "${EX_SUCCESS_WARNING:-2}"
    fi
    return "${EX_SUCCESS:-0}"
}

# Main
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    if [ $# -eq 0 ]; then
        echo "Usage: $0 <email1> <email2> ..."
        exit "${EX_USAGE:-10}"
    fi

    if ! check_arbitration_window_or_exit; then
        exit "${EXIT_ARBITRATION_WINDOW_VIOLATION:-109}"
    fi

    echo "🔍 Validating ${#@} email addresses..."
    echo

    global_exit=${EX_SUCCESS:-0}

    for email in "$@"; do
        if [ ! -f "$email" ] && [[ "$email" == *.eml ]]; then
            echo -e "${RED}✗ ERROR: File not found: $email${NC}"
            INVALID_EMAILS+=("$email: File not found")
            global_exit=${EX_NOFILE:-11}
            continue
        fi

        validate_email "$email"
        ret=$?
        if [ $ret -ne 0 ] && [ $ret -ne 2 ]; then
            global_exit=$ret
        elif [ $ret -eq 2 ] && [ "$global_exit" -eq 0 ]; then
            global_exit=${EX_SUCCESS_WARNING:-2}
        fi
    done

    # Report
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${GREEN}✓ VALID (${#VALID_EMAILS[@]}):${NC}"
    for email in "${VALID_EMAILS[@]}"; do
        echo "  ✓ $email"
    done

    if [ ${#WARNING_EMAILS[@]} -gt 0 ]; then
        echo
        echo -e "${YELLOW}⚠ WARNINGS (${#WARNING_EMAILS[@]}):${NC}"
        for msg in "${WARNING_EMAILS[@]}"; do
            echo "  ⚠ $msg"
        done
    fi

    if [ ${#INVALID_EMAILS[@]} -gt 0 ]; then
        echo
        echo -e "${RED}✗ INVALID (${#INVALID_EMAILS[@]}):${NC}"
        for msg in "${INVALID_EMAILS[@]}"; do
            echo "  ✗ $msg"
        done
    fi

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Exit code prioritization
    if [ ${#INVALID_EMAILS[@]} -gt 0 ]; then
        if [ "$global_exit" -eq 0 ] || [ "$global_exit" -eq 2 ]; then
            exit "${EX_VALIDATION_FAILED:-150}"
        fi
        exit "$global_exit"
    elif [ ${#WARNING_EMAILS[@]} -gt 0 ]; then
        exit "${EX_SUCCESS_WARNING:-2}"
    else
        exit "${EX_SUCCESS:-0}"
    fi
fi
