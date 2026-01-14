#!/usr/bin/env bash
set -e

# ROAM Staleness Check - P1-1 Implementation
# ==========================================
# Enforces ROAM file freshness (<3 days) in CI/CD pipeline
# Fails build if any ROAM files are stale

MAX_ROAM_AGE_DAYS="${MAX_ROAM_AGE_DAYS:-3}"
PROJECT_ROOT="${PROJECT_ROOT:-$(git rev-parse --show-toplevel 2>/dev/null || echo ".")}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=================================================="
echo "ROAM Staleness Check"
echo "=================================================="
echo "Max age: ${MAX_ROAM_AGE_DAYS} days"
echo "Project root: ${PROJECT_ROOT}"
echo ""

cd "$PROJECT_ROOT"

# Find all ROAM files (excluding node_modules, .git, archive, dist)
echo "Scanning for ROAM files..."
ROAM_FILES=$(find . -type f \
  \( -name "ROAM-*.md" -o -name "*-roam.md" -o -name "ROAM.md" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/archive/*" \
  -not -path "*/dist/*" \
  -not -path "*/.goalie/*" \
  2>/dev/null)

if [ -z "$ROAM_FILES" ]; then
  echo -e "${YELLOW}⚠️  No ROAM files found${NC}"
  echo ""
  echo "This may be normal if your project doesn't use ROAM tracking."
  echo "ROAM files typically track:"
  echo "  - Risks"
  echo "  - Obstacles"
  echo "  - Assumptions"
  echo "  - Mitigations"
  exit 0
fi

TOTAL_FILES=$(echo "$ROAM_FILES" | wc -l | tr -d ' ')
echo -e "${BLUE}Found ${TOTAL_FILES} ROAM file(s)${NC}"
echo ""

# Check each file's age
VIOLATIONS=0
STALE_FILES=()
FRESH_FILES=()

for FILE in $ROAM_FILES; do
  # Get last modified time (platform-independent)
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    LAST_MODIFIED=$(stat -f "%m" "$FILE" 2>/dev/null || echo "0")
  else
    # Linux
    LAST_MODIFIED=$(stat -c "%Y" "$FILE" 2>/dev/null || echo "0")
  fi
  
  if [ "$LAST_MODIFIED" = "0" ]; then
    echo -e "${YELLOW}⚠️  Cannot read modification time: $FILE${NC}"
    continue
  fi
  
  NOW=$(date +%s)
  AGE_SECONDS=$((NOW - LAST_MODIFIED))
  AGE_DAYS=$((AGE_SECONDS / 86400))
  
  # Check if file is stale
  if [ "$AGE_DAYS" -gt "$MAX_ROAM_AGE_DAYS" ]; then
    VIOLATIONS=$((VIOLATIONS + 1))
    STALE_FILES+=("$FILE:$AGE_DAYS")
    echo -e "${RED}❌ STALE (${AGE_DAYS}d): $FILE${NC}"
  else
    FRESH_FILES+=("$FILE")
    echo -e "${GREEN}✓ Fresh (${AGE_DAYS}d): $FILE${NC}"
  fi
done

echo ""
echo "=================================================="
echo "SUMMARY"
echo "=================================================="
echo "Total ROAM files: $TOTAL_FILES"
echo -e "Fresh files: ${GREEN}${#FRESH_FILES[@]}${NC}"
echo -e "Stale files: ${RED}${VIOLATIONS}${NC}"
echo ""

# Generate detailed report if there are violations
if [ "$VIOLATIONS" -gt 0 ]; then
  echo -e "${RED}🚫 ROAM Staleness Check FAILED${NC}"
  echo ""
  echo "The following ROAM files are older than ${MAX_ROAM_AGE_DAYS} days:"
  echo ""
  
  for ENTRY in "${STALE_FILES[@]}"; do
    FILE="${ENTRY%%:*}"
    AGE="${ENTRY##*:}"
    echo "  📄 $FILE"
    echo "     Age: ${AGE} days (max: ${MAX_ROAM_AGE_DAYS})"
    
    # Try to show first few lines of the file
    if [ -r "$FILE" ]; then
      echo "     Preview:"
      head -n 3 "$FILE" 2>/dev/null | sed 's/^/       /'
    fi
    echo ""
  done
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "ACTION REQUIRED:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "ROAM files must be updated or resolved within ${MAX_ROAM_AGE_DAYS} days."
  echo ""
  echo "To fix this:"
  echo "  1. Review each stale ROAM file"
  echo "  2. Update the status if still relevant"
  echo "  3. Mark as RESOLVED if no longer applicable"
  echo "  4. Archive if historical"
  echo ""
  echo "Example ROAM format:"
  echo "  # ROAM - [Component Name]"
  echo "  "
  echo "  ## Risks"
  echo "  - [HIGH] Description | Status: ACTIVE | Owner: @user"
  echo "  "
  echo "  ## Obstacles"
  echo "  - [MEDIUM] Description | Status: MITIGATING | Owner: @user"
  echo ""
  
  exit 1
else
  echo -e "${GREEN}✅ All ROAM files are fresh (<${MAX_ROAM_AGE_DAYS} days)${NC}"
  echo ""
  echo "ROAM tracking is up-to-date. Good job! 🎉"
  exit 0
fi
