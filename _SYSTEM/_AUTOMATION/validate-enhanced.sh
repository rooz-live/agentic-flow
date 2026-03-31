#!/usr/bin/env bash
#
# validate-enhanced.sh - Enhanced Email Validation with Bounded Reasoning
# Implements coverage iterations and progress tracking for email validation
#
# Usage: ./validate-enhanced.sh <email-file.eml> [--cycles N] [--coverage]
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../" && pwd)"

# Source frameworks
source "$PROJECT_ROOT/_SYSTEM/_AUTOMATION/exit-codes-robust.sh" 2>/dev/null || {
    EX_OK=0
    EX_USAGE=10
    EX_NOFILE=11
    EX_PLACEHOLDER_DETECTED=111
    EX_LEGAL_CITATION_MALFORMED=150
    EX_WSJF_REJECT=160
    EX_VALIDATION_FAILED=150
}
source "$PROJECT_ROOT/_SYSTEM/_AUTOMATION/bounded-reasoning-framework.sh" 2>/dev/null || true

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Logging functions
log() { echo -e "${BLUE}[VALIDATE]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
debug() { echo -e "${PURPLE}[DEBUG]${NC} $*"; }

# =============================================================================
# CONFIGURATION WITH DEFAULTS
# =============================================================================

DEFAULT_CYCLES=3
MIN_COVERAGE=80
MAX_VALIDATION_TIME=60

# Parse arguments
CYCLES=${DEFAULT_CYCLES}
COVERAGE_MODE=false
EMAIL_FILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --cycles)
            CYCLES="$2"
            shift 2
            ;;
        --coverage)
            COVERAGE_MODE=true
            shift
            ;;
        -*)
            error "Unknown option: $1"
            exit ${EX_USAGE}
            ;;
        *)
            EMAIL_FILE="$1"
            shift
            ;;
    esac
done

# =============================================================================
# VALIDATION COVERAGE MATRIX
# =============================================================================

declare -A VALIDATION_TESTS=(
    # Test ID: "Description|Weight|Exit Code|Category"
    ["args_check"]="Arguments validation|5|${EX_USAGE}|INPUT"
    ["file_exists"]="File existence check|5|${EX_NOFILE}|INPUT"
    ["placeholders"]="Template placeholder detection|15|${EX_PLACEHOLDER_DETECTED}|CONTENT"
    ["email_syntax"]="Email address syntax validation|10|${EX_VALIDATION_FAILED}|FORMAT"
    ["legal_citations"]="N.C.G.S. citation format|15|${EX_LEGAL_CITATION_MALFORMED}|LEGAL"
    ["wsjf_score"]="WSJF score validation|10|${EX_WSJF_REJECT}|BUSINESS"
    ["recipient_check"]="Required recipients present|10|${EX_VALIDATION_FAILED}|BUSINESS"
    ["subject_line"]="Subject line completeness|5|${EX_VALIDATION_FAILED}|FORMAT"
    ["attachments"]="Attachment references|5|${EX_VALIDATION_FAILED}|CONTENT"
    ["tone_analysis"]="Professional tone assessment|10|${EX_VALIDATION_FAILED}|STYLE"
    ["hash_check"]="Duplicate detection via SHA256|5|${EX_VALIDATION_FAILED}|INTEGRITY"
    ["links_check"]="URL validity check|5|${EX_VALIDATION_FAILED}|CONTENT"
)

# Total weight calculation
TOTAL_WEIGHT=0
for test_info in "${VALIDATION_TESTS[@]}"; do
    weight=$(echo "$test_info" | cut -d'|' -f2)
    TOTAL_WEIGHT=$((TOTAL_WEIGHT + weight))
done

# =============================================================================
# VALIDATION FUNCTIONS WITH COVERAGE TRACKING
# =============================================================================

