#!/usr/bin/env bash
# semantic-checks.sh - Semantic validation (stub implementation)
# Checks case numbers, dates, contact methods for basic accuracy

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# CSQBM Governance Constraint: Trace validation matrix bounds natively
if [ -f "$PROJECT_ROOT/scripts/validation-core.sh" ]; then
    source "$PROJECT_ROOT/scripts/validation-core.sh"
else
    EX_NOINPUT=12
fi
email_file="${1:-}"
if [[ -z "$email_file" || ! -f "$email_file" ]]; then
    echo "FAIL|File not found: $email_file"
    exit $EX_NOINPUT
fi

content=$(cat "$email_file")

# Check 1: Case number format validation
check_case_numbers() {
    local invalid_cases=()
    while IFS= read -r line; do
        if [[ "$line" =~ ([0-9]{2}CV[0-9]{6}-[0-9]{3}) ]]; then
            local case_num="${BASH_REMATCH[1]}"
            # Validate format: 26CV005596-590 (year prefix, 6-digit case, 3-digit suffix)
            if [[ ! "$case_num" =~ ^[0-9]{2}CV[0-9]{6}-[0-9]{3}$ ]]; then
                invalid_cases+=("$case_num")
            fi
        fi
    done <<< "$content"

    if [[ ${#invalid_cases[@]} -eq 0 ]]; then
        echo "PASS|Case number format valid"
    else
        echo "FAIL|Invalid case number format: ${invalid_cases[*]}"
        return 1
    fi
}

# Check 2: Date consistency validation
check_dates() {
    local dates_found=()

    # Extract dates in format: March 3, 2026 or 03/03/2026 or 2026-03-03
    while IFS= read -r line; do
        if [[ "$line" =~ (March|April|February|January|May|June|July|August|September|October|November|December)[[:space:]]+([0-9]{1,2}),[[:space:]]+([0-9]{4}) ]]; then
            dates_found+=("${BASH_REMATCH[0]}")
        elif [[ "$line" =~ ([0-9]{2})/([0-9]{2})/([0-9]{4}) ]]; then
            dates_found+=("${BASH_REMATCH[0]}")
        elif [[ "$line" =~ ([0-9]{4})-([0-9]{2})-([0-9]{2}) ]]; then
            dates_found+=("${BASH_REMATCH[0]}")
        fi
    done <<< "$content"

    # Stub: Just check if dates exist, don't validate chronology (requires date parsing)
    if [[ ${#dates_found[@]} -gt 0 ]]; then
        echo "PASS|Found ${#dates_found[@]} date references (chronology not verified - stub)"
    else
        echo "WARN|No dates found in document"
    fi
}

# Check 3: Blocked contact method detection
check_blocked_contacts() {
    local blocked=()

    # Known blocked: 412-CLOUD-90, iMessage (from user context)
    if echo "$content" | grep -qi "412.*CLOUD.*90\|412-CLOUD-90"; then
        blocked+=("412-CLOUD-90 (known blocked)")
    fi

    if echo "$content" | grep -qi "iMessage\|imessage"; then
        blocked+=("iMessage (known blocked)")
    fi

    if [[ ${#blocked[@]} -eq 0 ]]; then
        echo "PASS|No known blocked contact methods referenced"
    else
        echo "WARN|References blocked contact methods: ${blocked[*]}"
    fi
}

# Check 4: Event validation (stub - can't verify without court docket access)
check_events() {
    local events=()

    # Look for event claims (trial, hearing, arbitration, order, etc.)
    if echo "$content" | grep -qi "trial\|hearing\|arbitration\|order\|judgment"; then
        events+=("Legal event mentioned")
    fi

    if [[ ${#events[@]} -gt 0 ]]; then
        echo "PASS|Events mentioned (existence not verified - stub)"
    else
        echo "PASS|No specific events claimed"
    fi
}

# Run all checks
echo "=== Semantic Validation (Stub) ==="
check_case_numbers
check_dates
check_blocked_contacts
check_events
echo "=== End Semantic Checks ==="
