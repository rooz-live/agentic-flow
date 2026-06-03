#!/bin/bash
# ==============================================================================
# SOVEREIGN SWARM: Autonomous Credential Rotation Engine
# Objective: Zero-Touch, High-Frequency Password Cycling via UAPI & Vaults
# ==============================================================================

DOMAIN=$1
USER_PREFIX=$2
CPANEL_ACCOUNT=$3
OP_ITEM_ID=$4

if [ -z "$OP_ITEM_ID" ]; then
    echo "Usage: ./scripts/swarm_credential_rotation.sh <domain> <user_prefix> <cpanel_account> <op_item_id>"
    echo "Example: ./scripts/swarm_credential_rotation.sh 720.chat yo c720 c4s4ocp64ucxabua6l5kmkzav4"
    exit 1
fi

echo "🚨 [SWARM] Initiating Credential Rotation for: ${USER_PREFIX}@${DOMAIN}"

# 1. Cryptographic Generation
NEW_PASSWORD=$(openssl rand -base64 24)

# 2. Edge Enforcement (UAPI)
echo "--> Pushing to WHM/UAPI Edge..."
ssh -o IdentitiesOnly=yes -i ~/.ssh/sovereign_swarm root@cpanel-whm \
    "uapi --user=$CPANEL_ACCOUNT Email passwd_pop email=$USER_PREFIX domain=$DOMAIN password='$NEW_PASSWORD'"

if [ $? -eq 0 ]; then
    echo "✅ UAPI Edge Update Successful."
else
    echo "❌ UAPI Edge Update Failed. Aborting Vault Sync."
    exit 1
fi

# 3. Vault Synchronization (1Password)
echo "--> Synchronizing 1Password (OP) Vault..."
source .env.swarm
op item edit "$OP_ITEM_ID" password="$NEW_PASSWORD" --vault="Dev"
if [ $? -eq 0 ]; then
    echo "✅ OP Vault Synced."
else
    echo "❌ OP Vault Sync Failed."
    exit 1
fi

echo "=============================================================================="
echo "🎯 Swarm Rotation Complete. Parity Achieved across Edge and Vaults."
echo "=============================================================================="
