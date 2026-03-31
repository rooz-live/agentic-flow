#!/bin/bash
# scripts/validators/validate-email-bounce-detect.sh
# Purpose: Detect email delivery failures and bounce patterns
# Exit Code: $EXIT_SUCCESS=no-bounces, $EXIT_SUCCESS_WITH_WARNINGS=bounces-detected (warning, not blocker)

# Source robust exit codes
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
if [[ -f "$PROJECT_ROOT/scripts/validation-core.sh" ]]; then
    source "$PROJECT_ROOT/scripts/validation-core.sh"
fi

INBOUND_DIR="$1"

if [ -z "$INBOUND_DIR" ]; then
  # Default to legal correspondence INBOUND folders
  INBOUND_DIR="/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/*/CORRESPONDENCE/INBOUND"
fi

echo "🔍 Scanning for bounce patterns..."
echo "   Directory: $INBOUND_DIR"
echo ""

# Search for bounce keywords (last 30 days)
BOUNCE_PATTERN="550|5\\.x\\.x|delivery.*failed|undelivered|bounce|Mail Delivery Failed|returned mail|550 5\\.[0-9]\\.[0-9]"
BOUNCES=$(find $INBOUND_DIR -type f -name "*.eml" -mtime -30 -exec grep -l -iE "$BOUNCE_PATTERN" {} \; 2>/dev/null | wc -l | tr -d ' ')

if [ "$BOUNCES" -gt 0 ]; then
  echo "⚠️  BOUNCE DETECTED: $BOUNCES bounce messages found (last 30 days)"
  echo ""
  echo "Recent bounce files:"
  find $INBOUND_DIR -type f -name "*.eml" -mtime -30 -exec grep -l -iE "$BOUNCE_PATTERN" {} \; 2>/dev/null | xargs ls -t | head -5 | while read f; do
    echo "   - $(basename "$f")"
    # Extract bounce reason if available
    REASON=$(grep -iE "550|delivery.*failed" "$f" | head -1 | cut -c1-80)
    if [ -n "$REASON" ]; then
      echo "     Reason: $REASON"
    fi
  done
  echo ""
  echo "Exit Code: $EXIT_SUCCESS_WITH_WARNINGS (warning - bounce history exists)"
  exit $EXIT_SUCCESS_WITH_WARNINGS
else
  echo "✅ No bounces detected (last 30 days)"
  echo ""
  echo "Exit Code: $EXIT_SUCCESS (pass)"
  exit $EXIT_SUCCESS
fi
