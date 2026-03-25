#!/usr/bin/env bash
# validation-runner.sh - Orchestration layer (WITH STATE)
# CROSS-REF: /code/investing/agentic-flow/VALIDATOR_INVENTORY.md | ADR-019 | CASE_REGISTRY.yaml
# SIBLING: /code/investing/agentic-flow/scripts/validators/file/validation-runner.sh (sources AF core)
# MPP: method=orchestration | pattern=ddd_aggregate | protocol=stdout_jsonl
# BRIDGE: 00-DASHBOARD/email-server.js runValidationRunner() calls this via /validate-full
#
# ARCHITECTURE: Separates concerns
#   - validation-core.sh: Pure functions (no state)
#   - validation-runner.sh: Orchestration (state, logging, auto-fix)
#
# This script:
#   - Sources validation-core.sh
#   - Manages state (logs, history, regression DB)
#   - Handles auto-fix mutations
#   - Provides CLI interface
#   - Generates reports

set -euo pipefail

VERSION="2.0.0-PHASE-1-CONSOLIDATION"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source dependencies
# shellcheck source=exit-codes.sh
source "$SCRIPT_DIR/exit-codes.sh" 2>/dev/null || {
    echo "ERROR: exit-codes.sh not found" >&2
    exit 11  # EXIT_FILE_NOT_FOUND fallback
}

# shellcheck source=email-hash-db.sh
source "$SCRIPT_DIR/email-hash-db.sh" 2>/dev/null || {
    echo "WARNING: email-hash-db.sh not found (duplicate detection disabled)" >&2
}

# shellcheck source=validation-core.sh
source "$SCRIPT_DIR/validation-core.sh"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FEATURE FLAGS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export FEATURE_PLACEHOLDER_CHECK="${FEATURE_PLACEHOLDER_CHECK:-true}"
export FEATURE_EMPLOYMENT_CHECK="${FEATURE_EMPLOYMENT_CHECK:-true}"
export FEATURE_LEGAL_CITATION_CHECK="${FEATURE_LEGAL_CITATION_CHECK:-true}"
export FEATURE_RECIPIENT_CHECK="${FEATURE_RECIPIENT_CHECK:-true}"
export FEATURE_TRIAL_REFERENCE_CHECK="${FEATURE_TRIAL_REFERENCE_CHECK:-true}"
export FEATURE_ATTACHMENT_CHECK="${FEATURE_ATTACHMENT_CHECK:-true}"
export FEATURE_DATE_CONSISTENCY_CHECK="${FEATURE_DATE_CONSISTENCY_CHECK:-true}"
export FEATURE_PAST_DATE_CHECK="${FEATURE_PAST_DATE_CHECK:-true}"
export FEATURE_DUPLICATE_DETECTION="${FEATURE_DUPLICATE_DETECTION:-true}"
export FEATURE_REGRESSION_CHECK="${FEATURE_REGRESSION_CHECK:-true}"
export FEATURE_AUTO_FIX="${FEATURE_AUTO_FIX:-false}"  # Disabled by default

# Validation thresholds
export MIN_PASSING_SCORE="${MIN_PASSING_SCORE:-95}"
export MAX_FAILURES_ALLOWED="${MAX_FAILURES_ALLOWED:-0}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STATE MANAGEMENT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STATE_DIR="$BASE_DIR/_SYSTEM/_AUTOMATION/.validation-state"
mkdir -p "$STATE_DIR"

STATE_FILE="$STATE_DIR/validation-history.jsonl"
REGRESSION_DB="$STATE_DIR/regression-baseline.json"
CURRENT_RUN_FILE="$STATE_DIR/current-run.json"

initialize_state() {
    if [[ ! -f "$STATE_FILE" ]]; then
        echo "{\"initialized\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"total_runs\": 0}" > "$STATE_FILE"
    fi
    
    if [[ ! -f "$REGRESSION_DB" ]]; then
        echo "{\"baseline\": {}, \"last_run\": null}" > "$REGRESSION_DB"
    fi
    
    # Initialize current run
    cat > "$CURRENT_RUN_FILE" << EOF
{
  "run_id": "$(date +%Y%m%d-%H%M%S)",
  "email": null,
  "checks": [],
  "passed": 0,
  "failed": 0,
  "warnings": 0
}
EOF
}

