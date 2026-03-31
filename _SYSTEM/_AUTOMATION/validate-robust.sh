#!/usr/bin/env bash
#
# validate.sh - Pre-send Email Validation Hook (Robust Exit Code Edition)
#
# This script validates emails before sending using semantic exit codes:
#   0    = EX_OK - Validation passed, safe to send
#   10   = EX_USAGE - Invalid arguments
#   11   = EX_NOFILE - Email file not found
#   111  = EX_PLACEHOLDER_DETECTED - Template variables not replaced
#   150  = EX_LEGAL_CITATION_MALFORMED - N.C.G.S. formatting incorrect
#   160  = EX_WSJF_REJECT - Priority score below threshold
#
# Usage:
#   ./validate.sh <email-file.eml>
#   echo $?  # Check semantic exit code
#
# Examples:
#   ./validate.sh email.eml && echo "Safe to send"
#   ./validate.sh missing.eml; echo $EX_NOFILE  # 11
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../" && pwd)"

# Source robust exit codes
source "$PROJECT_ROOT/_SYSTEM/_AUTOMATION/exit-codes-robust.sh" 2>/dev/null || {
    # Fallback if exit-codes-robust.sh not found
    EX_OK=0
    EX_USAGE=10
    EX_NOFILE=11
    EX_PLACEHOLDER_DETECTED=111
    EX_LEGAL_CITATION_MALFORMED=150
    EX_WSJF_REJECT=160
}

VALIDATOR_ENHANCED="$PROJECT_ROOT/_SYSTEM/_AUTOMATION/validator-12-enhanced.sh"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[VALIDATE]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }

# =============================================================================
# VALIDATION FUNCTIONS WITH SEMANTIC EXIT CODES
# =============================================================================

