#!/usr/bin/env bash
# post-send-hook.sh - Record email hash after successful send
# CROSS-REF: ADR-016 | email-hash-db.sh | validation-runner.sh
# MPP: method=post_action | pattern=hook | protocol=exit_code
# AISP: Safety (record AFTER send), Idempotency (hash dedup), Precision (SHA256)
#
# PURPOSE: Record sent emails to prevent future duplicates
# USAGE: ./post-send-hook.sh path/to/email.eml
# Called by: mail client or send automation AFTER email is successfully sent

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source dependencies
# shellcheck source=exit-codes.sh
source "$SCRIPT_DIR/exit-codes.sh" || exit 11

# shellcheck source=email-hash-db.sh
source "$SCRIPT_DIR/email-hash-db.sh" || {
    echo "❌ ERROR: email-hash-db.sh not found" >&2
    exit $EXIT_TOOL_MISSING
}

EML_FILE="${1:-}"

if [[ -z "$EML_FILE" || ! -f "$EML_FILE" ]]; then
    echo "❌ Usage: $0 path/to/email.eml" >&2
    exit $EXIT_INVALID_ARGS
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# EXTRACT METADATA
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TO_RAW=$(grep -i "^To:" "$EML_FILE" 2>/dev/null | head -1 | sed 's/^To: *//i' || echo "")
RECIPIENT=$(echo "$TO_RAW" | awk '{print $1}' | tr -d '<>')

if [[ -z "$RECIPIENT" ]]; then
    echo "❌ ERROR: Could not extract recipient from email" >&2
    exit $EXIT_MISSING_REQUIRED_FIELD
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# RECORD HASH IN CENTRALIZED DATABASE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Check if already recorded (idempotency)
if check_duplicate_email "$EML_FILE" "$RECIPIENT" 2>/dev/null; then
    echo "⚠️  WARNING: Email hash already recorded (duplicate send attempt)" >&2
    echo "    Recipient: $RECIPIENT" >&2
    exit $EXIT_DUPLICATE_DETECTED
fi

# Record the sent email
record_email_hash "$EML_FILE" "$RECIPIENT" "sent" "Sent successfully" || {
    echo "❌ ERROR: Failed to record email hash" >&2
    exit $EXIT_DATABASE_LOCKED
}

echo "✅ Email hash recorded: recipient=$RECIPIENT status=sent"

# ─── OPTIONAL: LOG TO WSJF ─────────────────────────────────────────────────────
# Trigger email-to-wsjf-bridge.sh if exists
BRIDGE_SCRIPT="$(dirname "$0")/email-to-wsjf-bridge.sh"
if [[ -x "$BRIDGE_SCRIPT" ]]; then
  bash "$BRIDGE_SCRIPT" "$EML_FILE" >> "${HOME}/Library/Logs/wsjf-email-bridge.log" 2>&1 || true
fi

exit 0
