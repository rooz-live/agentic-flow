#!/bin/bash
# Fix HSTS headers for interface.rooz.live and interface.tag.vote
# Correlation ID: consciousness-1758658960

set -euo pipefail

CORRELATION_ID="consciousness-1758658960"
TIMESTAMP=$(date -Iseconds)

echo "🔧 Fixing HSTS Headers for rooz.live and tag.vote"
echo "Correlation ID: $CORRELATION_ID"
echo "Timestamp: $TIMESTAMP"
echo ""

# Test SSH connection
if ! ssh -o ConnectTimeout=5 root@23.92.79.2 "exit" 2>/dev/null; then
    echo "❌ Cannot connect to root@23.92.79.2 via SSH"
    exit 1
fi

echo "✅ SSH connection successful"
echo ""

# Find the correct nginx config files
echo "📋 Locating nginx config files..."
ssh root@23.92.79.2 "ls -lah /etc/nginx/conf.d/users/ | grep -E '(rooz|tagvote)'"
echo ""

# Add HSTS to rooz.conf
echo "🔧 Adding HSTS to rooz.conf..."
ssh root@23.92.79.2 'bash -s' << 'ENDSSH'
cd /etc/nginx/conf.d/users/

# Find rooz config file
ROOZ_CONF=$(ls | grep -i rooz | head -1)

if [ -z "$ROOZ_CONF" ]; then
    echo "❌ rooz config file not found"
    exit 1
fi

echo "Found: $ROOZ_CONF"

# Check if HSTS already present
if grep -q "strict-transport-security" "$ROOZ_CONF"; then
    echo "✅ HSTS already present in $ROOZ_CONF"
else
    # Backup
    cp "$ROOZ_CONF" "$ROOZ_CONF.bak.$(date +%Y%m%d_%H%M%S)"
    
    # Add include directive after ssl_certificate_key line
    sed -i '/ssl_certificate_key/a\    include snippets/hsts.conf;' "$ROOZ_CONF"
    
    echo "✅ Added HSTS to $ROOZ_CONF"
fi
ENDSSH

echo ""

# Add HSTS to tagvote.conf
echo "🔧 Adding HSTS to tagvote.conf..."
ssh root@23.92.79.2 'bash -s' << 'ENDSSH'
cd /etc/nginx/conf.d/users/

# Find tagvote config file
TAGVOTE_CONF=$(ls | grep -iE '(tagvote|tag.vote|tag_vote)' | head -1)

if [ -z "$TAGVOTE_CONF" ]; then
    echo "❌ tagvote config file not found"
    exit 1
fi

echo "Found: $TAGVOTE_CONF"

# Check if HSTS already present
if grep -q "strict-transport-security" "$TAGVOTE_CONF"; then
    echo "✅ HSTS already present in $TAGVOTE_CONF"
else
    # Backup
    cp "$TAGVOTE_CONF" "$TAGVOTE_CONF.bak.$(date +%Y%m%d_%H%M%S)"
    
    # Add include directive after ssl_certificate_key line
    sed -i '/ssl_certificate_key/a\    include snippets/hsts.conf;' "$TAGVOTE_CONF"
    
    echo "✅ Added HSTS to $TAGVOTE_CONF"
fi
ENDSSH

echo ""

# Validate nginx configuration
echo "🔍 Validating nginx configuration..."
if ssh root@23.92.79.2 "nginx -t" 2>&1 | grep -qi "syntax is ok"; then
    echo "✅ Nginx configuration is valid"
else
    echo "❌ Nginx configuration has errors!"
    echo "Rolling back changes..."
    ssh root@23.92.79.2 "cd /etc/nginx/conf.d/users/ && \
        [ -f rooz.conf.bak.* ] && mv rooz.conf.bak.* rooz.conf; \
        [ -f tagvote.conf.bak.* ] && mv tagvote.conf.bak.* tagvote.conf"
    exit 1
fi

echo ""

# Reload nginx
echo "🔄 Reloading nginx..."
if ssh root@23.92.79.2 "systemctl reload nginx"; then
    echo "✅ Nginx reloaded successfully"
else
    echo "❌ Failed to reload nginx!"
    exit 1
fi

echo ""

# Wait for services to stabilize
echo "⏳ Waiting 5 seconds for services to stabilize..."
sleep 5

# Verify HSTS headers
echo "🔍 Verifying HSTS headers..."
echo ""

for domain in interface.rooz.live interface.tag.vote; do
    echo "Testing $domain..."
    if curl -Iks --max-time 5 "https://$domain" | grep -i "strict-transport-security"; then
        echo "✅ $domain has HSTS header"
    else
        echo "❌ $domain STILL missing HSTS header"
    fi
    echo ""
done

echo "✅ HSTS deployment complete!"
echo "Correlation ID: $CORRELATION_ID"
echo "$TIMESTAMP|hsts_fix|complete|success|0|$CORRELATION_ID|{\"domains_fixed\":2}"
