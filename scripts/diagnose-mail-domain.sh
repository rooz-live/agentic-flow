#!/bin/bash
# Diagnose mail.domain configuration issues
# For mail.bhopti.com, mail.tld format already configured
#
# Purpose: Find why SMTP shows "down" in Mail/MailMaven

MAIL_DOMAIN="${1:-mail.bhopti.com}"

echo "=========================================="
echo "Mail Domain Diagnostics: $MAIL_DOMAIN"
echo "=========================================="
echo ""

# [1] DNS Resolution
echo "[1] DNS Resolution Check"
echo "    Testing: $MAIL_DOMAIN"
IP=$(dig +short $MAIL_DOMAIN 2>/dev/null || nslookup $MAIL_DOMAIN 2>/dev/null | grep -A1 "Name:" | grep "Address:" | head -1 | awk '{print $2}')
if [ -n "$IP" ]; then
    echo "    ✅ Resolves to: $IP"
else
    echo "    ❌ DNS resolution failed"
    echo "       Check: dig $MAIL_DOMAIN"
    echo "       Or: nslookup $MAIL_DOMAIN"
fi
echo ""

# [2] MX Records
echo "[2] MX Record Check"
MX=$(dig +short MX $MAIL_DOMAIN 2>/dev/null | head -1)
if [ -n "$MX" ]; then
    echo "    ✅ MX record: $MX"
else
    echo "    ⚠️  No MX record found (mail may be on A record)"
fi
echo ""

# [3] Port Connectivity - 465 SMTPS
echo "[3] Testing SMTPS (465)"
if timeout 5 bash -c "exec 3<>/dev/tcp/$MAIL_DOMAIN/465" 2>/dev/null; then
    echo "    ✅ Port 465 is reachable"
    
    # Test SSL handshake
    echo "    Testing SSL handshake..."
    SSL_RESULT=$(echo | openssl s_client -connect $MAIL_DOMAIN:465 -servername $MAIL_DOMAIN 2>&1 | head -20)
    
    if echo "$SSL_RESULT" | grep -q "Verify return code: 0"; then
        echo "    ✅ SSL certificate valid"
    elif echo "$SSL_RESULT" | grep -q "Verify return code: 18"; then
        echo "    ⚠️  SSL: Self-signed certificate (may need to trust in Mail)"
    elif echo "$SSL_RESULT" | grep -q "Verify return code: 19"; then
        echo "    ⚠️  SSL: Self-signed certificate in chain"
    elif echo "$SSL_RESULT" | grep -q "Verify return code: 21"; then
        echo "    ❌ SSL: Unable to verify server certificate"
    elif echo "$SSL_RESULT" | grep -q "Certificate expired"; then
        echo "    ❌ SSL: Certificate EXPIRED"
    else
        CODE=$(echo "$SSL_RESULT" | grep "Verify return code:" | awk '{print $4}')
        echo "    ⚠️  SSL verify code: $CODE"
    fi
    
    # Show certificate info
    CERT_INFO=$(echo | openssl s_client -connect $MAIL_DOMAIN:465 2>/dev/null | openssl x509 -noout -subject -dates 2>/dev/null)
    if [ -n "$CERT_INFO" ]; then
        echo "    Certificate:"
        echo "$CERT_INFO" | sed 's/^/       /'
    fi
else
    echo "    ❌ Port 465 NOT reachable"
    echo "       Possible causes:"
    echo "       - Firewall blocking"
    echo "       - Mail server down"
    echo "       - Wrong port (try 587)"
    echo "       - Wrong host (try smtp.bhopti.com)"
fi
echo ""

# [4] Port Connectivity - 993 IMAPS
echo "[4] Testing IMAPS (993)"
if timeout 5 bash -c "exec 3<>/dev/tcp/$MAIL_DOMAIN/993" 2>/dev/null; then
    echo "    ✅ Port 993 is reachable"
    
    # Test IMAP SSL
    IMAP_SSL=$(echo | openssl s_client -connect $MAIL_DOMAIN:993 -servername $MAIL_DOMAIN 2>&1 | head -10)
    if echo "$IMAP_SSL" | grep -q "CONNECTED"; then
        echo "    ✅ IMAP SSL handshake successful"
    else
        echo "    ⚠️  IMAP SSL issue detected"
    fi
else
    echo "    ❌ Port 993 NOT reachable"
    echo "       Possible causes:"
    echo "       - IMAP server not running"
    echo "       - Try imap.bhopti.com instead"
fi
echo ""

# [5] Alternative ports
echo "[5] Testing Alternative Ports"
echo "    Port 587 (STARTTLS): $(timeout 3 bash -c "exec 3<>/dev/tcp/$MAIL_DOMAIN/587" 2>/dev/null && echo "✅ Open" || echo "❌ Closed")"
echo "    Port 25 (SMTP):      $(timeout 3 bash -c "exec 3<>/dev/tcp/$MAIL_DOMAIN/25" 2>/dev/null && echo "✅ Open" || echo "❌ Closed")"
echo "    Port 143 (IMAP):     $(timeout 3 bash -c "exec 3<>/dev/tcp/$MAIL_DOMAIN/143" 2>/dev/null && echo "✅ Open" || echo "❌ Closed")"
echo ""

# [6] SPF/DMARC Check
echo "[6] DNS Security Records"
DOMAIN=$(echo $MAIL_DOMAIN | sed 's/^mail\.//')
echo "    Domain: $DOMAIN"

