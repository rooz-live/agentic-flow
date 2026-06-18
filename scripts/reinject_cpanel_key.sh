#!/bin/bash
set -euo pipefail

# R-2026-020: Sovereign Swarm Agentic Key Re-injection
# This script extracts the real WHM password from 1Password and uses the cPanel UAPI
# to securely re-inject the SSH key back into authorized_keys after the K8s STX upgrade.

ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Missing .env file in $(pwd)"
    exit 1
fi

source "$ENV_FILE"

echo "🔑 Authenticating with 1Password to retrieve CPANEL_PASSWORD..."
# We wrap this in a check in case the terminal is headless
if ! op whoami &>/dev/null; then
    echo "⚠️  1Password CLI is not signed in."
    echo "Please run: eval \$(op signin) or sign in to the 1Password desktop app to unlock the CLI."
    exit 1
fi

CPANEL_PASS=$(op read "$CPANEL_PASSWORD")
PUB_KEY=$(cat ~/.ssh/sovereign_swarm.pub)

echo "📦 Sovereign Swarm Public Key acquired."
echo "🚀 Transmitting payload to cPanel API via secure channel..."

# URL encode the public key
ENCODED_KEY=$(jq -rn --arg x "$PUB_KEY" '$x|@uri')

# Import the key to cPanel
echo "-> Importing SSH Key..."
curl -s -X POST "https://${CPANEL_HOST}:2083/execute/SSH/import_key" \
    -u "${CPANEL_USER}:${CPANEL_PASS}" \
    -d "name=sovereign_swarm" \
    -d "publickey=${ENCODED_KEY}" > .goalie/evidence/cpanel_import_result.json

cat .goalie/evidence/cpanel_import_result.json

# Authorize the key
echo "-> Authorizing SSH Key..."
curl -s -X POST "https://${CPANEL_HOST}:2083/execute/SSH/auth_key" \
    -u "${CPANEL_USER}:${CPANEL_PASS}" \
    -d "key=sovereign_swarm" \
    -d "action=authorize" > .goalie/evidence/cpanel_auth_result.json

cat .goalie/evidence/cpanel_auth_result.json

echo "✅ Sovereign Swarm Key Re-injection procedure executed."
echo "Please verify by running: ssh -i ~/.ssh/sovereign_swarm -p 2222 ${CPANEL_USER}@${CPANEL_HOST}"
