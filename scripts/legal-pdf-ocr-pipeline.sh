#!/usr/bin/env bash
# =============================================================================
# legal-pdf-ocr-pipeline.sh — OCR → Review → Rename → Refile for Legal PDFs
# =============================================================================
# @business-context WSJF-LEGAL: Automates legal document processing
# @adr ADR-018: PDF processing pipeline for legal evidence chain
# @constraint DDD-LEGAL: Operates within BHOPTI-LEGAL bounded context
#
# Exit Codes:
#   0   = Success (all steps completed)
#   11  = File not found
#   12  = Invalid format (not a PDF)
#   60  = OCR tool missing (ocrmypdf, pdftotext)
#   150 = Legal citation malformed (law ledger)
#   152 = Evidence integrity issue (hab ledger)
#   153 = Filing operation failed (file ledger)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BHOPTI_LEGAL="${HOME}/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL"
AUTOMATION_DIR="${BHOPTI_LEGAL}/_SYSTEM/_AUTOMATION"

# Source exit codes
source "${AUTOMATION_DIR}/exit-codes-robust.sh" 2>/dev/null || {
    export EXIT_SUCCESS=0
    export EXIT_FILE_NOT_FOUND=11
    export EXIT_INVALID_FORMAT=12
    export EXIT_TOOL_MISSING=60
    export EXIT_LEDGER_HAB=152
    export EXIT_LEDGER_FILE=153
}

# Colors
RED='\033[0;31m'; GRN='\033[0;32m'; YLW='\033[1;33m'; CYN='\033[0;36m'; NC='\033[0m'
log_info() { echo -e "${CYN}[INFO]${NC} $*"; }
log_success() { echo -e "${GRN}[✓]${NC} $*"; }
log_warn() { echo -e "${YLW}[⚠]${NC} $*"; }
log_error() { echo -e "${RED}[✗]${NC} $*" >&2; }

# =============================================================================
# STEP 1: OCR EXTRACTION
# =============================================================================
ocr_extract() {
    local pdf_file="$1"
    local output_txt="${pdf_file%.pdf}.txt"
    
    log_info "OCR: Extracting text from $(basename "$pdf_file")"
    
    # Try pdftotext first (faster, no OCR needed for native PDFs)
    if command -v pdftotext &>/dev/null; then
        pdftotext -layout "$pdf_file" "$output_txt" 2>/dev/null
        if [[ -s "$output_txt" ]]; then
            log_success "Text extracted via pdftotext"
            echo "$output_txt"
            return 0
        fi
    fi
    
    # Fallback to ocrmypdf (for scanned documents)
    if command -v ocrmypdf &>/dev/null; then
        local ocr_pdf="${pdf_file%.pdf}_ocr.pdf"
        ocrmypdf --skip-text "$pdf_file" "$ocr_pdf" 2>/dev/null
        pdftotext -layout "$ocr_pdf" "$output_txt" 2>/dev/null
        rm -f "$ocr_pdf"
        if [[ -s "$output_txt" ]]; then
            log_success "Text extracted via ocrmypdf"
            echo "$output_txt"
            return 0
        fi
    fi
    
    log_error "OCR failed - install pdftotext or ocrmypdf"
    return ${EXIT_TOOL_MISSING:-60}
}

# =============================================================================
# STEP 2: CASE NUMBER DETECTION
# =============================================================================
detect_case_number() {
    local text_file="$1"
    
    # NC case number patterns: 26CV005596-590, 26CV007491-590, etc.
    local case_pattern='[0-9]{2}CV[0-9]{6}-[0-9]{3}'
    
    if grep -oE "$case_pattern" "$text_file" 2>/dev/null | head -1; then
        return 0
    fi
    
    # Fallback: try filename
    basename "$text_file" | grep -oE "$case_pattern" 2>/dev/null | head -1
}

# =============================================================================
# STEP 3: DOCUMENT TYPE CLASSIFICATION
# =============================================================================
classify_document() {
    local text_file="$1"
    local content
    content=$(cat "$text_file" 2>/dev/null | tr '[:upper:]' '[:lower:]')
    
    # Order matters: most specific first
    if echo "$content" | grep -qE "judgment|ordered that|magistrate finds"; then
        echo "Judgment"
    elif echo "$content" | grep -qE "register of actions|case summary|party information"; then
        echo "Register-of-Actions"
    elif echo "$content" | grep -qE "motion to consolidate"; then
        echo "Motion-to-Consolidate"
    elif echo "$content" | grep -qE "complaint|cause of action"; then
        echo "Complaint"
    elif echo "$content" | grep -qE "answer|defendant.*denies"; then
        echo "Answer"
    elif echo "$content" | grep -qE "civil summons|you are notified"; then
        echo "Summons"
    elif echo "$content" | grep -qE "notice.*vacate|60.*day.*notice"; then
        echo "Notice-to-Vacate"
    elif echo "$content" | grep -qE "arbitration"; then
        echo "Arbitration-Notice"
    elif echo "$content" | grep -qE "appeal|appellate"; then
        echo "Appeal"
    else
        echo "Legal-Document"
    fi
}

# =============================================================================
# STEP 4: GENERATE NEW FILENAME
# =============================================================================
generate_filename() {
    local original_file="$1"
    local case_number="$2"
    local doc_type="$3"
    local file_date="${4:-$(date +%Y-%m-%d)}"
    
    # Format: YYYY-MM-DD_CaseNumber_DocumentType.pdf
    echo "${file_date}_${case_number}_${doc_type}.pdf"
}

