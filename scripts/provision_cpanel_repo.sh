#!/bin/bash
set -e

source .env

echo "🌊 Initiating Agentic Wave: cPanel UAPI Git Provisioning"

# We now use strict Cryptographic Identity via ~/.ssh/sovereign_swarm.
# No password extraction needed.

CPANEL_PORT=${CPANEL_PORT:-2222}
REPO_NAME="sovereign-swarm"
REPO_PATH="/home/${CPANEL_USER}/repositories/${REPO_NAME}"

echo "🚀 Instructing WHM/cPanel to instantiate Version Control at $REPO_PATH (Port $CPANEL_PORT)..."

# 2. Execute UAPI over SSH to construct the Sovereign Git Repository
# This creates a completely independent remote Git server on yo.tag.ooo using Cryptographic Keys
ssh -i ~/.ssh/sovereign_swarm -p ${CPANEL_PORT} -o StrictHostKeyChecking=no -o IdentitiesOnly=yes ${CPANEL_USER}@${CPANEL_HOST} << EOF
    # Ensure the repositories directory exists
    mkdir -p /home/${CPANEL_USER}/repositories

    # Execute cPanel UAPI to create the Git repository
    uapi --user=${CPANEL_USER} VersionControl create \
        type=git \
        name=${REPO_NAME} \
        repository_root=${REPO_PATH} \
        source_repository='{"remote_name":"origin"}'

    echo "✅ cPanel Git Repository successfully provisioned."
EOF

echo "🔗 Binding local context to Sovereign Remote..."
git remote add cpanel "ssh://${CPANEL_USER}@${CPANEL_HOST}:${CPANEL_PORT}${REPO_PATH}" || echo "Remote 'cpanel' already exists."

echo "✅ Swarm is now capable of a direct deployment via: git push cpanel main"
