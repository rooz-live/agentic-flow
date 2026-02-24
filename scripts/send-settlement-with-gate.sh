#!/bin/bash
# Settlement Send with Verifiable Gate
# Case: 26CV005596-590 | Doug Response

set -euo pipefail

PROJECT_ROOT="/Users/shahroozbhopti/Documents/code/investing/agentic-flow"
SETTLEMENT_FILE="$PROJECT_ROOT/legal/settlement_26CV005596/04_RESPONSE_TO_DOUG.md"
LOG_FILE="$PROJECT_ROOT/logs/outbound_emails.log"

mkdir -p "$PROJECT_ROOT/logs"

echo "=== SETTLEMENT SEND VERIFICATION GATE ==="
echo "Case: 26CV005596-590"
echo "Recipient: Doug"
echo ""

# Pre-send verifications
echo "PRE-SEND GATES:"

# Gate 1: File exists
if [ ! -f "$SETTLEMENT_FILE" ]; then
    echo "  ✗ FAIL: Settlement file not found"
    exit 1
fi
echo "  ✓ Gate 1: File exists"

# Gate 2: Token budget ≤ 4000 (approx 600 words)
WORD_COUNT=$(wc -w < "$SETTLEMENT_FILE")
if [ "$WORD_COUNT" -gt 600 ]; then
    echo "  ✗ FAIL: Word count $WORD_COUNT exceeds budget"
    exit 1
fi
echo "  ✓ Gate 2: Token budget OK ($WORD_COUNT words)"

# Gate 3: No liability admissions
if grep -qi "i admit\|my fault\|i was wrong" "$SETTLEMENT_FILE"; then
    echo "  ✗ FAIL: Liability admission detected"
    exit 1
fi
echo "  ✓ Gate 3: No liability admissions"

# Gate 4: UDTPA preserved
if ! grep -qi "udtpa\|treble\|75-16" "$SETTLEMENT_FILE"; then
    echo "  ✗ FAIL: UDTPA rights not preserved"
    exit 1
fi
echo "  ✓ Gate 4: UDTPA rights preserved"

echo ""
echo "ALL PRE-SEND GATES PASSED"
echo ""
echo "NEXT STEPS (Manual):"
echo "1. Copy content from: $SETTLEMENT_FILE"
echo "2. Paste into email client"
echo "3. Send to Doug"
echo "4. Run post-send verification: ./scripts/verify-settlement-sent.sh"
echo ""
echo "=== READY TO SEND ==="
