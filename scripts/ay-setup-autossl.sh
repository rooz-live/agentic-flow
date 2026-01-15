#!/usr/bin/env bash
# ay-setup-autossl.sh - Configure AutoSSL on cPanel

set -euo pipefail

CPANEL_HOST="${YOLIFE_CPANEL_HOST:-interface.tag.ooo}"
CPANEL_KEY="${YOLIFE_CPANEL_KEY:-$HOME/pem/rooz.pem}"

echo "🔒 Setting up AutoSSL for cPanel"
echo

# Check cPanel connectivity
if ! ssh -i "$CPANEL_KEY" -p 2222 -o ConnectTimeout=5 "root@$CPANEL_HOST" "echo ok" 2>/dev/null; then
    echo "⚠️  cPanel host not reachable: $CPANEL_HOST"
    echo "Configure YOLIFE_CPANEL_HOST environment variable"
    exit 1
fi

echo "✓ cPanel accessible: $CPANEL_HOST"

# Enable AutoSSL via WHM API
echo "Enabling AutoSSL..."
ssh -i "$CPANEL_KEY" -p 2222 "root@$CPANEL_HOST" << 'REMOTE'
# Check if AutoSSL is enabled
if /usr/local/cpanel/bin/whmapi1 get_autossl_check_interval | grep -q "enabled"; then
    echo "✓ AutoSSL already enabled"
else
    echo "Enabling AutoSSL..."
    /usr/local/cpanel/bin/whmapi1 enable_autossl
fi

# Configure provider (Sectigo or Let's Encrypt)
/usr/local/cpanel/bin/whmapi1 set_autossl_provider provider=Sectigo

# Run AutoSSL check
/usr/local/cpanel/scripts/autossl_check --all

echo "✓ AutoSSL configured"
REMOTE

echo
echo "🔒 AutoSSL setup complete"
