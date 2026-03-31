#!/bin/bash
# Standardize Circle Backlog Schemas with CoD/WSJF
# Usage: ./standardize_backlogs.sh [--dry-run]

set -euo pipefail

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
    DRY_RUN=true
    echo "🔍 DRY RUN MODE - No files will be modified"
fi

CIRCLES_ROOT="circles"
BACKUP_DIR=".backlog-backups-$(date +%Y%m%d-%H%M%S)"

# Standard schema header
STANDARD_HEADER="| ID | Task | Status | Budget | Method Pattern | DoR | DoD | CoD | Size | WSJF |
|---|---|---|---|---|---|---|---|---|---|"

# Function to standardize a backlog file
standardize_backlog() {
    local file="$1"
    local circle_name=$(echo "$file" | sed 's|.*/circles/\([^/]*\)/.*|\1|')
    local role_name=$(basename "$(dirname "$file")")
    
    echo "  📋 Processing: $circle_name/$role_name"
    
    # Read current content
    local content
    content=$(cat "$file")
    
    # Check if already has WSJF column
    if grep -q "| WSJF |" "$file"; then
        echo "    ✅ Already standardized"
        return 0
    fi
    
    # Backup original
    if [[ "$DRY_RUN" == false ]]; then
        mkdir -p "$BACKUP_DIR/$(dirname "$file")"
        cp "$file" "$BACKUP_DIR/$file"
    fi
    
    # Determine current format and convert
    if grep -q "^| ID |" "$file"; then
        # Has table format - needs column addition
        echo "    🔧 Upgrading existing table"
        
        if [[ "$DRY_RUN" == false ]]; then
            # Replace header
            sed -i '' '
                /^| ID |/,/^|---|/ {
                    /^| ID |/ {
                        c\
| ID | Task | Status | Budget | Method Pattern | DoR | DoD | CoD | Size | WSJF |
                        n
                    }
                    /^|---|/ {
                        c\
|---|---|---|---|---|---|---|---|---|---|
                    }
                }
            ' "$file"
            
            # Extend data rows with empty columns
            sed -i '' '/^| [A-Z].*|.*|.*|/ {
                s/|$/| | | | | |/
            }' "$file"
        fi
    elif grep -q "^## Current" "$file" || grep -q "^- \[ \]" "$file"; then
        # Simple list format - convert to table
        echo "    🆕 Converting to table format"
        
        if [[ "$DRY_RUN" == false ]]; then
            {
                echo "# $role_name Backlog"
                echo ""
                echo "$STANDARD_HEADER"
                echo "| ${circle_name^^}-001 | Example: Define initial task | PENDING | OpEx | TDD | [ ] Baseline defined | [ ] Success verified | 3 | 1 | 3.0 |"
            } > "$file"
        fi
    else
        echo "    ⚠️  Unknown format - manual review needed"
    fi
}

# Main execution
main() {
    echo "🎯 Standardizing Circle Backlogs with CoD/WSJF Schema"
    echo "=================================================="
    
    # Find all backlog.md files
    local backlog_files
    backlog_files=$(find "$CIRCLES_ROOT" -name "backlog.md" -type f)
    
    local count=0
    while IFS= read -r file; do
        standardize_backlog "$file"
        ((count++))
    done <<< "$backlog_files"
    
    echo ""
    echo "=================================================="
    echo "✨ Processed $count backlog files"
    
    if [[ "$DRY_RUN" == false ]]; then
        echo "📦 Backups saved to: $BACKUP_DIR"
        echo ""
        echo "Next steps:"
        echo "  1. Review changes: git diff circles/"
        echo "  2. Test replenishment: ./scripts/circles/replenish_circle.sh analyst"
        echo "  3. Commit: git add circles/ && git commit -m 'feat: standardize backlog schemas with CoD/WSJF'"
    else
        echo "🔍 Run without --dry-run to apply changes"
    fi
}

main "$@"
