#!/usr/bin/env bash
# wsjf_interactive.sh
# 
# Interactive WSJF (Weighted Shortest Job First) calculation with CoD prompts
# 
# CoD (Cost of Delay) = User/Business Value + Time Criticality + Risk Reduction/Opportunity Enablement
# WSJF = CoD / Job Size
#
# Usage: ./scripts/circles/wsjf_interactive.sh <backlog.md> [--batch]

set -euo pipefail

BACKLOG_FILE="${1:-}"
BATCH_MODE="${2:-}"

if [ -z "$BACKLOG_FILE" ]; then
  echo "Usage: $0 <backlog.md> [--batch]"
  exit 1
fi

if [ ! -f "$BACKLOG_FILE" ]; then
  echo "Error: Backlog file not found: $BACKLOG_FILE"
  exit 1
fi

# Colors
BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BOLD}=== WSJF Interactive Calculator ===${NC}"
echo -e "Backlog: ${BLUE}$BACKLOG_FILE${NC}"
echo

# Extract items without WSJF scores
ITEMS_WITHOUT_WSJF=$(grep -E '^\| ' "$BACKLOG_FILE" | grep -v '| WSJF |' | grep -v '^| ---' | grep -v '^| Item' || true)

if [ -z "$ITEMS_WITHOUT_WSJF" ]; then
  echo -e "${GREEN}✓ All items have WSJF scores${NC}"
  exit 0
fi

echo "Found items needing WSJF calculation:"
echo "$ITEMS_WITHOUT_WSJF" | nl
echo

# Function to prompt for score (1-10)
prompt_score() {
  local prompt="$1"
  local default="${2:-5}"
  local score=""
  
  if [ "$BATCH_MODE" = "--batch" ]; then
    score=$default
  else
    read -p "$prompt (1-10, default $default): " score
    score="${score:-$default}"
  fi
  
  # Validate
  if ! [[ "$score" =~ ^[0-9]+$ ]] || [ "$score" -lt 1 ] || [ "$score" -gt 10 ]; then
    echo -e "${YELLOW}Invalid score, using default: $default${NC}"
    score=$default
  fi
  
  echo "$score"
}

# Process each item
TEMP_FILE=$(mktemp)
cp "$BACKLOG_FILE" "$TEMP_FILE"

echo "$ITEMS_WITHOUT_WSJF" | while IFS= read -r line; do
  # Extract item name (assumes format: | Item Name | ... |)
  ITEM_NAME=$(echo "$line" | awk -F'|' '{print $2}' | xargs)
  
  if [ -z "$ITEM_NAME" ]; then
    continue
  fi
  
  echo -e "\n${BOLD}Item: ${BLUE}$ITEM_NAME${NC}"
  echo "---"
  
  # CoD Component 1: User/Business Value
  echo -e "${YELLOW}User/Business Value:${NC}"
  echo "  1-3: Nice to have"
  echo "  4-6: Important improvement"
  echo "  7-8: Significant value"
  echo "  9-10: Critical business impact"
  USER_VALUE=$(prompt_score "Score" 5)
  
  # CoD Component 2: Time Criticality
  echo -e "${YELLOW}Time Criticality:${NC}"
  echo "  1-3: Can wait months"
  echo "  4-6: Should do soon"
  echo "  7-8: Needed this sprint"
  echo "  9-10: Urgent, blocking"
  TIME_CRIT=$(prompt_score "Score" 5)
  
  # CoD Component 3: Risk Reduction/Opportunity Enablement
  echo -e "${YELLOW}Risk Reduction/Opportunity:${NC}"
  echo "  1-3: Minimal risk/opportunity"
  echo "  4-6: Moderate impact"
  echo "  7-8: Significant risk mitigation"
  echo "  9-10: Critical risk or major opportunity"
  RISK_OPP=$(prompt_score "Score" 5)
  
  # Job Size (effort estimate)
  echo -e "${YELLOW}Job Size (effort in story points):${NC}"
  echo "  1: < 1 hour"
  echo "  2: 1-4 hours"
  echo "  3: 1 day"
  echo "  5: 2-3 days"
  echo "  8: 1 week"
  echo "  13: 2 weeks"
  echo "  20: 1 month"
  JOB_SIZE=$(prompt_score "Score" 5)
  
  # Calculate CoD and WSJF
  COD=$((USER_VALUE + TIME_CRIT + RISK_OPP))
  WSJF=$(echo "scale=2; $COD / $JOB_SIZE" | bc)
  
  echo
  echo -e "${GREEN}Results:${NC}"
  echo "  User Value: $USER_VALUE"
  echo "  Time Criticality: $TIME_CRIT"
  echo "  Risk/Opportunity: $RISK_OPP"
  echo "  Job Size: $JOB_SIZE"
  echo -e "  ${BOLD}CoD: $COD${NC}"
  echo -e "  ${BOLD}WSJF: $WSJF${NC}"
  echo
  
  # Update backlog (append WSJF and CoD columns if not present)
  # This is a simplified approach - assumes markdown table format
  # For production, use proper markdown table parser
  
  echo "WSJF=$WSJF, CoD=$COD calculated for: $ITEM_NAME"
done

echo
echo -e "${GREEN}✓ WSJF calculation complete${NC}"
echo -e "Review and update ${BLUE}$BACKLOG_FILE${NC} with calculated scores"
echo
echo "Next steps:"
echo "  1. Sort backlog by WSJF (highest first)"
echo "  2. Run: ./scripts/af wsjf-validate --circle <circle>"
echo "  3. Commit with: git commit -m 'WSJF-<id> Update backlog priorities'"
