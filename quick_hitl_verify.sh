#!/bin/bash
# Quick HITL Email Verification for Doug Follow-Up
# Usage: ./quick_hitl_verify.sh

EMAIL_FILE="/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/01-ACTIVE-CRITICAL/MAA-26CV005596-590/CORRESPONDENCE/OUTBOUND/Doug/FRIENDLY-FOLLOWUP-EXTENSION-20260211-2035.eml"

echo "======================================================================================================"
echo "QUICK HITL EMAIL VERIFICATION"
echo "======================================================================================================"
echo ""
echo "📧 EMAIL: Doug Follow-Up (Settlement Extension Offer)"
echo "⏰ DEADLINE: Tomorrow Feb 12 @ 5:00 PM EST (20 hours remaining)"
echo "🎯 PRIORITY: WSJF=18.0 (HIGHEST)"
echo ""
echo "--- EMAIL PREVIEW ---"
cat "$EMAIL_FILE"
echo ""
echo "--- END EMAIL ---"
echo ""
echo "======================================================================================================"
echo "HUMAN APPROVAL REQUIRED"
echo "======================================================================================================"
echo ""
echo "DECISION OPTIONS:"
echo "  [Y] Yes - Send immediately via Gmail"
echo "  [N] No - Cancel"
echo "  [E] Edit - Open in text editor first"
echo ""
read -p "Enter decision [Y/N/E]: " choice

case "${choice^^}" in
  Y)
    echo "✅ APPROVED - Opening Gmail compose window..."
    # Extract To, Subject, Body for Gmail
    TO=$(grep "^To:" "$EMAIL_FILE" | sed 's/To: //')
    SUBJECT=$(grep "^Subject:" "$EMAIL_FILE" | sed 's/Subject: //')
    
    # URL encode
    TO_ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$TO'))")
    SUBJECT_ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$SUBJECT'))")
    
    # Open Gmail compose
    open "https://mail.google.com/mail/?view=cm&fs=1&to=$TO_ENCODED&su=$SUBJECT_ENCODED"
    
    echo ""
    echo "📧 Gmail compose window opened. Please:"
    echo "   1. Copy email body from file above"
    echo "   2. Paste into Gmail"
    echo "   3. Review one final time"
    echo "   4. Click Send"
    echo ""
    ;;
  N)
    echo "❌ REJECTED - Send cancelled"
    ;;
  E)
    echo "✏️  Opening email in editor..."
    open -e "$EMAIL_FILE"
    echo ""
    echo "Edit complete. Re-run this script to approve."
    ;;
  *)
    echo "Invalid choice. Exiting."
    ;;
esac
