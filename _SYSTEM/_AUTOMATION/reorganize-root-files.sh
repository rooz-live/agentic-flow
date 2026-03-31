#!/usr/bin/env bash
#
# Reorganize Root Files into DDD/ADR/PRD Structure
#
# Purpose: Move remaining root .md files into proper folders:
# - docs/ADR/ (Architecture Decision Records)
# - docs/DDD/ (Domain-Driven Design)
# - docs/PRD/ (Product Requirements)
# - docs/TDD/ (Test-Driven Development)
# - docs/ROAM/ (ROAM risks)
#
# Usage:
#   ./reorganize-root-files.sh --dry-run    # Show what would be moved
#   ./reorganize-root-files.sh --execute    # Actually move files

set -euo pipefail

BASE_DIR="/Users/shahroozbhopti/Documents/code/investing/agentic-flow"
LOG_FILE="$HOME/Library/Logs/reorganize-root-files.log"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

DRY_RUN=true
if [ "${1:-}" = "--execute" ]; then
    DRY_RUN=false
fi

log "🚀 Starting folder reorganization (DRY_RUN=$DRY_RUN)"

# Create target directories
mkdir -p "$BASE_DIR/docs/ADR"
mkdir -p "$BASE_DIR/docs/DDD"
mkdir -p "$BASE_DIR/docs/PRD"
mkdir -p "$BASE_DIR/docs/TDD"
mkdir -p "$BASE_DIR/docs/ROAM"
mkdir -p "$BASE_DIR/docs/archive"

# File classification rules
declare -A FILE_DESTINATIONS

# ADR (Architecture Decision Records)
FILE_DESTINATIONS=(
    ["DPC_IMPLEMENTATION.md"]="docs/ADR"
    ["IMPLEMENTATION_STATUS.md"]="docs/ADR"
    ["CLEANUP_STRATEGY_GUIDE.md"]="docs/ADR"
    ["AGENTS.md"]="docs/ADR"
    
    # DDD (Domain-Driven Design)
    ["CONSOLIDATION-TRUTH-REPORT.md"]="docs/DDD"
    
    # PRD (Product Requirements)
    ["backlog.md"]="docs/PRD"
    ["EXECUTION_PLAN.md"]="docs/PRD"
    
    # TDD (Test-Driven Development - ROAM risks RED-GREEN-REFACTOR)
    ["CRITICAL_CYCLICITY_EXECUTION.md"]="docs/TDD"
    ["CRITICAL_EXECUTION_STATUS.md"]="docs/TDD"
    
    # ROAM (Risks, Opportunities, Assumptions, Mitigations)
    ["FINAL_EXECUTION_SUMMARY.md"]="docs/ROAM"
    ["IMMEDIATE-ACTION-PLAN-MARCH-5.md"]="docs/ROAM"
    ["EVENING-EXECUTION-MARCH-5.md"]="docs/ROAM"
    
    # Archive (completed/outdated)
    ["CONSULTING-OUTREACH-MARCH-4-2026.md"]="docs/archive"
    ["CHANGELOG.md"]="docs/archive"
    ["CLAUDE.md"]="docs/archive"
)

# Move files
cd "$BASE_DIR"

for file in "${!FILE_DESTINATIONS[@]}"; do
    dest="${FILE_DESTINATIONS[$file]}"
    
    if [ -f "$file" ]; then
        log "📄 $file → $dest/"
        
        if ! $DRY_RUN; then
            mv "$file" "$dest/"
            log "  ✅ Moved"
        else
            log "  [DRY RUN] Would move"
        fi
    else
        log "  ⚠️ File not found: $file"
    fi
done

# Create index files for each directory
create_index() {
    local dir="$1"
    local title="$2"
    local index_file="$dir/README.md"
    
    if $DRY_RUN; then
        log "  [DRY RUN] Would create index: $index_file"
        return
    fi
    
    cat > "$index_file" << EOF
# $title

**Last Updated**: $(date +'%Y-%m-%d %H:%M:%S')

## Files in This Directory

$(ls -1 "$dir"/*.md 2>/dev/null | grep -v README.md | while read f; do
    echo "- [$(basename "$f")](./$(basename "$f"))"
done)

---

**Auto-generated** by reorganize-root-files.sh
EOF
    
    log "  ✅ Created index: $index_file"
}

log ""
log "📚 Creating index files..."

create_index "$BASE_DIR/docs/ADR" "Architecture Decision Records (ADR)"
create_index "$BASE_DIR/docs/DDD" "Domain-Driven Design (DDD)"
create_index "$BASE_DIR/docs/PRD" "Product Requirements (PRD)"
create_index "$BASE_DIR/docs/TDD" "Test-Driven Development (TDD) - Red-Green-Refactor"
create_index "$BASE_DIR/docs/ROAM" "ROAM Risks (Risks, Opportunities, Assumptions, Mitigations)"
create_index "$BASE_DIR/docs/archive" "Archive (Completed/Outdated Documents)"

# Generate summary report
log ""
log "📊 Reorganization Summary"
log "========================"

for dest in "docs/ADR" "docs/DDD" "docs/PRD" "docs/TDD" "docs/ROAM" "docs/archive"; do
    count=$(echo "${!FILE_DESTINATIONS[@]}" | tr ' ' '\n' | while read f; do
        [ "${FILE_DESTINATIONS[$f]}" = "$dest" ] && echo "$f"
    done | wc -l)
    log "  $dest: $count files"
done

if $DRY_RUN; then
    log ""
    log "⚠️ DRY RUN MODE - No files were actually moved"
    log "Run with --execute to actually move files:"
    log "  ./reorganize-root-files.sh --execute"
else
    log ""
    log "✅ Reorganization complete!"
    log "📁 New structure:"
    log "  docs/ADR/     - Architecture Decision Records"
    log "  docs/DDD/     - Domain-Driven Design"
    log "  docs/PRD/     - Product Requirements"
    log "  docs/TDD/     - Test-Driven Development (RED-GREEN-REFACTOR)"
    log "  docs/ROAM/    - ROAM Risks"
    log "  docs/archive/ - Completed/Outdated"
fi