log_check_result() {
    local check_name="$1"
    local result="$2"  # pass/fail/warning
    local details="${3:-}"
    
    local timestamp
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    # Append to history
    local entry
    entry=$(cat <<EOF
{"timestamp": "$timestamp", "check": "$check_name", "result": "$result", "details": "$details"}
EOF
)
    echo "$entry" >> "$STATE_FILE"
    
    # Update current run
    local temp_file
    temp_file=$(mktemp)
    jq --arg check "$check_name" --arg result "$result" --arg details "$details" \
        '.checks += [{"check": $check, "result": $result, "details": $details}]' \
        "$CURRENT_RUN_FILE" > "$temp_file"
    mv "$temp_file" "$CURRENT_RUN_FILE"
}

update_regression_baseline() {
    local passed="$1"
    local failed="$2"
    
    local temp_file
    temp_file=$(mktemp)
    jq --arg passed "$passed" --arg failed "$failed" --arg date "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        '.baseline = {"passed": ($passed|tonumber), "failed": ($failed|tonumber), "date": $date}' \
        "$REGRESSION_DB" > "$temp_file"
    mv "$temp_file" "$REGRESSION_DB"
}

check_regression() {
    local current_failed="$1"
    
    if [[ ! -f "$REGRESSION_DB" ]]; then
        return 0  # No baseline, skip check
    fi
    
    local baseline_failed
    baseline_failed=$(jq -r '.baseline.failed // 0' "$REGRESSION_DB" 2>/dev/null || echo 0)
    
    if [[ $current_failed -gt $baseline_failed ]]; then
        return 1  # Regression detected
    fi
    
    return 0
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AUTO-FIX FUNCTIONS (State Mutations)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

auto_fix_placeholders() {
    local email_file="$1"
    
    echo -e "${YELLOW}→ AUTO-FIX: Replacing placeholders${NC}"
    
    # Backup original
    cp "$email_file" "$email_file.bak"
    
    # Fix placeholders
    sed -i '' 's/\[Your Phone\]/(*************/g' "$email_file" 2>/dev/null || \
    sed -i 's/\[Your Phone\]/(*************/g' "$email_file"
    
    sed -i '' "s/\[Amanda's Phone\]/(*************/g" "$email_file" 2>/dev/null || \
    sed -i "s/\[Amanda's Phone\]/(*************/g" "$email_file"
    
    sed -i '' 's/shahrooz@example\.com/shahrooz@bhopti.com/g' "$email_file" 2>/dev/null || \
    sed -i 's/shahrooz@example\.com/shahrooz@bhopti.com/g' "$email_file"
    
    echo -e "  ${GREEN}✓ Placeholders fixed (backup: $email_file.bak)${NC}"
}

auto_fix_employment_claims() {
    local email_file="$1"
    
    echo -e "${YELLOW}→ AUTO-FIX: Correcting employment claims${NC}"
    
    # Backup original
    cp "$email_file" "$email_file.bak"
    
    # Fix employment claims
    sed -i '' 's/Two employed, responsible tenants with stable income/Two responsible tenants with strong rental history and verified financial capacity/g' "$email_file" 2>/dev/null || \
    sed -i 's/Two employed, responsible tenants with stable income/Two responsible tenants with strong rental history and verified financial capacity/g' "$email_file"
    
    echo -e "  ${GREEN}✓ Employment claims corrected (backup: $email_file.bak)${NC}"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# VALIDATION ORCHESTRATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

run_validation_pipeline() {
    local email_file="$1"

    # Resolve to absolute path before any file checks (fixes relative-path failures
    # when called from LaunchAgent or a different working directory)
    email_file="$(realpath "$email_file" 2>/dev/null || echo "$email_file")"

    if [[ ! -f "$email_file" ]]; then
        echo -e "${RED}✗ ERROR: Email file not found: $email_file${NC}"
        exit 1
    fi
    
    echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${BLUE}  VALIDATION RUNNER v${VERSION}${NC}"
    echo -e "${BOLD}${BLUE}  File: $(basename "$email_file")${NC}"
    echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo ""
    
    initialize_state
    
    local total_checks=0
    local passed_checks=0
    local failed_checks=0
    local warnings=0
    
    # Check 1: Placeholders
    if [[ "$FEATURE_PLACEHOLDER_CHECK" == "true" ]]; then
        ((++total_checks))
        echo -e "${CYAN}→ CHECK 1: Placeholder Detection${NC}"
        
        if validate_placeholders "$email_file"; then
            echo -e "  ${GREEN}✓ PASS: No placeholders detected${NC}"
            ((++passed_checks))
            log_check_result "placeholder_detection" "pass"
        else
            echo -e "  ${RED}✗ FAIL: Placeholders found${NC}"
            get_placeholder_details "$email_file" | sed 's/^/    /'
            ((++failed_checks))
            log_check_result "placeholder_detection" "fail" "Placeholders found"
            
            if [[ "$FEATURE_AUTO_FIX" == "true" ]]; then
                auto_fix_placeholders "$email_file"
            fi
        fi
    fi
    
    # Check 2: Employment Claims
    if [[ "$FEATURE_EMPLOYMENT_CHECK" == "true" ]]; then
        ((++total_checks))
        echo -e "${CYAN}→ CHECK 2: Employment Claims (ROAM R-2026-011)${NC}"
        
        if validate_employment_claims "$email_file"; then
            echo -e "  ${GREEN}✓ PASS: No conflicting employment claims${NC}"
            ((++passed_checks))
            log_check_result "employment_claims" "pass"
        else
            echo -e "  ${RED}✗ FAIL: Employment claim conflicts with R-2026-011${NC}"
            get_employment_claim_details "$email_file" | sed 's/^/    /'
            ((++failed_checks))
            log_check_result "employment_claims" "fail" "Conflicts with R-2026-011"
            
            if [[ "$FEATURE_AUTO_FIX" == "true" ]]; then
                auto_fix_employment_claims "$email_file"
            fi
        fi
    fi
    
    # Check 3: Legal Citations
    if [[ "$FEATURE_LEGAL_CITATION_CHECK" == "true" ]]; then
        ((++total_checks))
        echo -e "${CYAN}→ CHECK 3: Legal Citation Format${NC}"
        
        if validate_legal_citations "$email_file"; then
            echo -e "  ${GREEN}✓ PASS: Legal citations properly formatted${NC}"
            ((++passed_checks))
            log_check_result "legal_citations" "pass"
        else
            echo -e "  ${RED}✗ FAIL: Improper citation format${NC}"
            ((++failed_checks))
            log_check_result "legal_citations" "fail" "Malformed citations"
        fi
    fi
    
    # Check 4: Required Recipients
    if [[ "$FEATURE_RECIPIENT_CHECK" == "true" ]]; then
        ((++total_checks))
        echo -e "${CYAN}→ CHECK 4: Required Recipients${NC}"
        
        if validate_required_recipients "$email_file"; then
            echo -e "  ${GREEN}✓ PASS: All required recipients present${NC}"
            ((++passed_checks))
            log_check_result "required_recipients" "pass"
        else
            echo -e "  ${RED}✗ FAIL: Missing recipients${NC}"
            get_missing_recipients "$email_file" | sed 's/^/    - /'
            ((++failed_checks))
            log_check_result "required_recipients" "fail" "Missing recipients"
        fi
    fi
    
    # Check 5: Trial References
    if [[ "$FEATURE_TRIAL_REFERENCE_CHECK" == "true" ]]; then
        ((++total_checks))
        echo -e "${CYAN}→ CHECK 5: Trial Date References${NC}"
        
        if validate_trial_references "$email_file"; then
            echo -e "  ${GREEN}✓ PASS: Trial references validated${NC}"
            ((++passed_checks))
            log_check_result "trial_references" "pass"
        else
            echo -e "  ${YELLOW}⚠ WARNING: Trial mentioned without date${NC}"
            ((++warnings))
            log_check_result "trial_references" "warning" "Trial mentioned without date"
        fi
    fi
    
    # Check 6: Attachments
    if [[ "$FEATURE_ATTACHMENT_CHECK" == "true" ]]; then
        ((++total_checks))
        echo -e "${CYAN}→ CHECK 6: Attachment Verification${NC}"
        
        if validate_attachments "$email_file"; then
            echo -e "  ${GREEN}✓ PASS: All referenced attachments exist${NC}"
            ((++passed_checks))
            log_check_result "attachments" "pass"
        else
            echo -e "  ${RED}✗ FAIL: Missing attachments${NC}"
            get_missing_attachments "$email_file" | sed 's/^/    - /'
            ((++failed_checks))
            log_check_result "attachments" "fail" "Missing attachments"
        fi
    fi
    
    # Check 7: Date Consistency
    if [[ "$FEATURE_DATE_CONSISTENCY_CHECK" == "true" ]]; then
        ((++total_checks))
        echo -e "${CYAN}→ CHECK 7: Date Consistency${NC}"
        
        if validate_date_consistency "$email_file"; then
            echo -e "  ${GREEN}✓ PASS: Dates are consistent${NC}"
            ((++passed_checks))
            log_check_result "date_consistency" "pass"
        else
            echo -e "  ${RED}✗ FAIL: Date contradictions found${NC}"
            ((++failed_checks))
            log_check_result "date_consistency" "fail" "Date contradictions"
        fi
    fi
    
    # Check 8: Past Date Detection (NEW)
    if [[ "$FEATURE_PAST_DATE_CHECK" == "true" ]]; then
        ((++total_checks))
        echo -e "${CYAN}→ CHECK 8: Past Date Detection${NC}"
        
        # Extract dates and check if any are in the past
        local current_date
        current_date=$(date +%Y-%m-%d)
        
        # Find ISO dates, filter out historical context, check for past dates
        local past_dates
        past_dates=$(grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' "$email_file" 2>/dev/null | {
            local found_past=""
            while IFS= read -r date; do
                # Skip historical unemployment period (2019-2020)
                if [[ "$date" =~ ^2019- ]] || [[ "$date" =~ ^2020- ]]; then
                    continue
                fi
                # Check if date is in the past
                if [[ "$date" < "$current_date" ]]; then
                    found_past="${found_past}${date}\n"
                fi
            done
            echo -n "$found_past"
        } || echo "")
        
        if [[ -z "$past_dates" ]]; then
            echo -e "  ${GREEN}✓ PASS: No problematic past dates${NC}"
            ((++passed_checks))
            log_check_result "past_date_detection" "pass"
        else
            echo -e "  ${RED}✗ FAIL: Past dates detected (non-historical context)${NC}"
            echo -e "$past_dates" | sed '/^$/d' | sed 's/^/    - /'
            ((++failed_checks))
            log_check_result "past_date_detection" "fail" "Past dates found"
        fi
    fi
    
    # Check 9: Duplicate Detection (NEW)
    if [[ "$FEATURE_DUPLICATE_DETECTION" == "true" ]] && command -v check_duplicate_email &>/dev/null; then
        ((++total_checks))
        echo -e "${CYAN}→ CHECK 9: Duplicate Detection${NC}"
        
        # Extract primary recipient
        local recipient
        recipient=$(grep -i '^To:' "$email_file" | sed 's/^To: *//i' | awk '{print $1}' | tr -d '<>' | head -1)
        
        if check_duplicate_email "$email_file" "$recipient" 2>/dev/null; then
            # Duplicate found (check_duplicate returns 0 if duplicate)
            echo -e "  ${RED}✗ FAIL: DUPLICATE EMAIL DETECTED${NC}"
            echo -e "  ${RED}   This email content has already been sent${NC}"
            ((++failed_checks))
            log_check_result "duplicate_detection" "fail" "Duplicate hash found"
        else
            # Unique email
            echo -e "  ${GREEN}✓ PASS: Unique email (not a duplicate)${NC}"
            ((++passed_checks))
            log_check_result "duplicate_detection" "pass"
        fi
    fi
    
    # Check 10: Regression (runs AFTER all other checks)
    if [[ "$FEATURE_REGRESSION_CHECK" == "true" ]]; then
        ((++total_checks))
        echo -e "${CYAN}→ CHECK 10: Regression Detection${NC}"
        
        if check_regression "$failed_checks"; then
            echo -e "  ${GREEN}✓ PASS: No regression detected${NC}"
            ((++passed_checks))
            log_check_result "regression" "pass"
        else
            echo -e "  ${RED}✗ FAIL: Regression detected${NC}"
            ((++failed_checks))
            log_check_result "regression" "fail" "More failures than baseline"
        fi
        
        # Update baseline for next run
        update_regression_baseline "$passed_checks" "$failed_checks"
    fi
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # FINAL SUMMARY
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    echo ""
    echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}  VALIDATION SUMMARY${NC}"
    echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo ""
    
    local passing_score=$((passed_checks * 100 / total_checks))
    
    echo "Total Checks:    $total_checks"
    echo "Passed:          $passed_checks"
    echo "Failed:          $failed_checks"
    echo "Warnings:        $warnings"
    echo "Passing Score:   ${passing_score}%"
    echo ""
    
    # Determine specific exit code based on failure type
    local exit_code=$EXIT_SUCCESS
    
    if [[ $failed_checks -eq 0 ]]; then
        echo -e "${GREEN}${BOLD}✓ ALL CHECKS PASSED - READY TO SEND${NC}"
        echo ""
        echo "Email validated: $(basename "$email_file")"
        echo "Validation log: $STATE_FILE"
        echo "Exit code: $EXIT_SUCCESS (success)"
        return $EXIT_SUCCESS
    elif [[ $passing_score -ge $MIN_PASSING_SCORE ]]; then
        echo -e "${YELLOW}${BOLD}⚠ PARTIAL PASS - $passing_score% (threshold: $MIN_PASSING_SCORE%)${NC}"
        echo ""
        echo "Recommendation: Fix $failed_checks failing check(s) before sending"
        exit_code=$EXIT_SUCCESS_WITH_WARNINGS
        echo "Exit code: $exit_code (partial pass)"
        return $exit_code
    else
        # Determine specific failure type
        if grep -q 'duplicate_detection.*fail' "$CURRENT_RUN_FILE" 2>/dev/null; then
            exit_code=$EXIT_DUPLICATE_DETECTED
        elif grep -q 'placeholder_detection.*fail' "$CURRENT_RUN_FILE" 2>/dev/null; then
            exit_code=$EXIT_PLACEHOLDER_DETECTED
        elif grep -q 'past_date_detection.*fail' "$CURRENT_RUN_FILE" 2>/dev/null; then
            exit_code=$EXIT_DATE_IN_PAST
        elif grep -q 'legal_citations.*fail' "$CURRENT_RUN_FILE" 2>/dev/null; then
            exit_code=$EXIT_LEGAL_CITATION_MALFORMED
        else
            exit_code=$EXIT_SCHEMA_VALIDATION_FAILED
        fi
        
        echo -e "${RED}${BOLD}✗ VALIDATION FAILED - $passing_score% (threshold: $MIN_PASSING_SCORE%)${NC}"
        echo ""
        echo "Fix issues and re-run validation"
        echo "Exit code: $exit_code (validation failure)"
        return $exit_code
    fi
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CLI INTERFACE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

show_help() {
    cat << 'HELP'
Validation Runner v2.0.0 - Phase 1 Consolidation

ARCHITECTURE:
  - validation-core.sh: Pure functions (no state)
  - validation-runner.sh: Orchestration (state, logging, auto-fix)

USAGE:
    validation-runner.sh <email_file>
    validation-runner.sh --help

OPTIONS:
    --help, -h          Show this help message
    --version, -v       Show version
    --dry-run           Run validation without auto-fix
    --strict            Zero tolerance mode (fail on any error)
    --auto-fix          Enable automatic fixes

EXAMPLES:
    # Validate landlord email
    validation-runner.sh EMAIL-TO-LANDLORD.eml
    
    # Validate with auto-fix enabled
    validation-runner.sh --auto-fix EMAIL-TO-LANDLORD.eml
    
    # Strict mode (zero failures allowed)
    validation-runner.sh --strict EMAIL-TO-LANDLORD.eml

FEATURE FLAGS:
    FEATURE_PLACEHOLDER_CHECK       Detect [placeholders]
    FEATURE_EMPLOYMENT_CHECK        Verify ROAM R-2026-011 compliance
    FEATURE_LEGAL_CITATION_CHECK    Validate N.C.G.S. format
    FEATURE_RECIPIENT_CHECK         Verify required recipients
    FEATURE_TRIAL_REFERENCE_CHECK   Validate trial dates
    FEATURE_ATTACHMENT_CHECK        Check attachment existence
    FEATURE_DATE_CONSISTENCY_CHECK  Validate date consistency
    FEATURE_REGRESSION_CHECK        Detect regression
    FEATURE_AUTO_FIX                Enable automatic fixes

DOCUMENTATION:
    State logs:     _SYSTEM/_AUTOMATION/.validation-state/
    ROAM tracker:   /Users/shahroozbhopti/Documents/code/investing/agentic-flow/ROAM_TRACKER.yaml
    
HELP
}

# Main entry point
main() {
    case "${1:-}" in
        --help|-h)
            show_help
            exit 0
            ;;
        --version|-v)
            echo "Validation Runner v${VERSION}"
            exit 0
            ;;
        --strict)
            export MAX_FAILURES_ALLOWED=0
            export MIN_PASSING_SCORE=100
            shift
            ;;
        --dry-run)
            export FEATURE_AUTO_FIX=false
            shift
            ;;
        --auto-fix)
            export FEATURE_AUTO_FIX=true
            shift
            ;;
        "")
            echo "ERROR: No email file specified"
            echo "Run '$0 --help' for usage"
            exit 1
            ;;
    esac
    
    run_validation_pipeline "$1"
}

main "$@"
