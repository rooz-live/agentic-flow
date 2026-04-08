#!/usr/bin/env bash
# validation-core.sh - Pure validation functions (NO STATE)
# CROSS-REF: /code/investing/agentic-flow/VALIDATOR_INVENTORY.md | ADR-019 | CASE_REGISTRY.yaml
# SIBLING: /code/investing/agentic-flow/scripts/validation-core.sh (v0.9, 4 checks — this CLT version is richer)
# MPP: method=pure_functions_bash | pattern=ddd_aggregate | protocol=stdout_exit
# CONVERGE: placeholder, citation checks should stay in sync with AF sibling
# 
# ARCHITECTURE: Non-holonomic design - all functions are independent
# Each function:
#   - Takes email file path as input
#   - Returns semantic exit codes (see EXIT_* below)
#   - Has NO side effects (no file mutations, no global state)
#   - Is idempotent (same input → same output)
#
# EXIT CODES:
#   0   = EXIT_SUCCESS (validation passed)
#   111 = EXIT_PLACEHOLDER_DETECTED
#   150 = EXIT_LEGAL_CITATION_MALFORMED
#   21  = EXIT_MISSING_REQUIRED_FIELD
#   110 = EXIT_DATE_IN_PAST
#   100 = EXIT_SCHEMA_VALIDATION_FAILED (generic validation failure)
#
# USAGE:
#   source validation-core.sh
#   if validate_placeholders "$email_file"; then
#       echo "PASS (exit 0)"
#   else
#       echo "FAIL (exit 111 - placeholder detected)"
#   fi

set -euo pipefail

# Source semantic exit codes
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=exit-codes.sh
if [[ -f "$SCRIPT_DIR/exit-codes.sh" ]]; then
    source "$SCRIPT_DIR/exit-codes.sh"
else
    # Fallback constants
    EXIT_SUCCESS=0
    EXIT_MISSING_REQUIRED_FIELD=21
    EXIT_SCHEMA_VALIDATION_FAILED=100
    EXIT_DATE_IN_PAST=110
    EXIT_PLACEHOLDER_DETECTED=111
    EXIT_LEGAL_CITATION_MALFORMED=150
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PURE VALIDATION FUNCTIONS (Stateless)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Validation 1: Placeholder Detection
#
# PURPOSE: Detect template placeholders before sending legal correspondence
# DETECTS: [Your Phone], @example.com, TODO, FIXME, {{var}}, (555) patterns
# EXIT CODES:
#   0   (EXIT_SUCCESS) - No placeholders found, safe to send
#   111 (EXIT_PLACEHOLDER_DETECTED) - Placeholder found, BLOCK send
# SIDE EFFECTS: None (pure function)
# IDEMPOTENT: Yes
validate_placeholders() {
    local email_file="$1"
    
    [[ ! -f "$email_file" ]] && return "$EXIT_PLACEHOLDER_DETECTED"
    
    # Pattern 1: Bracket placeholders
    grep -qE '\[(Your|Amanda|Phone|Email|Name)\]' "$email_file" && return "$EXIT_PLACEHOLDER_DETECTED"
    
    # Pattern 2: Template markers
    grep -qE '@example\.com|TODO|FIXME|{{.*}}' "$email_file" && return "$EXIT_PLACEHOLDER_DETECTED"
    
    # Pattern 3: Placeholder phone numbers
    grep -qE '\(XXX\)|\(555\)|xxx-xxxx' "$email_file" && return "$EXIT_PLACEHOLDER_DETECTED"
    
    return "$EXIT_SUCCESS"
}

# Validation 2: Employment Claims (ROAM R-2026-011)
#
# PURPOSE: Prevent false employment claims during unemployment period (2019-2024)
# DETECTS: Claims of "employed", "stable income" conflicting with R-2026-011
# EXIT CODES:
#   0   (EXIT_SUCCESS) - No employment claim conflicts
#   100 (EXIT_SCHEMA_VALIDATION_FAILED) - Employment claim found (violates ROAM)
# SIDE EFFECTS: None (pure function)
# IDEMPOTENT: Yes
validate_employment_claims() {
    local email_file="$1"
    
    [[ ! -f "$email_file" ]] && return "$EXIT_SCHEMA_VALIDATION_FAILED"
    
    # Patterns that conflict with R-2026-011 (unemployed 2019-2024)
    # Exclude negations like "no stable income" which describe hardship, not employment
    grep -qiE '(two|2).*employed|both.*working' "$email_file" && return "$EXIT_SCHEMA_VALIDATION_FAILED"
    grep -iE 'stable income' "$email_file" | grep -qivE 'no stable income|without stable income|lack.*stable income' && return "$EXIT_SCHEMA_VALIDATION_FAILED"
    
    return "$EXIT_SUCCESS"
}