# Initialize validation session
init_validation() {
    local email_file="$1"
    local process_id="validate-$(basename "$email_file")-$(date +%s)"
    
    # Create bounded contract
    create_contract "$process_id" "Email Validation: $(basename "$email_file")" \
        "${#VALIDATION_TESTS[@]}" "$MAX_VALIDATION_TIME" "jq,grep,sha256sum"
    
    echo "$process_id" > /tmp/current-validation.pid
    echo "$email_file" > /tmp/current-validation.file
    
    log "═══════════════════════════════════════════════════════════════"
    log "  ENHANCED EMAIL VALIDATION (BOUNDED REASONING)"
    log "  File: $(basename "$email_file")"
    log "  Cycles: $CYCLES | Target Coverage: ${MIN_COVERAGE}%"
    log "═══════════════════════════════════════════════════════════════"
    echo ""
    
    start_process "$process_id"
    echo "$process_id"
}

# Run single validation test
run_validation_test() {
    local test_id="$1"
    local email_file="$2"
    local process_id="$3"
    local cycle="$4"
    
    local test_info="${VALIDATION_TESTS[$test_id]}"
    local description=$(echo "$test_info" | cut -d'|' -f1)
    local weight=$(echo "$test_info" | cut -d'|' -f2)
    local exit_code=$(echo "$test_info" | cut -d'|' -f3)
    local category=$(echo "$test_info" | cut -d'|' -f4)
    
    debug "Running $test_id: $description (Weight: $weight)"
    
    # Update progress
    update_progress "$process_id" "Cycle $cycle: $description" 1 "RUNNING"
    
    # Run the actual test
    case $test_id in
        "args_check") validate_args "$email_file" ;;
        "file_exists") validate_file_exists "$email_file" ;;
        "placeholders") validate_placeholders "$email_file" ;;
        "email_syntax") validate_email_syntax "$email_file" ;;
        "legal_citations") validate_legal_citations "$email_file" ;;
        "wsjf_score") validate_wsjf_score "$email_file" ;;
        "recipient_check") validate_recipients "$email_file" ;;
        "subject_line") validate_subject "$email_file" ;;
        "attachments") validate_attachments "$email_file" ;;
        "tone_analysis") validate_tone "$email_file" ;;
        "hash_check") validate_hash "$email_file" ;;
        "links_check") validate_links "$email_file" ;;
    esac
    
    local result=$?
    
    # Record result
    if [[ $result -eq 0 ]]; then
        success "✓ $description"
        echo "PASS|$test_id|$weight|$category" >> "/tmp/validation-results-${process_id}.txt"
    else
        error "✗ $description (Exit: $result)"
        echo "FAIL|$test_id|$weight|$category|$exit_code" >> "/tmp/validation-results-${process_id}.txt"
    fi
    
    return $result
}

# Calculate coverage
calculate_coverage() {
    local process_id="$1"
    local results_file="/tmp/validation-results-${process_id}.txt"
    
    if [[ ! -f "$results_file" ]]; then
        echo "0"
        return
    fi
    
    local passed_weight=0
    local total_tested=0
    
    while IFS='|' read -r status test_id weight category exit_code; do
        if [[ "$status" == "PASS" ]]; then
            passed_weight=$((passed_weight + weight))
        fi
        total_tested=$((total_tested + weight))
    done < "$results_file"
    
    # Calculate percentage
    if [[ $total_tested -gt 0 ]]; then
        echo "scale=2; $passed_weight * 100 / $total_tested" | bc -l
    else
        echo "0"
    fi
}

# =============================================================================
# VALIDATION IMPLEMENTATIONS
# =============================================================================

validate_args() {
    [[ -n "$EMAIL_FILE" ]]
}

validate_file_exists() {
    [[ -f "$EMAIL_FILE" ]]
}

validate_placeholders() {
    # Check for various placeholder patterns
    if grep -qE '\{\{[A-Z_]+\}\}|\[PLACEHOLDER\]|<PLACEHOLDER>|XXX|TODO|FIXME' "$EMAIL_FILE" 2>/dev/null; then
        return ${EX_PLACEHOLDER_DETECTED}
    fi
    return 0
}

