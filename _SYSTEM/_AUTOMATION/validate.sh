#!/usr/bin/env bash
#
# validate.sh - Pre-send Email Validation Hook
#
# This script is called before sending emails to validate:
# - Valid email addresses
# - Non-empty subject
# - Critical keywords trigger HIGH WSJF routing
# - Attachment mentions require verification
#
# Usage:
#   ./validate.sh <email-file.eml>
#
# Exit codes:
#   0 - Validation passed, safe to send
#   1 - Validation failed, review before sending

set -euo pipefail

VALIDATOR_ENHANCED="/Users/shahroozbhopti/Documents/code/investing/agentic-flow/_SYSTEM/_AUTOMATION/validator-12-enhanced.sh"

if [ $# -eq 0 ]; then
    echo "Usage: $0 <email-file.eml>"
    exit 1
fi

EMAIL_FILE="$1"

if [ ! -f "$EMAIL_FILE" ]; then
    echo "❌ Error: Email file not found: $EMAIL_FILE"
    exit 1
fi

# Call Validator #12 Enhanced pre-send validation
"$VALIDATOR_ENHANCED" --validate-email "$EMAIL_FILE"
exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo ""
    echo "✅ Email validation passed - safe to send!"
    echo ""
else
    echo ""
    echo "❌ Email validation failed - please review:"
    echo "   - Check recipient email addresses"
    echo "   - Verify subject line"
    echo "   - Confirm attachments if mentioned"
    echo ""
fi

exit $exit_code
