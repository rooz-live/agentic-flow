#!/bin/bash
# scripts/validators/validate-email-dupe.sh
# Purpose: Detect duplicate emails sent to same recipient within 7 days
# Exit Code: 0=no-dupe, 120=dupe-found (blocker)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORE_PATH="$(cd "$SCRIPT_DIR/.." && pwd)/validation-core.sh"
if [ -f "$CORE_PATH" ]; then
    source "$CORE_PATH"
else
    EXIT_SUCCESS=0
    EXIT_INVALID_ARGS=10
    EXIT_DUPLICATE_DETECTED=120
fi

EMAIL_FILE="$1"

if [ -z "$EMAIL_FILE" ] || [ ! -f "$EMAIL_FILE" ]; then
  echo "❌ Usage: $0 <email-file.eml>"
  exit $EXIT_INVALID_ARGS
fi

# CSQBM Governance Constraint: ADR-005 explicit bounds
file_size_bytes=$(wc -c < "$EMAIL_FILE" | tr -d ' ')
if [[ "$file_size_bytes" -gt 16000 ]]; then
    echo "❌ 🚫 BLOCKER: Payload size ($file_size_bytes bytes) exceeds dynamic limit."
    echo "   Constraint (ADR-005): Payloads must fit within the 4000 DBOS Pydantic token ceiling. Shrink unstructured sprawl prior to processing."
    exit ${EXIT_SCHEMA_VALIDATION_FAILED:-100}
fi

SENT_DIR="/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL"

# Extract recipient from email (handle multiple formats)
RECIPIENT=$(grep -E "^To:" "$EMAIL_FILE" | head -1 | sed 's/^To: //' | tr -d '\r')

if [ -z "$RECIPIENT" ]; then
  echo "⚠️  WARNING: No recipient found in email"
  exit $EXIT_SUCCESS  # Not a blocker, just warn
fi

echo "🔍 Checking for duplicates to: $RECIPIENT (last 7 days)"

# CSQBM Governance Constraint: Payload evaluation execution
local_proj_root="$(cd "$(dirname "$(dirname "$(dirname "${BASH_SOURCE[0]}")")")" && pwd)"
[ -f "$local_proj_root/scripts/validation-core.sh" ] && source "$local_proj_root/scripts/validation-core.sh" || true

# Check if already sent to this recipient in last 7 days
DUPE_FILES=$(find "$SENT_DIR" -type d -name "SENT" -exec find {} -type f -name "*.eml" -mtime -7 \; 2>/dev/null | xargs grep -l "To: $RECIPIENT" 2>/dev/null || true)
DUPE_COUNT=$(echo "$DUPE_FILES" | grep -c ".eml" || echo "0")

if [ "$DUPE_COUNT" -gt 0 ]; then
  echo "❌ DUPE DETECTED: Email to $RECIPIENT already sent in last 7 days"
  echo ""
  echo "Duplicate files:"
  echo "$DUPE_FILES"
  echo ""
  echo "Exit Code: $EXIT_DUPLICATE_DETECTED (blocker - do not send duplicate)"
  exit $EXIT_DUPLICATE_DETECTED
else
  echo "✅ No dupe: Safe to send to $RECIPIENT"
  echo "Exit Code: $EXIT_SUCCESS (pass)"
  exit $EXIT_SUCCESS
fi
