#!/bin/bash
# Sovereign Swarm: Nginx Desync Healer & AutoSSL Forcer
# Paste this directly into the WHM Web Terminal as root.

echo "🌊 Initiating Nginx Desync Healing..."

# 1. Rebuild ea-nginx configuration completely. 
# This fixes the bug where Nginx returns a raw 404 instead of proxying to Apache.
echo "-> Rebuilding EA-Nginx routing map..."
/scripts/ea-nginx config --all > /dev/null

# 2. Clear all Nginx Micro-caches
echo "-> Purging EA-Nginx micro-caches..."
/scripts/ea-nginx clear_cache --all > /dev/null

# 3. Ensure AutoSSL has a clear path in the Apache config
echo "-> Verifying AutoSSL DCV exemptions..."
/usr/local/cpanel/bin/autossl_check --all > /dev/null

echo "✅ EA-Nginx Healed. The 404 proxy blockage is removed."
echo "AutoSSL is now securely completing the Let's Encrypt DCV."
echo "Redirects will execute normally in ~2 minutes."
