#!/usr/bin/env bash
set -euo pipefail

# Post-Move Folder Restructuring Script
# 
# Purpose: Organize root MAA files into DDD/ADR/PRD/TDD/ROAM structure
# Run: After successful move on March 7, 2026
#
# Structure:
#   /DDD/           - Domain-Driven Design docs
#   /ADR/           - Architecture Decision Records
#   /PRD/           - Product Requirements Documents
#   /TDD/           - Test-Driven Development docs
#   /ROAM/          - Risk matrices (Resolved/Owned/Accepted/Mitigated)
#   /SENT/          - Sent emails (central location)
#   /RECEIVED/      - Received emails (central location)

MAA_ROOT="$HOME/Documents/Personal/CLT/MAA"
DRY_RUN="${1:-true}" # Default to dry-run mode

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $*"; }
success() { echo -e "${GREEN}[✓]${NC} $*"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*"; }

# File patterns for each category
declare -A FILE_PATTERNS=(
  ["DDD"]="*-DOMAIN-*.md *-BOUNDED-CONTEXT-*.md *-AGGREGATE-*.md *-ENTITY-*.md *-VALUE-OBJECT-*.md"
  ["ADR"]="ADR-*.md *-DECISION-*.md *-ARCHITECTURE-*.md CONSOLIDATION-*.md"
  ["PRD"]="PRD-*.md *-REQUIREMENTS-*.md *-SPEC-*.md *-FEATURE-*.md"
  ["TDD"]="*-TEST-*.md *-COVERAGE-*.md *-INTEGRATION-*.md *-UNIT-*.md RED-GREEN-REFACTOR-*.md"
  ["ROAM"]="*-RISK-*.md *-ROAM-*.md WSJF-*.md *-ESCALATION-*.md"
)

# Create directory structure
create_directories() {
  log "Creating directory structure..."
  
  local dirs=("DDD" "ADR" "PRD" "TDD" "ROAM" "SENT" "RECEIVED")
  
  for dir in "${dirs[@]}"; do
    local target="$MAA_ROOT/$dir"
    
    if [ "$DRY_RUN" = "false" ]; then
      mkdir -p "$target"
      success "Created: $target"
    else
      log "Would create: $target"
    fi
  done
}

# Move files matching patterns
move_files() {
  local category="$1"
  local patterns="${FILE_PATTERNS[$category]}"
  local target_dir="$MAA_ROOT/$category"
  
  log "Processing $category files..."
  
  local moved_count=0
  
  # Search root MAA directory only (not nested)
  for pattern in $patterns; do
    while IFS= read -r file; do
      # Skip if file is already in target directory
      if [[ "$(dirname "$file")" == "$target_dir" ]]; then
        continue
      fi
      
      # Skip if file is in a subdirectory (we only want root files)
      if [[ "$(dirname "$file")" != "$MAA_ROOT" ]]; then
        continue
      fi
      
      local basename=$(basename "$file")
      local target_path="$target_dir/$basename"
      
      # Check for conflicts
      if [ -f "$target_path" ]; then
        warn "Conflict: $target_path already exists (skipping)"
        continue
      fi
      
      if [ "$DRY_RUN" = "false" ]; then
        mv "$file" "$target_path"
        success "Moved: $basename → $category/"
      else
        log "Would move: $basename → $category/"
      fi
      
      ((moved_count++))
    done < <(find "$MAA_ROOT" -maxdepth 1 -type f -name "$pattern" 2>/dev/null || true)
  done
  
  if [ $moved_count -eq 0 ]; then
    log "No $category files found to move"
  else
    success "Moved $moved_count $category files"
  fi
}

# Consolidate SENT folders
consolidate_sent() {
  log "Consolidating SENT folders..."
  
  local sent_dirs=(
    "$MAA_ROOT/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-26CV005596-590/CORRESPONDENCE/OUTBOUND/01-OPPOSING-COUNSEL/SENT"
    "$MAA_ROOT/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-26CV005596-590/CORRESPONDENCE/OUTBOUND/04-SETTLEMENT-OFFERS/SENT"
    "$MAA_ROOT/Uptown/BHOPTI-LEGAL/11-ADVOCACY-PIPELINE/TIER-5-DIGITAL/Email/SENT"
  )
  
  local target="$MAA_ROOT/SENT"
  local moved_count=0
  
  for sent_dir in "${sent_dirs[@]}"; do
    if [ ! -d "$sent_dir" ]; then
      continue
    fi
    
    while IFS= read -r file; do
      local basename=$(basename "$file")
      local target_path="$target/$basename"
      
      # Add timestamp prefix if conflict
      if [ -f "$target_path" ]; then
        local timestamp=$(stat -f %m "$file" 2>/dev/null || stat -c %Y "$file" 2>/dev/null)
        target_path="$target/${timestamp}-${basename}"
      fi
      
      if [ "$DRY_RUN" = "false" ]; then
        mv "$file" "$target_path"
        success "Moved: $basename → SENT/"
      else
        log "Would move: $basename → SENT/"
      fi
      
      ((moved_count++))
    done < <(find "$sent_dir" -type f -name "*.eml" 2>/dev/null || true)
  done
  
  success "Consolidated $moved_count sent emails"
}

# Consolidate RECEIVED folders
consolidate_received() {
  log "Consolidating RECEIVED folders..."
  
  local received_dirs=(
    "$MAA_ROOT/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-26CV005596-590/CORRESPONDENCE/INBOUND"
  )
  
  local target="$MAA_ROOT/RECEIVED"
  local moved_count=0
  
  for received_dir in "${received_dirs[@]}"; do
    if [ ! -d "$received_dir" ]; then
      continue
    fi
    
    while IFS= read -r file; do
      local basename=$(basename "$file")
      local target_path="$target/$basename"
      
      # Add timestamp prefix if conflict
      if [ -f "$target_path" ]; then
        local timestamp=$(stat -f %m "$file" 2>/dev/null || stat -c %Y "$file" 2>/dev/null)
        target_path="$target/${timestamp}-${basename}"
      fi
      
      if [ "$DRY_RUN" = "false" ]; then
        mv "$file" "$target_path"
        success "Moved: $basename → RECEIVED/"
      else
        log "Would move: $basename → RECEIVED/"
      fi
      
      ((moved_count++))
    done < <(find "$received_dir" -type f -name "*.eml" 2>/dev/null || true)
  done
  
  success "Consolidated $moved_count received emails"
}

# Generate summary report
generate_report() {
  log "Generating restructuring report..."
  
  local report_file="$MAA_ROOT/FOLDER-RESTRUCTURE-REPORT-$(date +%Y%m%d-%H%M%S).md"
  
  cat > "$report_file" << EOF
# Folder Restructuring Report

**Generated**: $(date +"%Y-%m-%d %H:%M:%S %Z")
**Mode**: $([ "$DRY_RUN" = "false" ] && echo "LIVE" || echo "DRY-RUN")

## Directory Structure

\`\`\`
$MAA_ROOT/
├── DDD/           - Domain-Driven Design docs
├── ADR/           - Architecture Decision Records
├── PRD/           - Product Requirements Documents
├── TDD/           - Test-Driven Development docs
├── ROAM/          - Risk matrices
├── SENT/          - Sent emails (central location)
└── RECEIVED/      - Received emails (central location)
\`\`\`

## File Counts

EOF

  for category in "${!FILE_PATTERNS[@]}"; do
    local count=$(find "$MAA_ROOT/$category" -type f 2>/dev/null | wc -l | tr -d ' ')
    echo "- **$category**: $count files" >> "$report_file"
  done
  
  echo "" >> "$report_file"
  echo "- **SENT**: $(find "$MAA_ROOT/SENT" -type f 2>/dev/null | wc -l | tr -d ' ') emails" >> "$report_file"
  echo "- **RECEIVED**: $(find "$MAA_ROOT/RECEIVED" -type f 2>/dev/null | wc -l | tr -d ' ') emails" >> "$report_file"
  
  cat >> "$report_file" << EOF

## Integration

### Validator #12 Updates

Update \`wsjf-roam-escalator.ts\` to watch new paths:

\`\`\`typescript
const SENT_DIRS = [
  join(process.env.HOME!, 'Documents/Personal/CLT/MAA/SENT')
];
const RECEIVED_DIRS = [
  join(process.env.HOME!, 'Documents/Personal/CLT/MAA/RECEIVED')
];
\`\`\`

### Pre-Send Email Validator

Update \`validate-email-pre-send.sh\`:

\`\`\`bash
SENT_DIR="\$MAA_ROOT/SENT"
RECEIVED_DIR="\$MAA_ROOT/RECEIVED"
\`\`\`

## Next Steps

1. ✅ Verify file locations in new directories
2. ✅ Update Validator #12 configuration
3. ✅ Update pre-send email validator
4. ✅ Test email→WSJF→ROAM escalation flow
5. ✅ Commit folder structure to git

---
*Generated by restructure-folders-post-move.sh*
EOF

  success "Report generated: $report_file"
  
  # Print summary
  echo ""
  log "📊 Restructuring Summary"
  cat "$report_file" | grep -A 20 "## File Counts"
}

# Main execution
main() {
  echo ""
  log "🚀 Post-Move Folder Restructuring"
  echo ""
  
  if [ "$DRY_RUN" = "false" ]; then
    warn "🔴 LIVE MODE - Files will be moved!"
    warn "Press Ctrl+C within 5 seconds to cancel..."
    sleep 5
  else
    log "🟡 DRY-RUN MODE - No files will be moved"
    log "Run with './restructure-folders-post-move.sh false' to execute"
  fi
  
  echo ""
  
  # Create directories
  create_directories
  
  echo ""
  
  # Move files by category
  for category in "${!FILE_PATTERNS[@]}"; do
    move_files "$category"
  done
  
  echo ""
  
  # Consolidate sent/received emails
  consolidate_sent
  consolidate_received
  
  echo ""
  
  # Generate report
  generate_report
  
  echo ""
  
  if [ "$DRY_RUN" = "false" ]; then
    success "✅ Folder restructuring complete!"
  else
    log "✅ Dry-run complete - review and run with 'false' to execute"
  fi
}

main "$@"
