#!/bin/bash
# scripts/validators/validate-email-response-track.sh
# Purpose: Track email response history for relationship management
# Exit Code: $EXIT_SUCCESS=tracked (always pass, informational only)

# Source robust exit codes
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
if [[ -f "$PROJECT_ROOT/scripts/validation-core.sh" ]]; then
    source "$PROJECT_ROOT/scripts/validation-core.sh"
fi

EMAIL_FILE="$1"

if [ -z "$EMAIL_FILE" ] || [ ! -f "$EMAIL_FILE" ]; then
  echo "❌ Usage: $0 <email-file.eml>"
  exit ${EXIT_FILE_NOT_FOUND:-11}
fi

LEGAL_DIR="/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL"
RESPONSE_DIR="$LEGAL_DIR/*/CORRESPONDENCE/INBOUND"

# Extract recipient and subject
RECIPIENT=$(grep -E "^To:" "$EMAIL_FILE" | head -1 | sed 's/^To: //' | tr -d '\r')
SUBJECT=$(grep -E "^Subject:" "$EMAIL_FILE" | head -1 | sed 's/^Subject: //' | tr -d '\r')

if [ -z "$RECIPIENT" ]; then
  echo "⚠️  WARNING: No recipient found in email"
  exit ${EXIT_SUCCESS_WITH_WARNINGS:-1}
fi

echo "📊 Response Tracking for: $RECIPIENT"
echo "   Subject: $SUBJECT"
echo ""

# Check for responses from this recipient (last 30 days)
RESPONSES=$(find $RESPONSE_DIR -type f -name "*.eml" -mtime -30 -exec grep -l "From:.*$(echo "$RECIPIENT" | sed 's/.*<\(.*\)>.*/\1/' | sed 's/@/.*@/')" {} \; 2>/dev/null | wc -l | tr -d ' ')

# Check for responses from this recipient (last 90 days)
RESPONSES_90D=$(find $RESPONSE_DIR -type f -name "*.eml" -mtime -90 -exec grep -l "From:.*$(echo "$RECIPIENT" | sed 's/.*<\(.*\)>.*/\1/' | sed 's/@/.*@/')" {} \; 2>/dev/null | wc -l | tr -d ' ')

# Calculate response rate
if [ "$RESPONSES" -gt 0 ]; then
  echo "✅ Active relationship: $RESPONSES responses (last 30d), $RESPONSES_90D (last 90d)"
else
  echo "⚠️  Cold relationship: 0 responses (last 30d), $RESPONSES_90D (last 90d)"
fi

# Find last response date
LAST_RESPONSE=$(find $RESPONSE_DIR -type f -name "*.eml" -exec grep -l "From:.*$(echo "$RECIPIENT" | sed 's/.*<\(.*\)>.*/\1/' | sed 's/@/.*@/')" {} \; 2>/dev/null | xargs ls -t 2>/dev/null | head -1)

if [ -n "$LAST_RESPONSE" ]; then
  LAST_DATE=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$LAST_RESPONSE" 2>/dev/null || stat -c "%y" "$LAST_RESPONSE" 2>/dev/null | cut -d' ' -f1-2)
  echo "   Last response: $LAST_DATE"
  echo "   File: $(basename "$LAST_RESPONSE")"
else
  echo "   Last response: NEVER"
fi

echo ""
echo "Exit Code: ${EXIT_SUCCESS:-0} (pass - informational tracking)"
exit ${EXIT_SUCCESS:-0}
