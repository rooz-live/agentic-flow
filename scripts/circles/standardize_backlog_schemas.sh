#!/bin/bash
# Standardize Backlog Schemas Across All Circles
# Ensures all backlog.md files have WSJF/CoD columns
#
# Usage: ./standardize_backlog_schemas.sh [--dry-run]

set -e

CIRCLES_ROOT="${PROJECT_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}/circles"
DRY_RUN=false

if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=true
    echo "🔍 DRY RUN MODE - No files will be modified"
fi

# Standard WSJF/CoD schema header
STANDARD_HEADER="| ID | Task | Status | Budget | Method Pattern | DoR (Baseline) | DoD (Success Criteria) | CoD | Size | WSJF |
|---|---|---|---|---|---|---|---|---|---|"

echo "🔄 Standardizing backlog schemas across all circles..."
echo ""

# Find all backlog.md files
backlog_files=$(find "$CIRCLES_ROOT" -name "backlog.md" -type f)
total_files=$(echo "$backlog_files" | wc -l | tr -d ' ')
processed=0
updated=0
skipped=0

for backlog in $backlog_files; do
    processed=$((processed + 1))
    circle_path=$(echo "$backlog" | sed "s|$CIRCLES_ROOT/||")
    
    # Check if file already has the standard schema
    if grep -q "| ID | Task | Status | Budget | Method Pattern | DoR (Baseline) | DoD (Success Criteria) | CoD | Size | WSJF |" "$backlog" 2>/dev/null; then
        echo "  ✅ [$processed/$total_files] $circle_path - Already standardized"
        skipped=$((skipped + 1))
        continue
    fi
    
    # Check if file has older schema variants
    has_old_schema=false
    if grep -qE "\| ID \| Task \| Status \|.*DoR.*DoD" "$backlog" 2>/dev/null; then
        has_old_schema=true
    fi
    
    if [ "$has_old_schema" = true ]; then
        echo "  🔧 [$processed/$total_files] $circle_path - Needs update"
        
        if [ "$DRY_RUN" = false ]; then
            # Create backup
            cp "$backlog" "${backlog}.bak"
            
            # Replace old header with standard header
            # This regex matches various old schema formats
            sed -i.tmp '/^| ID | Task | Status |/,/^|---/ {
                /^| ID | Task | Status |/c\
| ID | Task | Status | Budget | Method Pattern | DoR (Baseline) | DoD (Success Criteria) | CoD | Size | WSJF |
                /^|---|/c\
|---|---|---|---|---|---|---|---|---|---|
            }' "$backlog"
            
            rm -f "${backlog}.tmp"
            
            echo "      ✅ Updated (backup: ${backlog}.bak)"
            updated=$((updated + 1))
        else
            echo "      Would update this file"
        fi
    else
        echo "  ⚠️  [$processed/$total_files] $circle_path - No recognizable schema (manual review needed)"
    fi
done

echo ""
echo "="*80
echo "📊 Standardization Summary:"
echo "  Total files: $total_files"
echo "  Already standardized: $skipped"
echo "  Updated: $updated"
echo "  Manual review needed: $((total_files - skipped - updated))"

if [ "$DRY_RUN" = true ]; then
    echo ""
    echo "ℹ️  This was a dry run. Run without --dry-run to apply changes."
fi

echo "="*80