SPF=$(dig +short TXT $DOMAIN 2>/dev/null | grep "v=spf1")
if [ -n "$SPF" ]; then
    echo "    ✅ SPF: $SPF"
else
    echo "    ⚠️  No SPF record (may affect deliverability)"
fi

DMARC=$(dig +short TXT _dmarc.$DOMAIN 2>/dev/null)
if [ -n "$DMARC" ]; then
    echo "    ✅ DMARC: $DMARC"
else
    echo "    ⚠️  No DMARC record"
fi

echo ""

# [7] Network Path
echo "[7] Network Path Analysis"
echo "    Traceroute (first 5 hops):"
traceroute -m 5 $MAIL_DOMAIN 2>/dev/null | tail -n +2 | head -5 | sed 's/^/    /' || echo "    (traceroute not available)"
echo ""

# [8] Mail.app Specific Issues
echo "[8] macOS Mail.app Specific Checks"
echo ""
echo "    Common Mail.app issues with mail.domain:"
echo ""
echo "    A) Certificate not trusted:"
echo "       Fix: Open Keychain Access, find $MAIL_DOMAIN cert,"
echo "            double-click, set SSL to 'Always Trust'"
echo ""
echo "    B) Authentication method mismatch:"
echo "       Check: Mail > Preferences > Accounts > $MAIL_DOMAIN"
echo "       Try: Password, MD5 Challenge-Response, or OAuth2"
echo ""
echo "    C) Port configuration:"
echo "       SMTP: Try 465 (SSL) or 587 (STARTTLS)"
echo "       IMAP: Try 993 (SSL) or 143 (STARTTLS)"
echo ""
echo "    D) Server name variations to try:"
echo "       - $MAIL_DOMAIN"
echo "       - smtp.$DOMAIN"
echo "       - imap.$DOMAIN"
echo "       - bhopti.com (if using main domain)"
echo ""

# [9] MailMaven Specific
echo "[9] MailMaven Specific Checks"
echo ""
echo "    MailMaven settings to verify:"
echo "    - Server: $MAIL_DOMAIN"
echo "    - SMTP Port: 465 (SSL) or 587 (TLS)"
echo "    - IMAP Port: 993 (SSL)"
echo "    - SSL/TLS: Enabled"
echo "    - Authentication: Check your specific method"
echo ""

# [10] Recommendations
echo "[10] Quick Fixes to Try"
echo ""
echo "    1. Test with telnet:"
echo "       openssl s_client -connect $MAIL_DOMAIN:465"
echo ""
echo "    2. Try alternative server names:"
echo "       - smtp.bhopti.com"
echo "       - imap.bhopti.com"
echo "       - bhopti.com"
echo ""
echo "    3. Check if DNS changed:"
echo "       dig $MAIL_DOMAIN +short"
echo "       (Compare with previous IP if known)"
echo ""
echo "    4. Verify certificate not expired:"
echo "       echo | openssl s_client -connect $MAIL_DOMAIN:465 2>/dev/null | \"
echo "         openssl x509 -noout -dates"
echo ""
echo "    5. Check server status page (if available)"
echo ""

# Summary
echo "=========================================="
echo "Summary"
echo "=========================================="
echo ""

REACHABLE_465=$(timeout 3 bash -c "exec 3<>/dev/tcp/$MAIL_DOMAIN/465" 2>/dev/null && echo "YES" || echo "NO")
REACHABLE_993=$(timeout 3 bash -c "exec 3<>/dev/tcp/$MAIL_DOMAIN/993" 2>/dev/null && echo "YES" || echo "NO")

if [ "$REACHABLE_465" = "YES" ] && [ "$REACHABLE_993" = "YES" ]; then
    echo "✅ Both ports (465/993) are reachable"
    echo "   Issue is likely: Certificate or Authentication"
    echo ""
    echo "   NEXT STEPS:"
    echo "   1. Check Keychain for certificate trust"
    echo "   2. Verify username/password in Mail settings"
    echo "   3. Try different authentication method"
elif [ "$REACHABLE_465" = "YES" ]; then
    echo "⚠️  SMTP (465) OK, but IMAP (993) not reachable"
    echo "   IMAP server may be down or on different host"
    echo ""
    echo "   NEXT STEPS:"
    echo "   1. Try imap.$DOMAIN instead"
    echo "   2. Check if IMAP is on port 143"
    echo "   3. Verify IMAP server is running"
elif [ "$REACHABLE_993" = "YES" ]; then
    echo "⚠️  IMAP (993) OK, but SMTP (465) not reachable"
    echo "   SMTP server may be down or on different port"
    echo ""
    echo "   NEXT STEPS:"
    echo "   1. Try port 587 instead of 465"
    echo "   2. Try smtp.$DOMAIN instead"
    echo "   3. Check if SMTP requires VPN"
else
    echo "❌ Neither port is reachable"
    echo "   Possible issues:"
    echo "   - Mail server is down"
    echo "   - Firewall blocking"
    echo "   - DNS pointing to wrong IP"
    echo "   - Network connectivity issue"
    echo ""
    echo "   NEXT STEPS:"
    echo "   1. Check if you can reach other websites"
    echo "   2. Try from different network (mobile hotspot)"
    echo "   3. Contact hosting provider"
    echo "   4. Use alternative mail service temporarily"
fi

echo ""
echo "=========================================="
echo "For detailed SSL analysis, run:"
echo "  openssl s_client -connect $MAIL_DOMAIN:465 -showcerts"
echo "=========================================="
