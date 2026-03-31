#!/bin/bash
# Photo Conversion Script with EXIF Validation
# Converts HEIC → JPG while preserving timestamps for court exhibits

set -euo pipefail

# Configuration
PHOTOS_DIR="${1:-$HOME/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/EVIDENCE_BUNDLE/05_HABITABILITY_EVIDENCE/MOLD-PHOTOS}"
LOG_FILE="$HOME/Documents/code/investing/agentic-flow/reports/photo-conversion-log.txt"

echo "🖼️  MAA Trial #1 - Photo Conversion Script"
echo "=================================="
echo "Directory: $PHOTOS_DIR"
echo "Log: $LOG_FILE"
echo ""

# Check directory exists
if [[ ! -d "$PHOTOS_DIR" ]]; then
    echo "❌ Error: Directory not found: $PHOTOS_DIR"
    exit 1
fi

# Change to photos directory
cd "$PHOTOS_DIR"

# Count HEIC files
heic_count=$(ls -1 *.HEIC 2>/dev/null | wc -l | tr -d ' ')
if [[ "$heic_count" -eq 0 ]]; then
    echo "⚠️  No HEIC files found in $PHOTOS_DIR"
    echo "   Looking for already-converted JPG files..."
    jpg_count=$(ls -1 *.jpg 2>/dev/null | wc -l | tr -d ' ')
    echo "   Found $jpg_count JPG files"
    exit 0
fi

echo "📸 Found $heic_count HEIC files to convert"
echo ""

# Initialize log
echo "Photo Conversion Log - $(date)" > "$LOG_FILE"
echo "Directory: $PHOTOS_DIR" >> "$LOG_FILE"
echo "HEIC files: $heic_count" >> "$LOG_FILE"
echo "---" >> "$LOG_FILE"

# Convert each HEIC file
converted=0
for heic_file in *.HEIC; do
    jpg_file="${heic_file%.HEIC}.jpg"
    
    echo "Converting: $heic_file → $jpg_file"
    
    # Convert with sips (macOS built-in)
    if sips -s format jpeg "$heic_file" --out "$jpg_file" &>/dev/null; then
        # Verify conversion
        if [[ -f "$jpg_file" ]]; then
            # Get file sizes
            heic_size=$(stat -f%z "$heic_file")
            jpg_size=$(stat -f%z "$jpg_file")
            
            # Get creation date (EXIF)
            creation_date=$(mdls -name kMDItemContentCreationDate "$heic_file" | cut -d= -f2 | xargs)
            
            echo "  ✅ Success: $jpg_file (${jpg_size} bytes)"
            echo "     Original: ${heic_size} bytes"
            echo "     Created: $creation_date"
            
            # Log conversion
            echo "✅ $heic_file → $jpg_file" >> "$LOG_FILE"
            echo "   Size: $heic_size → $jpg_size bytes" >> "$LOG_FILE"
            echo "   Date: $creation_date" >> "$LOG_FILE"
            
            ((converted++))
        else
            echo "  ❌ Error: Conversion failed for $jpg_file"
            echo "❌ FAILED: $heic_file" >> "$LOG_FILE"
        fi
    else
        echo "  ❌ Error: sips conversion failed for $heic_file"
        echo "❌ FAILED: $heic_file (sips error)" >> "$LOG_FILE"
    fi
    
    echo ""
done

# Summary
echo "=================================="
echo "✅ Conversion Complete"
echo "   Converted: $converted / $heic_count files"
echo "   Log saved: $LOG_FILE"
echo ""

# EXIF validation summary
echo "📊 EXIF Validation Summary"
echo "---"
jpg_count=$(ls -1 *.jpg 2>/dev/null | wc -l | tr -d ' ')
echo "Total JPG files: $jpg_count"

# Get date range
if [[ "$jpg_count" -gt 0 ]]; then
    oldest=$(ls -lt *.jpg | tail -1 | awk '{print $9}')
    newest=$(ls -lt *.jpg | head -1 | awk '{print $9}')
    
    oldest_date=$(mdls -name kMDItemContentCreationDate "$oldest" | cut -d= -f2 | xargs)
    newest_date=$(mdls -name kMDItemContentCreationDate "$newest" | cut -d= -f2 | xargs)
    
    echo "Date range: $oldest_date → $newest_date"
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Review converted photos: open $PHOTOS_DIR"
echo "2. Select 10 strongest photos for Exhibit A"
echo "3. Print 3 copies for court submission"
echo "4. Label each photo with date/location"

exit 0
