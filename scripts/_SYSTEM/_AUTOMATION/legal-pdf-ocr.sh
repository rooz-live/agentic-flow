#!/bin/bash
# Legal Document OCR Review & Processing Script
# Processes legal PDFs: OCR → Review → Rename → Refile

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuration
LEGAL_DIR="$HOME/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL"
TEMP_DIR="/tmp/legal-doc-processing"
LOG_FILE="$HOME/Library/Logs/legal-doc-processor.log"

# Ensure directories exist
mkdir -p "$TEMP_DIR" "$LEGAL_DIR/01-CASE-DOCS/PROCESSED"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# OCR PDF using macOS native tools
# Exit codes:
#   0 = OCR success
#   1 = OCR backend tried but failed
#   3 = No OCR backend available (deps missing)
ocr_pdf() {
    local pdf_path="$1"
    local output_file="$2"
    local backend_tried=false

    log "OCR processing: $(basename "$pdf_path")"
    
    # Method 1: Try textutil (native macOS)
    if command -v textutil >/dev/null 2>&1; then
        backend_tried=true
        if textutil -convert txt -stdout "$pdf_path" > "$output_file" 2>/dev/null; then
            log "✅ OCR successful via textutil"
            return 0
        fi
    fi
    
    # Method 2: Try pdftotext (if available)
    if command -v pdftotext >/dev/null 2>&1; then
        backend_tried=true
        if pdftotext "$pdf_path" "$output_file" 2>/dev/null; then
            log "✅ OCR successful via pdftotext"
            return 0
        fi
    fi
    
    # Method 3: Use existing PDF classifier
    if [[ -f "$SCRIPT_DIR/pdf_classifier.py" ]]; then
        backend_tried=true
        if python3 "$SCRIPT_DIR/pdf_classifier.py" "$pdf_path" > "$output_file" 2>/dev/null; then
            log "✅ OCR successful via PDF classifier"
            return 0
        fi
    fi
    
    if ! $backend_tried; then
        log "❌ OCR backends missing for: $(basename "$pdf_path")"
        return 3
    fi

    log "❌ OCR failed for: $(basename "$pdf_path")"
    return 1
}

# Extract case information from filename or content
extract_case_info() {
    local pdf_path="$1"
    local text_content="$2"
    
    local filename=$(basename "$pdf_path")
    local case_number=""
    local doc_type=""
    
    # Extract case number from filename
    if [[ "$filename" =~ ([0-9]{2}CV[0-9]{6}-[0-9]{3}) ]]; then
        case_number="${BASH_REMATCH[1]}"
    fi
    
    # Determine document type
    if [[ "$filename" =~ [Rr]egister.*[Aa]ctions ]]; then
        doc_type="RegisterOfActions"
    elif grep -qi "complaint" "$text_content" 2>/dev/null; then
        doc_type="Complaint"
    elif grep -qi "answer" "$text_content" 2>/dev/null; then
        doc_type="Answer"
    elif grep -qi "motion" "$text_content" 2>/dev/null; then
        doc_type="Motion"
    elif grep -qi "order" "$text_content" 2>/dev/null; then
        doc_type="Order"
    else
        doc_type="Document"
    fi
    
    echo "$case_number|$doc_type"
}

# Generate contrastive comparison
generate_comparison() {
    local file1_text="$1"
    local file2_text="$2"
    local output_file="$3"
    
    log "Generating contrastive comparison"
    
    cat > "$output_file" << EOF
# Contrastive Document Analysis
Generated: $(date '+%Y-%m-%d %H:%M:%S')

## Document Statistics
File 1 (Primary): $(wc -l < "$file1_text") lines, $(wc -w < "$file1_text") words
File 2 (Register): $(wc -l < "$file2_text") lines, $(wc -w < "$file2_text") words

## Common Terms (Top 10)
EOF
    
    # Find common significant terms (excluding common words)
    if command -v comm >/dev/null 2>&1; then
        comm -12 <(tr ' ' '\n' < "$file1_text" | grep -E '^[A-Z][a-z]{3,}' | sort -u) \
                 <(tr ' ' '\n' < "$file2_text" | grep -E '^[A-Z][a-z]{3,}' | sort -u) | \
        head -10 >> "$output_file"
    fi
    
    cat >> "$output_file" << EOF

## Unique to Primary Document
EOF
    
    # Find terms unique to first document
    if command -v comm >/dev/null 2>&1; then
        comm -23 <(tr ' ' '\n' < "$file1_text" | grep -E '^[A-Z][a-z]{3,}' | sort -u) \
                 <(tr ' ' '\n' < "$file2_text" | grep -E '^[A-Z][a-z]{3,}' | sort -u) | \
        head -10 >> "$output_file"
    fi
    
    cat >> "$output_file" << EOF

## Unique to Register Document
EOF
    
    # Find terms unique to second document
    if command -v comm >/dev/null 2>&1; then
        comm -13 <(tr ' ' '\n' < "$file1_text" | grep -E '^[A-Z][a-z]{3,}' | sort -u) \
                 <(tr ' ' '\n' < "$file2_text" | grep -E '^[A-Z][a-z]{3,}' | sort -u) | \
        head -10 >> "$output_file"
    fi
    
    log "✅ Comparison generated: $output_file"
}

# Generate legal filename
generate_legal_filename() {
    local case_number="$1"
    local doc_type="$2"
    local original_filename="$3"
    
    local date_stamp=$(date '+%Y-%m-%d')
    local clean_case=$(echo "$case_number" | tr -d ' ')
    
    if [[ -n "$clean_case" ]]; then
        echo "${date_stamp}_${clean_case}_${doc_type}.pdf"
    else
        echo "${date_stamp}_UnknownCase_${doc_type}.pdf"
    fi
}

