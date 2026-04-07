#!/usr/bin/env bash
# fix_cpanel_ssl_matrix.sh
# Mapped auto-remediation proxy to fix ERR_CERT_COMMON_NAME_INVALID explicitly.
# @business-context WSJF-1: Infrastructure Integrity & Legal Data Interoperability.

set -euo pipefail

CPANEL_IP="${YOLIFE_CPANEL_HOST:-54.241.233.105}"
CPANEL_USER="rooz"
PEM_KEY="${YOLIFE_CPANEL_KEY:-$HOME/pem/rooz.pem}"
DOMAIN="${1:-law.rooz.live}"

echo "============================================================"
echo "[SSL JOURNEY MAP EXEC] Target Domain: $DOMAIN"
echo "Phase 1: Validating Remote DNS resolves appropriately..."
RESOLVED_IP=$(dig +short "$DOMAIN" | tail -n 1)

if [[ -z "$RESOLVED_IP" ]]; then
    echo "❌ DNS_PROBE_FINISHED_NXDOMAIN: The domain $DOMAIN lacks A/CNAME records."
    echo "-> Resolution Path: Add STX Server IP ($CPANEL_IP) to cPanel/Cloudflare zones natively."
    exit 150
fi

if [[ "$RESOLVED_IP" != "$CPANEL_IP" ]]; then
    echo "⚠️ WARNING: DNS connects to $RESOLVED_IP, not the primary map $CPANEL_IP."
    echo "Ensure SSL generation targets the correct zone interface!"
fi

echo "Phase 2: Binding the VirtualHost to cPanel natively via UAPI..."
# Ensure the domain actually exists on the target account, otherwise AutoSSL defaults to the server hostname.
ssh -o StrictHostKeyChecking=no -i "$PEM_KEY" -p 22 ubuntu@$CPANEL_IP \
    "sudo uapi --user=$CPANEL_USER SubDomain addsubdomain domain=$DOMAIN rootdomain=rooz.live dir=public_html/$DOMAIN" || echo "Subdomain already exists or mapping failed. Continuing..."

echo "Phase 3: Remotely binding the Let's Encrypt AutoSSL provisioning logic natively... (GREEN PHASE EXECUTION)"

# Execute the AutoSSL generation loop remotely bypassing GUI limitations.
ssh -o StrictHostKeyChecking=no -i "$PEM_KEY" -p 22 ubuntu@$CPANEL_IP \
    "sudo /usr/local/cpanel/bin/autossl_check --user=$CPANEL_USER"

echo "✅ AutoSSL validation loop actively initiated on cPanel cluster ($CPANEL_IP)."
echo "   Note: Let's Encrypt validation may take 3-5 minutes to bind the certificate."
echo "   TDD Check: After 5 minutes, run 'bats scripts/tests/bats/test_dns_ssl_matrix.bats'."
echo "============================================================"
