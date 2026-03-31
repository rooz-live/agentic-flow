#!/usr/bin/env bash
# capability-extractor.sh
# Extracts all capabilities from dashboard files for consolidation
# Generates unified capability matrix before re-implementation

set -euo pipefail

DASHBOARD_DIR="/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/00-DASHBOARD"
TMP_DIR="/private/tmp"
OUTPUT_DIR="/Users/shahroozbhopti/Documents/code/investing/agentic-flow/capability-extraction"

mkdir -p "$OUTPUT_DIR"

echo "=== DASHBOARD CAPABILITY EXTRACTION ==="
echo "Discover/Consolidate THEN extend"
echo ""

# Find all dashboard files
echo "📁 Scanning for dashboard files..."
find "$DASHBOARD_DIR" "$TMP_DIR" -name "*.html" -type f 2>/dev/null | grep -E "(WSJF|movers|thumbtack|coordinator)" | sort > "$OUTPUT_DIR/dashboard-files.txt"

echo "Found $(wc -l < "$OUTPUT_DIR/dashboard-files.txt") dashboard files"
echo ""

# Extract JavaScript functions from each dashboard
echo "🔍 Extracting JavaScript capabilities..."
while IFS= read -r file; do
    echo "  Processing: $(basename "$file")"
    # Extract function names
    grep -oE "function [a-zA-Z_][a-zA-Z0-9_]*" "$file" 2>/dev/null | sed 's/function //' >> "$OUTPUT_DIR/all-functions.txt"
done < "$OUTPUT_DIR/dashboard-files.txt"

# Sort and deduplicate functions
sort "$OUTPUT_DIR/all-functions.txt" | uniq -c | sort -rn > "$OUTPUT_DIR/function-frequency.txt"

echo ""
echo "=== CAPABILITY MATRIX ==="
echo ""
echo "Most Common Functions (cross-dashboard):"
head -20 "$OUTPUT_DIR/function-frequency.txt"

echo ""
echo "=== DASHBOARD VERSION COMPARISON ==="
echo ""

# Compare V2 vs V3 vs V4 capabilities
echo "V2-FULL.html functions:"
grep -oE "function [a-zA-Z_][a-zA-Z0-9_]*" "$DASHBOARD_DIR/WSJF-LIVE-V2-FULL.html" 2>/dev/null | sed 's/function //' | sort > "$OUTPUT_DIR/v2-functions.txt"

echo "V4-INTERACTIVE.html functions:"
grep -oE "function [a-zA-Z_][a-zA-Z0-9_]*" "$DASHBOARD_DIR/WSJF-LIVE-V4-INTERACTIVE.html" 2>/dev/null | sed 's/function //' | sort > "$OUTPUT_DIR/v4-functions.txt"

echo ""
echo "V2 ONLY (missing in V4):"
comm -23 "$OUTPUT_DIR/v2-functions.txt" "$OUTPUT_DIR/v4-functions.txt" 2>/dev/null || echo "  (comparison requires both files)"

echo ""
echo "V4 ONLY (new in V4):"
comm -13 "$OUTPUT_DIR/v2-functions.txt" "$OUTPUT_DIR/v4-functions.txt" 2>/dev/null || echo "  (comparison requires both files)"

echo ""
echo "=== FEATURE FLAGS & DESIGN ELEMENTS ==="
echo ""

# Extract feature flags
grep -oE "Feature #[0-9]+|feature-[a-z]+|data-[a-z]+" "$DASHBOARD_DIR"/WSJF-LIVE-*.html 2>/dev/null | sort | uniq -c | sort -rn | head -20

echo ""
echo "=== HIERARCHICAL MESH STRUCTURE ==="
echo ""

# Build navigation hierarchy
echo "Navigation Elements Found:"
grep -oE "href=\"[^\"]+\"|onclick=\"[^\"]+\"" "$DASHBOARD_DIR"/WSJF-LIVE-V4-INTERACTIVE.html 2>/dev/null | grep -v "^$" | head -30

echo ""
echo "=== OUTPUT FILES ==="
echo "  $OUTPUT_DIR/dashboard-files.txt"
echo "  $OUTPUT_DIR/function-frequency.txt"
echo "  $OUTPUT_DIR/v2-functions.txt"
echo "  $OUTPUT_DIR/v4-functions.txt"
echo ""
echo "Extraction complete. Review before consolidation."
