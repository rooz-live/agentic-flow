#!/bin/bash
set -euo pipefail

# DDD/ADR/PRD/TDD Folder Structure Organizer
# Reorganizes root files into domain-driven design patterns with ROAM risk mapping

BASE_DIR="${1:-$HOME/Documents/code/investing/agentic-flow}"
DRY_RUN="${2:-true}" # Set to 'false' to actually move files

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

# Create DDD structure
create_ddd_structure() {
  local base="$1"
  
  log "Creating DDD folder structure in $base..."
  
  # Core DDD folders
  mkdir -p "$base/docs/ADR"              # Architecture Decision Records
  mkdir -p "$base/docs/PRD"              # Product Requirements Documents
  mkdir -p "$base/docs/DDD"              # Domain-Driven Design docs
  mkdir -p "$base/docs/ROAM"             # ROAM Risk Management
  
  # ROAM risk categories
  mkdir -p "$base/docs/ROAM/RED"         # Resolve (blocking issues)
  mkdir -p "$base/docs/ROAM/YELLOW"      # Own (tracked, not blocking)
  mkdir -p "$base/docs/ROAM/GREEN"       # Accept (acknowledged)
  mkdir -p "$base/docs/ROAM/BLUE"        # Mitigate (backup plans)
  
  # TDD folders
  mkdir -p "$base/tests/unit"            # Unit tests
  mkdir -p "$base/tests/integration"     # Integration tests
  mkdir -p "$base/tests/e2e"             # End-to-end tests
  
  # Email archives
  mkdir -p "$base/docs/emails/sent"      # Sent .eml files
  mkdir -p "$base/docs/emails/received"  # Received .eml files
  mkdir -p "$base/docs/emails/drafts"    # Draft .eml files
  
  log "✅ Structure created"
}

# Organize root markdown files
organize_markdown_files() {
  local base="$1"
  local dry_run="$2"
  
  log "Organizing markdown files..."
  
  # Find all .md files in root
  find "$base" -maxdepth 1 -type f -name "*.md" | while read -r file; do
    local filename=$(basename "$file")
    local target=""
    
    # Classify by naming pattern
    case "$filename" in
      *ADR*|*DECISION*|*ARCHITECTURE*)
        target="$base/docs/ADR/$filename"
        ;;
      *PRD*|*PRODUCT*|*REQUIREMENTS*)
        target="$base/docs/PRD/$filename"
        ;;
      *DDD*|*DOMAIN*|*BOUNDED*)
        target="$base/docs/DDD/$filename"
        ;;
      *RISK*|*ROAM*)
        # Further classify by risk level
        if grep -qi "RED\|BLOCK\|URGENT\|EMERGENCY" "$file"; then
          target="$base/docs/ROAM/RED/$filename"
        elif grep -qi "YELLOW\|DEADLINE\|WATCH" "$file"; then
          target="$base/docs/ROAM/YELLOW/$filename"
        elif grep -qi "GREEN\|ACCEPT\|ACKNOWLEDGE" "$file"; then
          target="$base/docs/ROAM/GREEN/$filename"
        else
          target="$base/docs/ROAM/BLUE/$filename"
        fi
        ;;
      *SWARM*|*ORCHESTR*|*MULTI*)
        target="$base/docs/DDD/$filename"
        ;;
      *TEST*|*TDD*|*SPEC*)
        target="$base/tests/$filename"
        ;;
      *)
        log "SKIP: $filename (no category match)"
        continue
        ;;
    esac
    
    if [ -n "$target" ]; then
      if [ "$dry_run" = "false" ]; then
        mv "$file" "$target"
        log "MOVED: $filename → $target"
      else
        log "DRY RUN: $filename → $target"
      fi
    fi
  done
}

# Organize email files
organize_email_files() {
  local base="$1"
  local dry_run="$2"
  
  log "Organizing email files..."
  
  # Find all .eml files
  find "$base" -type f -name "*.eml" | while read -r file; do
    local filename=$(basename "$file")
    local target=""
    
    # Check if it's a sent email
    if grep -qi "^X-Mailer:\|^Message-ID:" "$file" && grep -qi "^To:" "$file"; then
      target="$base/docs/emails/sent/$filename"
    elif grep -qi "^From:" "$file"; then
      target="$base/docs/emails/received/$filename"
    else
      target="$base/docs/emails/drafts/$filename"
    fi
    
    if [ -n "$target" ]; then
      if [ "$dry_run" = "false" ]; then
        mv "$file" "$target"
        log "MOVED: $filename → $target"
      else
        log "DRY RUN: $filename → $target"
      fi
    fi
  done
}

# Create README files for each folder
create_readme_files() {
  local base="$1"
  local dry_run="$2"
  
  [ "$dry_run" = "true" ] && return
  
  log "Creating README files..."
  
  # ADR README
  cat > "$base/docs/ADR/README.md" <<'EOF'
# Architecture Decision Records (ADR)

Documents significant architectural decisions and their context.

## Naming Convention
`ADR-NNNN-title-of-decision.md`

## Template
```
# ADR-NNNN: [Title]

Date: YYYY-MM-DD
Status: [Proposed | Accepted | Deprecated | Superseded]

## Context
What forces led to this decision?

## Decision
What was decided?

## Consequences
What are the trade-offs?
```
EOF

  # PRD README
  cat > "$base/docs/PRD/README.md" <<'EOF'
# Product Requirements Documents (PRD)

Defines product features, user stories, and acceptance criteria.

## Naming Convention
`PRD-feature-name-YYYY-MM-DD.md`

## Template
- Problem Statement
- User Stories
- Acceptance Criteria
- Success Metrics
- WSJF Score
EOF

  # ROAM README
  cat > "$base/docs/ROAM/README.md" <<'EOF'
# ROAM Risk Management

**R**esolve | **O**wn | **A**ccept | **M**itigate

## Folder Structure
- `RED/` - Blocking issues (Resolve immediately)
- `YELLOW/` - Tracked issues (Own the outcome)
- `GREEN/` - Acknowledged issues (Accept the risk)
- `BLUE/` - Backup plans (Mitigate with alternatives)

## WSJF Integration
- RED risks → WSJF 40-50 (highest priority)
- YELLOW risks → WSJF 30-40
- GREEN risks → WSJF 20-30
- BLUE risks → WSJF 10-20
EOF

  log "✅ README files created"
}

# Main execution
log "Starting DDD folder structure organization..."
log "Base directory: $BASE_DIR"
log "Dry run: $DRY_RUN"

create_ddd_structure "$BASE_DIR"
organize_markdown_files "$BASE_DIR" "$DRY_RUN"
organize_email_files "$BASE_DIR" "$DRY_RUN"
create_readme_files "$BASE_DIR" "$DRY_RUN"

log "✅ Organization complete!"

if [ "$DRY_RUN" = "true" ]; then
  log ""
  log "This was a DRY RUN. No files were moved."
  log "Run with: $0 $BASE_DIR false"
fi