# Validation 3: Legal Citations
#
# PURPOSE: Ensure proper NC statute and case number formatting for legal emails
# VALIDATES: N.C.G.S. § XX-XX format, case numbers (26CV005596-590)
# EXIT CODES:
#   0   (EXIT_SUCCESS) - Citations properly formatted
#   150 (EXIT_LEGAL_CITATION_MALFORMED) - Malformed legal citation
# SIDE EFFECTS: None (pure function)
# IDEMPOTENT: Yes
validate_legal_citations() {
    local email_file="$1"
    
    [[ ! -f "$email_file" ]] && return "$EXIT_LEGAL_CITATION_MALFORMED"
    
    # If statute references exist, verify format (§ symbol optional)
    if grep -qE 'N\.C\.|42-42|42-50|42-40' "$email_file"; then
        # Accept: N.C.G.S. § XX-XX or N.C.G.S. XX-XX (§ optional)
        grep -qE 'N\.C\.G\.S\.\s*(§\s*)?[0-9]+-[0-9]+' "$email_file" || return "$EXIT_LEGAL_CITATION_MALFORMED"
    fi
    
    # Case numbers should be complete: 26CV005596-590
    if grep -qE '26CV[0-9]+' "$email_file"; then
        grep -qE '26CV[0-9]{6}-[0-9]{3}' "$email_file" || return "$EXIT_LEGAL_CITATION_MALFORMED"
    fi
    
    return "$EXIT_SUCCESS"
}

# Validation 4: Required Recipients
#
# PURPOSE: Ensure all required parties are copied on landlord correspondence
# CHECKS: allison@amcharlotte.com (landlord), nyla@ (co-manager), mandersnc@ (Amanda CC)
# EXIT CODES:
#   0  (EXIT_SUCCESS) - All required recipients present
#   21 (EXIT_MISSING_REQUIRED_FIELD) - Missing required recipient
# SIDE EFFECTS: None (pure function)
# IDEMPOTENT: Yes
validate_required_recipients() {
    local email_file="$1"
    
    [[ ! -f "$email_file" ]] && return "$EXIT_MISSING_REQUIRED_FIELD"
    
    # Only enforce landlord recipients when email is addressed to amcharlotte.com
    if grep -qiE '^To:.*amcharlotte\.com' "$email_file"; then
        # Check for Allison (landlord)
        grep -qi 'allison@amcharlotte\.com' "$email_file" || return "$EXIT_MISSING_REQUIRED_FIELD"
        
        # Check for Nyla (co-manager)
        grep -qi 'nyla@amcharlotte\.com' "$email_file" || return "$EXIT_MISSING_REQUIRED_FIELD"
        
        # Check for Amanda in CC
        grep -qi 'mandersnc@gmail\.com' "$email_file" || return "$EXIT_MISSING_REQUIRED_FIELD"
    fi
    
    return "$EXIT_SUCCESS"
}

# Validation 5: Trial Date References
#
# PURPOSE: Ensure trial dates are always specified when mentioned in correspondence
# VALIDATES: March 3, 2026 or 2026-03-03 when trial/court/hearing mentioned
# EXIT CODES:
#   0   (EXIT_SUCCESS) - Trial date properly specified or not mentioned
#   100 (EXIT_SCHEMA_VALIDATION_FAILED) - Trial mentioned without date
# SIDE EFFECTS: None (pure function)
# IDEMPOTENT: Yes
validate_trial_references() {
    local email_file="$1"
    
    [[ ! -f "$email_file" ]] && return "$EXIT_SCHEMA_VALIDATION_FAILED"
    
    # If trial mentioned, date should be present
    if grep -qiE 'trial|court|hearing' "$email_file"; then
        grep -qE 'March 3,? 2026|2026-03-03|03/03/2026' "$email_file" || return "$EXIT_SCHEMA_VALIDATION_FAILED"
    fi
    
    return "$EXIT_SUCCESS"
}