# Process single PDF
process_pdf() {
    local pdf_path="$1"
    local status=0
    
    if [[ ! -f "$pdf_path" ]]; then
        log "❌ File not found: $pdf_path"
        return 1
    fi
    
    local filename=$(basename "$pdf_path")
    local text_file="$TEMP_DIR/${filename%.pdf}.txt"
    
    log "Processing: $filename"
    
    # Step 1: OCR
    if ! ocr_pdf "$pdf_path" "$text_file"; then
        local ocr_status=$?
        # Propagate dependency / backend-missing signal distinctly
        if [[ $ocr_status -eq 3 ]]; then
            return 3
        fi
        return 1
    fi
    
    # Step 2: Extract case info
    local case_info
    case_info=$(extract_case_info "$pdf_path" "$text_file")
    local case_number=$(echo "$case_info" | cut -d'|' -f1)
    local doc_type=$(echo "$case_info" | cut -d'|' -f2)
    
    log "Extracted: Case=$case_number, Type=$doc_type"
    
    # Status 2 = warnings/partial (e.g., unknown case or generic document type)
    if [[ -z "$case_number" || "$doc_type" == "Document" ]]; then
        status=2
    fi
    
    # Step 3: Generate legal filename
    local new_filename
    new_filename=$(generate_legal_filename "$case_number" "$doc_type" "$filename")
    
    log "Suggested filename: $new_filename"
    
    # Step 4: Suggest filing location
    local filing_location="$LEGAL_DIR/01-CASE-DOCS"
    if [[ -n "$case_number" ]]; then
        filing_location="$filing_location/$case_number"
        mkdir -p "$filing_location"
    fi
    
    log "Suggested location: $filing_location"
    
    # Store results
    echo "$pdf_path|$text_file|$new_filename|$filing_location|$case_number|$doc_type|$status"
}

# Main processing function
main() {
    local pdf1="${1:-}"
    local pdf2="${2:-}"
    local overall_status=0
    
    if [[ -z "$pdf1" ]]; then
        echo "Usage: $0 <pdf1> [pdf2]"
        echo "Example: $0 ~/Downloads/26CV007491-590.pdf ~/Downloads/Register\ of\ Actions\ -\ 26CV007491-590.pdf"
        exit 1
    fi
    
    log "Starting legal document processing"
    
    # Process first PDF
    local result1=""
    local status1=0
    if result1=$(process_pdf "$pdf1"); then
        status1=$(echo "$result1" | awk -F'|' '{print ($7+0)}')
    else
        status1=$?
    fi
    
    if [[ -n "$pdf2" ]]; then
        # Process second PDF
        local result2=""
        local status2=0
        if result2=$(process_pdf "$pdf2"); then
            status2=$(echo "$result2" | awk -F'|' '{print ($7+0)}')
        else
            status2=$?
        fi
        
        # Generate comparison
        if [[ $status1 -ne 1 && $status1 -ne 3 && $status2 -ne 1 && $status2 -ne 3 ]]; then
            local text1
            local text2
            text1=$(echo "$result1" | cut -d'|' -f2)
            text2=$(echo "$result2" | cut -d'|' -f2)
            local comparison_file="$TEMP_DIR/contrastive_comparison.md"
            
            generate_comparison "$text1" "$text2" "$comparison_file"
            
            echo "Results:"
            echo "PDF 1: $result1"
            echo "PDF 2: $result2"
            echo "Comparison: $comparison_file"
        else
            echo "Results:"
            [[ -n "$result1" ]] && echo "PDF 1: $result1" || echo "PDF 1: ERROR (status $status1)"
            [[ -n "$result2" ]] && echo "PDF 2: $result2" || echo "PDF 2: ERROR (status $status2)"
        fi
        
        # Combine statuses: 1 (blocker) > 3 (deps) > 2 (warnings) > 0
        overall_status=0
        for s in "$status1" "$status2"; do
            if [[ $s -eq 1 ]]; then
                overall_status=1
                break
            elif [[ $s -eq 3 && $overall_status -ne 1 ]]; then
                overall_status=3
            elif [[ $s -eq 2 && $overall_status -eq 0 ]]; then
                overall_status=2
            fi
        done
    else
        # Single-PDF run
        if [[ $status1 -eq 0 || $status1 -eq 2 ]]; then
            echo "Result: $result1"
        else
            echo "Result: ERROR (status $status1)"
        fi
        overall_status=$status1
    fi
    
    log "Processing complete"
    # Normalize to 0/1/2/3 only
    case "$overall_status" in
        0|1|2|3) exit "$overall_status" ;;
        *) exit 1 ;;
    esac
}

# Command interface
case "${1:-help}" in
    help|--help)
        cat << EOF
Legal Document OCR Review & Processing

USAGE:
  $0 <pdf1> [pdf2]          Process PDF(s)
  $0 search <case_number>   Search for case files
  $0 batch <directory>      Process all PDFs in directory

EXAMPLES:
  $0 ~/Downloads/26CV007491-590.pdf
  $0 file1.pdf file2.pdf
  $0 search 26CV007491-590
EOF
        ;;
    search)
        if [[ -n "${2:-}" ]]; then
            find ~/Downloads ~/Documents -name "*$2*" -type f 2>/dev/null
        else
            echo "Usage: $0 search <case_number>"
        fi
        ;;
    batch)
        if [[ -d "${2:-}" ]]; then
            find "$2" -name "*.pdf" -type f | while read -r pdf; do
                main "$pdf"
            done
        else
            echo "Usage: $0 batch <directory>"
        fi
        ;;
    *)
        main "$@"
        ;;
esac
