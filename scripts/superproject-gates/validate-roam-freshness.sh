#!/bin/bash
# ROAM Freshness Validation Script
# Validates that ROAM_TRACKER.yaml entries are fresh (< 3 days old by default)
# Returns exit code 0 for compliant, 1 for stale entries, 2 for errors

set -e

# Default configuration
ROAM_FILE="${ROAM_FILE:-.goalie/ROAM_TRACKER.yaml}"
MAX_AGE_DAYS="${ROAM_MAX_AGE_DAYS:-3}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 ROAM Freshness Validation"
echo "================================"
echo "ROAM File: $ROAM_FILE"
echo "Max Age: $MAX_AGE_DAYS days"
echo ""

# Check if ROAM file exists
if [ ! -f "$ROAM_FILE" ]; then
    echo -e "${RED}❌ ERROR: ROAM file not found: $ROAM_FILE${NC}"
    echo "Please create a ROAM_TRACKER.yaml file in .goalie directory."
    exit 2
fi

# Run Python compliance checker
python3 scripts/governance/compliance_as_code.py \
    --roam-file "$ROAM_FILE" \
    --max-age-days "$MAX_AGE_DAYS" \
    --output-format text

EXIT_CODE=$?

echo ""

# Handle exit codes
case $EXIT_CODE in
    0)
        echo -e "${GREEN}✅ SUCCESS: All ROAM entries are fresh!${NC}"
        echo "You can safely push your changes."
        ;;
    1)
        echo -e "${YELLOW}⚠️  WARNING: Stale ROAM entries detected${NC}"
        echo ""
        echo "Please update stale entries before pushing:"
        echo "  1. RESOLVE - Mark as RESOLVED with evidence"
        echo "  2. ACCEPT - Explicitly accept with justification"
        echo "  3. MITIGATE - Document mitigation steps"
        echo "  4. UPDATE - Refresh the discovered date"
        echo ""
        echo "See docs/ROAM_RISK_ASSESSMENT_IMPLEMENTATION_GUIDE.md for details."
        ;;
    2)
        echo -e "${RED}❌ ERROR: Validation failed${NC}"
        echo "Please check the error messages above and fix any issues."
        ;;
    *)
        echo -e "${RED}❌ UNKNOWN ERROR (exit code: $EXIT_CODE)${NC}"
        ;;
esac

exit $EXIT_CODE