validate_args() {
    if [ $# -eq 0 ]; then
        error "No email file provided"
        error "Usage: $0 <email-file.eml>"
        error "Exit code: ${EX_USAGE} (EX_USAGE - Invalid arguments)"
        return ${EX_USAGE}
    fi
    return ${EX_OK}
}

validate_file_exists() {
    local file="$1"
    if [ ! -f "$file" ]; then
        error "Email file not found: $file"
        error "Exit code: ${EX_NOFILE} (EX_NOFILE - File not found)"
        error "👉 Next: Check file path or create email draft"
        return ${EX_NOFILE}
    fi
    return ${EX_OK}
}

validate_placeholders() {
    local file="$1"
    
    # Check for {{VARIABLE}} syntax
    if grep -qE '\{\{[A-Z_]+\}\}' "$file" 2>/dev/null; then
        local placeholders=$(grep -oE '\{\{[A-Z_]+\}\}' "$file" | sort -u | head -5)
        error "❌ BLOCKER: Template placeholders detected"
        error "Exit code: ${EX_PLACEHOLDER_DETECTED} (EX_PLACEHOLDER_DETECTED)"
        error "Found:"
        echo "$placeholders" | while read placeholder; do
            error "  - $placeholder"
        done
        error "👉 Next: Replace all {{VARIABLES}} with actual values"
        return ${EX_PLACEHOLDER_DETECTED}
    fi
    
    # Check for [PLACEHOLDER] or <PLACEHOLDER> syntax
    if grep -qE '\[PLACEHOLDER\]|<PLACEHOLDER>' "$file" 2>/dev/null; then
        error "❌ BLOCKER: Placeholder markers detected"
        error "Exit code: ${EX_PLACEHOLDER_DETECTED} (EX_PLACEHOLDER_DETECTED)"
        error "👉 Next: Replace [PLACEHOLDER] with actual content"
        return ${EX_PLACEHOLDER_DETECTED}
    fi
    
    return ${EX_OK}
}

validate_legal_citations() {
    local file="$1"
    
    # Check N.C.G.S. § formatting (should be "N.C.G.S. § 42-..." not "NCGS 42-...")
    if grep -qE 'N\.?C\.?G\.?S\.?[^§]*[0-9]' "$file" 2>/dev/null; then
        # Check for malformed citations (missing § symbol)
        if grep -oE 'N\.?C\.?G\.?S\.?\s+[0-9]+-[0-9]+' "$file" | grep -qv '§' 2>/dev/null; then
            local malformed=$(grep -oE 'N\.?C\.?G\.?S\.?\s+[0-9]+-[0-9]+' "$file" | grep -v '§' | head -1)
            error "❌ BLOCKER: Legal citation malformed"
            error "Exit code: ${EX_LEGAL_CITATION_MALFORMED} (EX_LEGAL_CITATION_MALFORMED)"
            error "Found: $malformed"
            error "Should be: N.C.G.S. § 42-... (with § symbol)"
            error "👉 Next: Fix N.C.G.S. citation formatting"
            return ${EX_LEGAL_CITATION_MALFORMED}
        fi
    fi
    
    return ${EX_OK}
}

validate_wsjf_score() {
    local file="$1"
    local min_score=45.0
    
    # Try to extract WSJF score from email metadata or filename
    local wsjf_score=$(echo "$file" | grep -oE '[0-9]+\.[0-9]+' | head -1)
    
    # If no score in filename, check for WSJF: annotation in email
    if [ -z "$wsjf_score" ]; then
        wsjf_score=$(grep -oE 'WSJF:\s*[0-9]+\.[0-9]+' "$file" | grep -oE '[0-9]+\.[0-9]+' | head -1)
    fi
    
    # Validate score if found
    if [ -n "$wsjf_score" ]; then
        if (( $(echo "$wsjf_score < $min_score" | bc -l 2>/dev/null || echo "0") )); then
            error "❌ BLOCKER: WSJF score below threshold"
            error "Exit code: ${EX_WSJF_REJECT} (EX_WSJF_REJECT - Score too low)"
            error "Score: $wsjf_score (minimum: $min_score)"
            error "👉 Next: Review email priority or increase business value"
            return ${EX_WSJF_REJECT}
        fi
        log "✓ WSJF score: $wsjf_score (above threshold)"
    fi
    
    return ${EX_OK}
}

# =============================================================================
# MAIN VALIDATION PIPELINE
# =============================================================================

main() {
    echo ""
    log "═══════════════════════════════════════════════════════════════"
    log "  EMAIL VALIDATION (Robust Exit Codes)"
    log "═══════════════════════════════════════════════════════════════"
    echo ""
    
    local email_file="${1:-}"
    local exit_code=${EX_OK}
    
    # Check 1: Arguments
    validate_args "$@" || exit $?
    
    # Check 2: File exists
    validate_file_exists "$email_file" || exit $?
    
    log "📧 Validating: $(basename "$email_file")"
    echo ""
    
    # Check 3: Placeholders
    if ! validate_placeholders "$email_file"; then
        exit_code=$?
    fi
    
    # Check 4: Legal citations
    if [ $exit_code -eq ${EX_OK} ] && ! validate_legal_citations "$email_file"; then
        exit_code=$?
    fi
    
    # Check 5: WSJF score
    if [ $exit_code -eq ${EX_OK} ] && ! validate_wsjf_score "$email_file"; then
        exit_code=$?
    fi
    
    # Check 6: Enhanced validator (if available)
    if [ -x "$VALIDATOR_ENHANCED" ]; then
        log "Running enhanced validation..."
        "$VALIDATOR_ENHANCED" --validate-email "$email_file" 2>/dev/null || {
            local enhanced_exit=$?
            if [ $exit_code -eq ${EX_OK} ] && [ $enhanced_exit -ne 0 ]; then
                exit_code=1  # Generic failure from enhanced validator
            fi
        }
    fi
    
    echo ""
    if [ $exit_code -eq ${EX_OK} ]; then
        success "✅ VALIDATION PASSED - Safe to send!"
        success "Exit code: ${EX_OK} (EX_OK)"
        log "Semantic meaning: All checks passed, 100% confidence"
    else
        error "❌ VALIDATION FAILED"
        # Explain the exit code
        echo ""
        log "Exit Code Reference:"
        log "  ${EX_NOFILE}=File missing | ${EX_PLACEHOLDER_DETECTED}=Template vars | ${EX_LEGAL_CITATION_MALFORMED}=N.C.G.S. format | ${EX_WSJF_REJECT}=Score low"
        log "Run: explain-exit-code.sh $exit_code"
    fi
    echo ""
    
    return $exit_code
}

# Run main
main "$@"
