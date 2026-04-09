#!/bin/bash

#
# Pattern Metrics Migration Script
# P1-TIME: Backfills semantic context (rationale) for existing pattern_metrics.jsonl entries
#

set -e

# Configuration
LOG_DIR="${LOG_DIR:-.goalie/logs}"
BACKUP_DIR="${LOG_DIR}/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Pattern log files to migrate
PATTERN_FILES=(
  "learning_evidence.jsonl"
  "compounding_benefits.jsonl"
  "pattern_hits.jsonl"
  "tier_depth_coverage.jsonl"
)

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print usage
usage() {
  echo "Usage: $0 [OPTIONS]"
  echo ""
  echo "Migrate pattern metrics JSONL files to include semantic context fields."
  echo ""
  echo "Options:"
  echo "  -d, --log-dir DIR    Log directory (default: .goalie/logs)"
  echo "  -n, --dry-run        Show what would be done without making changes"
  echo "  -h, --help           Show this help message"
  echo ""
  echo "This script:"
  echo "  1. Creates backups of existing pattern metrics files"
  echo "  2. Adds 'rationale' field with human-readable explanations"
  echo "  3. Adds 'decision_context' field with governance information"
  echo "  4. Adds 'roam_reference' field (empty by default)"
  echo "  5. Maintains backward compatibility with existing entries"
  exit 0
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    -d|--log-dir)
      LOG_DIR="$2"
      shift 2
      ;;
    -n|--dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      usage
      ;;
    *)
      shift
      ;;
  esac
done

# Ensure log directory exists
if [[ ! -d "$LOG_DIR" ]]; then
  echo -e "${RED}Error: Log directory does not exist: $LOG_DIR${NC}"
  exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo -e "${GREEN}=== Pattern Metrics Migration Script ===${NC}"
echo -e "Log directory: $LOG_DIR"
echo -e "Backup directory: $BACKUP_DIR"
echo ""

# Function to generate rationale based on pattern type and data
generate_rationale() {
  local pattern_type="$1"
  local timestamp="$2"
  local data_keys="$3"
  
  case "$pattern_type" in
    learning_evidence)
      echo "Learning evidence captured at $timestamp. Tracks data quality and completeness metrics for governance assessment."
      ;;
    compounding_benefits)
      echo "Economic compounding evidence logged at $timestamp. Tracks cost-benefit analysis and WSJF metrics for governance decisions."
      ;;
    pattern_hit)
      echo "Pattern detection event at $timestamp. Validates pattern recognition confidence and frequency tracking ($data_keys)."
      ;;
    tier_depth_coverage)
      echo "Maturity coverage evidence logged at $timestamp. Tracks tier depth and coverage percentage for graduation assessment."
      ;;
    *)
      echo "Pattern $pattern_type triggered at $timestamp with data: $data_keys."
      ;;
  esac
}

# Function to generate decision context
generate_decision_context() {
  local pattern_type="$1"
  
  echo "{\"circle\":\"system-optimization\",\"purpose\":\"$pattern_type\",\"domain\":\"technical-operations\",\"triggering_event\":\"migration_script\"}"
}

# Function to migrate a single file
migrate_file() {
  local file="$1"
  local filepath="$LOG_DIR/$file"
  local backup_file="$BACKUP_DIR/${file%.jsonl}_${TIMESTAMP}.jsonl"
  
  if [[ ! -f "$filepath" ]]; then
    echo -e "${YELLOW}Skipping: $file (not found)${NC}"
    return
  fi
  
  echo -e "Processing: $file"
  
  # Count entries
  local total_entries=$(wc -l < "$filepath" 2>/dev/null || echo "0")
  local migrated=0
  local skipped=0
  
  # Create temporary file for migration
  local temp_file="${filepath}.tmp"
  
  # Process each line
  while IFS= read -r line; do
    # Skip empty lines
    [[ -z "$line" ]] && continue
    
    # Check if already has semantic context
    if echo "$line" | grep -q '"rationale"'; then
      # Already has semantic context, skip
      ((skipped++))
      echo "$line" >> "$temp_file"
    else
      # Add semantic context
      local timestamp=$(echo "$line" | grep -o '"timestamp":"[^"]*"' | sed 's/"timestamp":"\([^"]*\)"/\1/')
      local pattern_type=$(echo "$line" | grep -o '"pattern_type":"[^"]*"' | sed 's/"pattern_type":"\([^"]*\)"/\1/')
      local data_keys=$(echo "$line" | sed 's/{[^}]*}//g' | head -c 100)
      
      local rationale=$(generate_rationale "$pattern_type" "$timestamp" "$data_keys")
      local decision_context=$(generate_decision_context "$pattern_type")
      
      # Add semantic context to the line
      local migrated_line=$(echo "$line" | sed 's/}$/,"rationale":"'"$rationale"'","decision_context":'"$decision_context"',"roam_reference":""}/')
      echo "$migrated_line" >> "$temp_file"
      ((migrated++))
    fi
  done < "$filepath"
  
  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "${YELLOW}[DRY RUN] Would migrate $migrated entries, skip $skipped entries${NC}"
    rm -f "$temp_file"
  else
    # Backup original file
    cp "$filepath" "$backup_file"
    echo -e "${GREEN}✓ Backup created: $backup_file${NC}"
    
    # Replace original with migrated file
    mv "$temp_file" "$filepath"
    echo -e "${GREEN}✓ Migrated: $migrated entries${NC}"
    echo -e "${GREEN}✓ Skipped: $skipped entries (already had semantic context)${NC}"
  fi
}

# Main migration process
main() {
  echo -e "${GREEN}Starting migration...${NC}"
  
  # Process each pattern file
  for file in "${PATTERN_FILES[@]}"; do
    migrate_file "$file"
  done
  
  echo ""
  echo -e "${GREEN}=== Migration Complete ===${NC}"
  echo -e "Backups stored in: $BACKUP_DIR"
  echo -e "Review backups before deleting them."
  echo ""
  echo -e "${YELLOW}To restore from backup:${NC}"
  echo "  cp $BACKUP_DIR/<file>_<timestamp>.jsonl $LOG_DIR/"
}

# Run main function
main