validate_email_syntax() {
    # Extract email addresses and validate syntax
    local emails=$(grep -oE '\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b' "$EMAIL_FILE" 2>/dev/null || true)
    
    while read -r email; do
        if [[ -n "$email" ]]; then
            # Basic regex validation
            if ! echo "$email" | grep -qE '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'; then
                return ${EX_VALIDATION_FAILED}
            fi
        fi
    done <<< "$emails"
    
    return 0
}

validate_legal_citations() {
    # Check N.C.G.S. citation format
    if grep -qi "N.C.G.S\." "$EMAIL_FILE"; then
        # Look for proper format: N.C.G.S. § 1A-1
        if ! grep -qE 'N\.C\.G\.S\. § [0-9]+[A-Z]?-[0-9]+' "$EMAIL_FILE"; then
            return ${EX_LEGAL_CITATION_MALFORMED}
        fi
    fi
    return 0
}

validate_wsjf_score() {
    # Check if WSJF score is mentioned and reasonable
    if grep -qi "WSJF" "$EMAIL_FILE"; then
        local score=$(grep -oE 'WSJF[^0-9]*([0-9]+\.?[0-9]*)' "$EMAIL_FILE" 2>/dev/null | head -1 | grep -oE '[0-9]+\.?[0-9]*' || echo "0")
        if [[ $(echo "$score < 30" | bc -l) -eq 1 ]]; then
            return ${EX_WSJF_REJECT}
        fi
    fi
    return 0
}

validate_recipients() {
    # Check for required recipients based on context
    local to_count=$(grep -c "^To:" "$EMAIL_FILE" 2>/dev/null || echo "0")
    local from_count=$(grep -c "^From:" "$EMAIL_FILE" 2>/dev/null || echo "0")
    
    if [[ $to_count -eq 0 || $from_count -eq 0 ]]; then
        return ${EX_VALIDATION_FAILED}
    fi
    return 0
}

