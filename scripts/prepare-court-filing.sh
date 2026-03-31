#!/bin/bash
# Court Filing Preparation for 26CV007491-590
# Output: Print-ready documents + filing checklist

set -euo pipefail

PROJECT_ROOT="/Users/shahroozbhopti/Documents/code/investing/agentic-flow"
COURT_DIR="$PROJECT_ROOT/legal/eviction_26CV007491"
OUTPUT_DIR="$COURT_DIR/COURT-READY"

mkdir -p "$OUTPUT_DIR"

echo "=== COURT FILING PREPARATION ==="
echo "Case: 26CV007491-590"
echo ""

# Convert MD to formatted documents
convert_to_court_format() {
    local input_file="$1"
    local output_name="$2"
    
    echo "Converting: $(basename $input_file)"
    
    # Create court-formatted version
    cat > "$OUTPUT_DIR/$output_name.txt" << COURTHEADER
IN THE GENERAL COURT OF JUSTICE
DISTRICT COURT DIVISION
MECKLENBURG COUNTY

FILE NO. 26CV007491-590

$(echo "$(basename $input_file .md)" | tr '[:lower:]' '[:upper:]')

COURTHEADER
    
    # Add content (strip markdown headers)
    tail -n +5 "$input_file" >> "$OUTPUT_DIR/$output_name.txt"
    
    echo "  ✓ Created: $output_name.txt"
}

# Process each document
convert_to_court_format "$COURT_DIR/01_ANSWER.md" "ANSWER-26CV007491-590"
convert_to_court_format "$COURT_DIR/02_MOTION_TO_CONSOLIDATE.md" "MOTION-TO-CONSOLIDATE-26CV007491-590"
convert_to_court_format "$COURT_DIR/03_COUNTERCLAIM.md" "COUNTERCLAIM-26CV007491-590"

echo ""
echo "=== FILING CHECKLIST ==="
cat << 'CHECKLIST'
□ Print 3 copies of each document:
   - Original (for court)
   - Copy for opposing counsel
   - Copy for your records

□ File with Clerk:
   Mecklenburg County Clerk of Court
   832 E 4th St, Charlotte, NC 28202
   Hours: Monday-Friday 8:00 AM - 5:00 PM

□ Filing fee: Check current fee schedule
   (Pro se litigants may request waiver)

□ Serve on Opposing Counsel:
   Ryan Mumper
   Ryan Mumper & Brownlee, PLLC
   PO Box 30247
   Charlotte, NC 28230
   (704) 970-3900

□ Deadline: Before hearing date (check calendar)

□ Bring to hearing:
   - Filed copies with stamp
   - Evidence bundle
   - Timeline documentation
CHECKLIST

echo ""
echo "=== VERIFICATION ==="
ls -la "$OUTPUT_DIR/"