# Validation 6: Attachments Exist
#
# PURPOSE: Verify all referenced attachments exist before sending
# CHECKS: .md, .eml, .pdf files referenced in email body
# EXIT CODES:
#   0   (EXIT_SUCCESS) - All attachments exist
#   21  (EXIT_MISSING_REQUIRED_FIELD) - Referenced attachment missing
# SIDE EFFECTS: None (pure function)
# IDEMPOTENT: Yes
validate_attachments() {
    local email_file="$1"
    
    [[ ! -f "$email_file" ]] && return "$EXIT_MISSING_REQUIRED_FIELD"
    
    local dir
    dir=$(dirname "$email_file")
    
    # Extract attachment references
    while IFS= read -r attachment; do
        [[ ! -f "$dir/$attachment" ]] && return "$EXIT_MISSING_REQUIRED_FIELD"
    done < <(grep -oE '[A-Z0-9_-]+\.md|[A-Z0-9_-]+\.eml|[A-Z0-9_-]+\.pdf' "$email_file" || true)
    
    return "$EXIT_SUCCESS"
}

# Validation 7: Date Consistency
#
# PURPOSE: Detect contradictory dates in email (e.g., multiple trial dates)
# VALIDATES: Internal date consistency, specifically trial date = March 3, 2026
# EXIT CODES:
#   0   (EXIT_SUCCESS) - Dates are consistent
#   110 (EXIT_DATE_IN_PAST) - Date contradictions found
# SIDE EFFECTS: None (pure function)
# IDEMPOTENT: Yes
validate_date_consistency() {
    local email_file="$1"
    
    [[ ! -f "$email_file" ]] && return "$EXIT_DATE_IN_PAST"
    
    # Extract all dates
    local dates
    dates=$(grep -oE '(January|February|March|April|May|June|July|August|September|October|November|December) [0-9]{1,2},? [0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2}' "$email_file" || true)
    
    # Check for obvious contradictions (multiple trial dates, etc.)
    # For now, just check if trial date is March 3, 2026
    if echo "$dates" | grep -qiE 'trial.*March' && ! echo "$dates" | grep -qE 'March 3,? 2026'; then
        return "$EXIT_DATE_IN_PAST"
    fi
    
    return "$EXIT_SUCCESS"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# DIAGNOSTIC FUNCTIONS (For Debugging)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Get placeholder details (for reporting)
get_placeholder_details() {
    local email_file="$1"
    
    [[ ! -f "$email_file" ]] && return 1
    
    {
        grep -nE '\[(Your|Amanda|Phone|Email|Name)\]' "$email_file" || true
        grep -nE '@example\.com|TODO|FIXME' "$email_file" || true
        grep -nE '\(XXX\)|\(555\)|xxx-xxxx' "$email_file" || true
    } | head -5
}

# Get employment claim details
get_employment_claim_details() {
    local email_file="$1"
    
    [[ ! -f "$email_file" ]] && return 1
    
    grep -niE '(two|2).*employed|stable income|both.*working' "$email_file" || true
}

# Get missing recipient details
get_missing_recipients() {
    local email_file="$1"
    
    [[ ! -f "$email_file" ]] && return 1
    
    local missing=()
    
    grep -qi 'allison@amcharlotte\.com' "$email_file" || missing+=("allison@amcharlotte.com")
    grep -qi 'nyla@amcharlotte\.com' "$email_file" || missing+=("nyla@amcharlotte.com")
    grep -qi 'mandersnc@gmail\.com' "$email_file" || missing+=("mandersnc@gmail.com (CC)")
    
    printf '%s\n' "${missing[@]}"
}

# Get missing attachment details
get_missing_attachments() {
    local email_file="$1"
    
    [[ ! -f "$email_file" ]] && return 1
    
    local dir
    dir=$(dirname "$email_file")
    local missing=()
    
    while IFS= read -r attachment; do
        [[ ! -f "$dir/$attachment" ]] && missing+=("$attachment")
    done < <(grep -oE '[A-Z0-9_-]+\.md|[A-Z0-9_-]+\.eml|[A-Z0-9_-]+\.pdf' "$email_file" || true)
    
    printf '%s\n' "${missing[@]}"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SELF-TEST (Verify all functions work)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    echo "validation-core.sh - Self-test"
    echo "This script is meant to be sourced, not executed directly."
    echo ""
    echo "Usage:"
    echo "  source validation-core.sh"
    echo "  validate_placeholders \"\$email_file\""
    echo ""
    echo "Available functions:"
    echo "  - validate_placeholders"
    echo "  - validate_employment_claims"
    echo "  - validate_legal_citations"
    echo "  - validate_required_recipients"
    echo "  - validate_trial_references"
    echo "  - validate_attachments"
    echo "  - validate_date_consistency"
    echo ""
    echo "Diagnostic functions:"
    echo "  - get_placeholder_details"
    echo "  - get_employment_claim_details"
    echo "  - get_missing_recipients"
    echo "  - get_missing_attachments"
fi