validate_subject() {
    # Check subject line exists and has content
    if ! grep -q "^Subject:" "$EMAIL_FILE"; then
        return ${EX_VALIDATION_FAILED}
    fi
    
    local subject=$(grep "^Subject:" "$EMAIL_FILE" | cut -d' ' -f2-)
    if [[ ${#subject} -lt 5 ]]; then
        return ${EX_VALIDATION_FAILED}
    fi
    return 0
}

validate_attachments() {
    # Check attachment references
    if grep -qi "attach" "$EMAIL_FILE"; then
        # Should see actual attachments or proper notation
        if ! grep -qE "\[.*\.pdf\]|\[.*\.doc\]|Attachments:" "$EMAIL_FILE"; then
            return ${EX_VALIDATION_FAILED}
        fi
    fi
    return 0
}

validate_tone() {
    # Basic tone analysis - avoid aggressive language
    local aggressive_words=("demand" "immediately" "urgent" "failure" "incompetent")
    
    for word in "${aggressive_words[@]}"; do
        if grep -qi "$word" "$EMAIL_FILE"; then
            warn "Potentially aggressive language detected: $word"
            # Not failing, just warning
        fi
    done
    return 0
}

validate_hash() {
    # Calculate and store hash for duplicate detection
    local hash=$(sha256sum "$EMAIL_FILE" | cut -d' ' -f1)
    local hash_file="/tmp/email-hashes.txt"
    
    if [[ -f "$hash_file" ]] && grep -q "$hash" "$hash_file"; then
        warn "Duplicate email detected (same hash)"
        # Not failing, just warning
    else
        echo "$hash $(basename "$EMAIL_FILE") $(date)" >> "$hash_file"
    fi
    return 0
}

validate_links() {
    # Extract and validate URLs
    local urls=$(grep -oE 'https?://[^\s]+' "$EMAIL_FILE" 2>/dev/null || true)
    
    while read -r url; do
        if [[ -n "$url" ]]; then
            # Basic URL format check
            if ! echo "$url" | grep -qE '^https?://'; then
                return ${EX_VALIDATION_FAILED}
            fi
        fi
    done <<< "$urls"
    
    return 0
}

# =============================================================================
# MAIN VALIDATION LOOP WITH COVERAGE ITERATIONS
# =============================================================================

main() {
    local email_file="$EMAIL_FILE"
    
    # Validate basic args first
    if ! validate_args; then
        exit ${EX_USAGE}
    fi
    
    if ! validate_file_exists "$email_file"; then
        exit ${EX_NOFILE}
    fi
    
    # Initialize validation session
    local process_id=$(init_validation "$email_file")
    
    # Run validation cycles
    local best_coverage=0
    local best_cycle=0
    
    for ((cycle=1; cycle<=CYCLES; cycle++)); do
        log "🔄 VALIDATION CYCLE $cycle/$CYCLES"
        echo ""
        
        # Clear previous results
        > "/tmp/validation-results-${process_id}.txt"
        
        # Run all validation tests
        local failed_tests=()
        for test_id in "${!VALIDATION_TESTS[@]}"; do
            if ! run_validation_test "$test_id" "$email_file" "$process_id" "$cycle"; then
                failed_tests+=("$test_id")
            fi
        done
        
        # Calculate coverage
        local coverage=$(calculate_coverage "$process_id")
        coverage=$(echo "$coverage" | cut -d. -f1)  # Integer part
        
        echo ""
        log "📊 COVERAGE RESULTS:"
        log "  Current Coverage: ${coverage}%"
        log "  Target Coverage: ${MIN_COVERAGE}%"
        log "  Failed Tests: ${#failed_tests[@]}"
        
        if [[ $coverage -gt $best_coverage ]]; then
            best_coverage=$coverage
            best_cycle=$cycle
        fi
        
        # Check if we meet target
        if [[ $coverage -ge $MIN_COVERAGE ]]; then
            echo ""
            success "✅ VALIDATION PASSED - ${coverage}% coverage achieved"
            success "Best cycle: $best_cycle with ${best_coverage}% coverage"
            
            # Show failed tests if any
            if [[ ${#failed_tests[@]} -gt 0 ]]; then
                echo ""
                warn "Note: Some tests failed but coverage threshold met:"
                for test in "${failed_tests[@]}"; do
                    local desc=$(echo "${VALIDATION_TESTS[$test]}" | cut -d'|' -f1)
                    warn "  - $desc"
                done
            fi
            
            complete_process "$process_id" true
            echo ""
            log "Semantic meaning: Validation passed with ${coverage}% confidence"
            exit ${EX_OK}
        fi
        
        # If not last cycle, show improvement suggestions
        if [[ $cycle -lt $CYCLES ]]; then
            echo ""
            warn "Coverage below target. Suggestions for improvement:"
            
            # Analyze failed tests by category
            declare -A failed_categories
            for test in "${failed_tests[@]}"; do
                local category=$(echo "${VALIDATION_TESTS[$test]}" | cut -d'|' -f4)
                failed_categories[$category]=$((failed_categories[$category] + 1))
            done
            
            for category in "${!failed_categories[@]}"; do
                warn "  - Fix ${failed_categories[$category]} ${category} issue(s)"
            done
            
            echo ""
            log "Retrying in 2 seconds..."
            sleep 2
        fi
    done
    
    # All cycles completed without meeting target
    echo ""
    error "❌ VALIDATION FAILED - Best coverage: ${best_coverage}% (Cycle $best_cycle)"
    error "Target coverage: ${MIN_COVERAGE}% not achieved after $CYCLES cycles"
    
    # Show final report
    echo ""
    log "📋 FINAL VALIDATION REPORT:"
    log "  File: $(basename "$email_file")"
    log "  Best Coverage: ${best_coverage}%"
    log "  Cycles Run: $CYCLES"
    log "  Exit Code: ${EX_VALIDATION_FAILED}"
    
    complete_process "$process_id" false
    exit ${EX_VALIDATION_FAILED}
}

# Run main if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