# =============================================================================
# STEP 5: SUGGEST FILING LOCATION
# =============================================================================
suggest_filing_location() {
    local case_number="$1"
    local doc_type="$2"
    
    local case_dir="${BHOPTI_LEGAL}/01-ACTIVE-CRITICAL/MAA-${case_number}"
    
    case "$doc_type" in
        Judgment|Motion*|Answer|Complaint|Summons|Appeal)
            echo "${case_dir}/COURT-FILINGS"
            ;;
        Register-of-Actions)
            echo "${case_dir}/COURT-FILINGS"
            ;;
        Notice*|Arbitration*)
            echo "${case_dir}/COURT-FILINGS"
            ;;
        *)
            echo "${case_dir}/EVIDENCE"
            ;;
    esac
}

# =============================================================================
# STEP 6: HASH FOR EVIDENCE CHAIN
# =============================================================================
hash_file() {
    local file="$1"
    shasum -a 256 "$file" 2>/dev/null | awk '{print $1}'
}

# =============================================================================
# MAIN PIPELINE
# =============================================================================
process_pdf() {
    local pdf_file="$1"
    local dry_run="${2:-false}"
    
    # Validate file exists
    if [[ ! -f "$pdf_file" ]]; then
        log_error "File not found: $pdf_file"
        return ${EXIT_FILE_NOT_FOUND:-11}
    fi
    
    # Validate PDF
    if [[ ! "$pdf_file" =~ \.pdf$ ]]; then
        log_error "Not a PDF file: $pdf_file"
        return ${EXIT_INVALID_FORMAT:-12}
    fi
    
    log_info "Processing: $(basename "$pdf_file")"
    echo "─────────────────────────────────────────────────────"
    
    # Step 1: OCR
    local text_file
    text_file=$(ocr_extract "$pdf_file") || return $?
    
    # Step 2: Detect case number
    local case_number
    case_number=$(detect_case_number "$text_file")
    if [[ -z "$case_number" ]]; then
        log_warn "Could not detect case number, using UNKNOWN"
        case_number="UNKNOWN"
    fi
    log_info "Case Number: $case_number"
    
    # Step 3: Classify document
    local doc_type
    doc_type=$(classify_document "$text_file")
    log_info "Document Type: $doc_type"
    
    # Step 4: Generate new filename
    local new_filename
    new_filename=$(generate_filename "$pdf_file" "$case_number" "$doc_type")
    log_info "Suggested Name: $new_filename"
    
    # Step 5: Suggest location
    local filing_location
    filing_location=$(suggest_filing_location "$case_number" "$doc_type")
    log_info "Filing Location: $filing_location"
    
    # Step 6: Hash for integrity
    local file_hash
    file_hash=$(hash_file "$pdf_file")
    log_info "SHA-256: ${file_hash:0:16}..."
    
    echo "─────────────────────────────────────────────────────"
    
    if [[ "$dry_run" == "true" ]]; then
        log_warn "DRY RUN - No changes made"
        return 0
    fi
    
    # Execute filing
    mkdir -p "$filing_location"
    local dest_path="${filing_location}/${new_filename}"
    
    if [[ -f "$dest_path" ]]; then
        log_warn "File already exists: $dest_path"
        read -p "Overwrite? (y/N): " confirm
        [[ "$confirm" != "y" ]] && return 0
    fi
    
    cp -v "$pdf_file" "$dest_path"
    log_success "Filed: $dest_path"
    
    # Clean up temp text file
    rm -f "$text_file"
    
    # Log to evidence chain
    local log_entry="$(date -u +%Y-%m-%dT%H:%M:%SZ)|FILED|${new_filename}|${file_hash}|${filing_location}"
    echo "$log_entry" >> "${BHOPTI_LEGAL}/_SYSTEM/_EVIDENCE-CHAIN.log"
    
    return 0
}

# =============================================================================
# CLI
# =============================================================================
usage() {
    echo "Usage: $0 [OPTIONS] <pdf_file|directory>"
    echo ""
    echo "Options:"
    echo "  --dry-run    Show what would be done without making changes"
    echo "  --batch      Process all PDFs in directory"
    echo "  --help       Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 ~/Downloads/26CV007491-590.pdf"
    echo "  $0 --dry-run ~/Downloads/*.pdf"
    echo "  $0 --batch ~/Downloads/"
}

main() {
    local dry_run=false
    local batch_mode=false
    local files=()
    
    for arg in "$@"; do
        case "$arg" in
            --dry-run) dry_run=true ;;
            --batch) batch_mode=true ;;
            --help|-h) usage; exit 0 ;;
            *) files+=("$arg") ;;
        esac
    done
    
    if [[ ${#files[@]} -eq 0 ]]; then
        usage
        exit 1
    fi
    
    local exit_code=0
    for file in "${files[@]}"; do
        if [[ -d "$file" && "$batch_mode" == "true" ]]; then
            for pdf in "$file"/*.pdf; do
                [[ -f "$pdf" ]] && process_pdf "$pdf" "$dry_run" || exit_code=$?
            done
        else
            process_pdf "$file" "$dry_run" || exit_code=$?
        fi
    done
    
    return $exit_code
}

main "$@"

