#!/bin/bash
# Fix DNS and Provision Subdomains via UAPI

echo "🌊 Authenticating and resolving 1Password secrets..."
if [ -f "/Users/shahroozbhopti/Documents/code/.env" ]; then
    set -a
    source "/Users/shahroozbhopti/Documents/code/.env"
    set +a
fi

if [[ "$CPANEL_PASSWORD" == op://* ]]; then
    # This might prompt TouchID if 1Password is locked!
    CPANEL_PASSWORD=$(op read "$CPANEL_PASSWORD")
fi

CPANEL_HOST="yo.tag.ooo"
CPANEL_USER="nwn"
TARGET_USER="ogov"

echo "🏗️ Injecting physical UAPI commands to yo.tag.ooo for user: ogov"

# 1. Create investing.o-gov.com
sshpass -p "$CPANEL_PASSWORD" ssh -p 2222 -o StrictHostKeyChecking=no -o PubkeyAuthentication=no "$CPANEL_USER@$CPANEL_HOST" "uapi --user=$TARGET_USER SubDomain addsubdomain domain=investing rootdomain=o-gov.com dir=public_html/investing"

# 2. Create fitness.o-gov.com
sshpass -p "$CPANEL_PASSWORD" ssh -p 2222 -o StrictHostKeyChecking=no -o PubkeyAuthentication=no "$CPANEL_USER@$CPANEL_HOST" "uapi --user=$TARGET_USER SubDomain addsubdomain domain=fitness rootdomain=o-gov.com dir=public_html/fitness"

echo "✅ UAPI Subdomain creation executed."

echo "🚀 Building production assets..."
cd /Users/shahroozbhopti/Documents/code/swarm-core-app
npm run build

echo "📤 Syncing build payloads directly to cPanel..."
sshpass -p "$CPANEL_PASSWORD" rsync -avz --no-perms --no-owner --no-group -e "ssh -p 2222 -o StrictHostKeyChecking=no -o PubkeyAuthentication=no" dist/ "$CPANEL_USER@$CPANEL_HOST:/home/$TARGET_USER/public_html/"
sshpass -p "$CPANEL_PASSWORD" rsync -avz --no-perms --no-owner --no-group -e "ssh -p 2222 -o StrictHostKeyChecking=no -o PubkeyAuthentication=no" dist/ "$CPANEL_USER@$CPANEL_HOST:/home/$TARGET_USER/public_html/investing/"
sshpass -p "$CPANEL_PASSWORD" rsync -avz --no-perms --no-owner --no-group -e "ssh -p 2222 -o StrictHostKeyChecking=no -o PubkeyAuthentication=no" dist/ "$CPANEL_USER@$CPANEL_HOST:/home/$TARGET_USER/public_html/fitness/"

echo "🏁 Swarm Deployment Complete. True production logic achieved."
