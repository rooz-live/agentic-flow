#!/bin/bash
# High-Velocity Password-Backed Physical Sync to cPanel (Sovereign Swarm)

echo "🚀 Initiating Password-Backed Physical Sync to cPanel Subdomains..."

if [ -f "/Users/shahroozbhopti/Documents/code/.env" ]; then
    set -a
    source "/Users/shahroozbhopti/Documents/code/.env"
    set +a
fi

TARGET_USER="ogov"
CPANEL_HOST="yo.tag.ooo"
BUILD_DIR="/Users/shahroozbhopti/Documents/code/swarm-core-app/dist/"

# Resolve 1Password reference
if [[ "$OGOV_PASSWORD" == op://* ]]; then
    echo "🔐 Unlocking 1Password Vault for ogov..."
    OGOV_PASS=$(op read "$OGOV_PASSWORD")
else
    OGOV_PASS="$OGOV_PASSWORD"
fi

export SSHPASS="$OGOV_PASS"

echo "📤 Syncing payload to rootdomain (o-gov.com)..."
sshpass -e rsync -avz --no-perms --no-owner --no-group -e "ssh -p 2222 -o StrictHostKeyChecking=no -o PubkeyAuthentication=no" "$BUILD_DIR" "$TARGET_USER@$CPANEL_HOST:/home/$TARGET_USER/public_html/"

echo "📤 Syncing payload to investing.o-gov.com..."
sshpass -e rsync -avz --no-perms --no-owner --no-group -e "ssh -p 2222 -o StrictHostKeyChecking=no -o PubkeyAuthentication=no" "$BUILD_DIR" "$TARGET_USER@$CPANEL_HOST:/home/$TARGET_USER/public_html/investing/"

echo "📤 Syncing payload to fitness.o-gov.com..."
sshpass -e rsync -avz --no-perms --no-owner --no-group -e "ssh -p 2222 -o StrictHostKeyChecking=no -o PubkeyAuthentication=no" "$BUILD_DIR" "$TARGET_USER@$CPANEL_HOST:/home/$TARGET_USER/public_html/fitness/"

echo "✅ Physical Sync Complete. Phase 1 Architecturally Sealed."
