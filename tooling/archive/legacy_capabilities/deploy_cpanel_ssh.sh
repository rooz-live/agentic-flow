#!/usr/bin/env bash

# =======================================================
# SYSTEMIC.OS - CPANEL SSH/VAULT PUSH DEPLOYMENT
# =======================================================
# Bypasses Kubernetes overhead directly dropping static React components
# into the CPanel TLD public_html/ layer instantly.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuration Limits (Can be pulled from 1Password CLI `op` implicitly)
CPANEL_HOST="${CPANEL_HOST:-tag.ooo}"
CPANEL_USER="${CPANEL_USER:-admin}"
CPANEL_TARGET_DIR="${CPANEL_TARGET_DIR:-public_html/governance}"

echo "======================================================="
echo "🚀 INITIATING PHYSICAL SECURE TLD DEPLOYMENT (CPANEL)"
echo "======================================================="

# 1. Build the production React boundary
echo "--> 1. Compiling strictly physical Vite bundle sequences..."
cd "$ROOT_DIR"
npm run build

if [ ! -d "dist" ]; then
    echo "❌ FATAL: React Production Build dropped. Halting deployment."
    exit 1
fi

# 2. RSYNC Deploy Pipe
# Utilizing sshpass for password Vault execution if port 2222/22 SSH Keys aren't mounted natively.
echo "--> 2. Opening Vault mapping physical TLD transfer..."
echo "Targeting: $CPANEL_USER@$CPANEL_HOST:~/$CPANEL_TARGET_DIR"

if [ -z "${CPANEL_PASSWORD:-}" ]; then
    echo "⚠️ NOTE: CPANEL_PASSWORD vaulted variable not detected."
    echo "Defaulting to OpenSSH Key Native Handshake (Ensure your ~/.ssh bounds are populated)."
    
    # Generic SSH push
    rsync -avz --delete -e "ssh -o StrictHostKeyChecking=accept-new" dist/ "$CPANEL_USER@$CPANEL_HOST:~/$CPANEL_TARGET_DIR/"
else
    echo "🔒 Vault Authorization Engaged."
    sshpass -p "$CPANEL_PASSWORD" rsync -avz --delete -e "ssh -o StrictHostKeyChecking=accept-new" dist/ "$CPANEL_USER@$CPANEL_HOST:~/$CPANEL_TARGET_DIR/"
fi

echo "======================================================="
echo "🟢 CPANEL DOMAIN TRANSFER COMPLETE!"
echo "Check your governance boards at: https://$CPANEL_HOST/governance"
echo "======================================================="
exit 0
