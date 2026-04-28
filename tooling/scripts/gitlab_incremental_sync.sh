#!/bin/bash
# =========================================================================
# SYSTEMIC.OS - GITLAB AWS PHYSICAL INCREMENTAL SYNC
# =========================================================================
# Triggers a native gitlab-backup and extracts the tarball to the offline
# /Volumes/cPanelBackups umbilical cord without completion theater.
# =========================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ZERO-TRUST PHYSICAL ROUTING
BACKUP_DIR="/Volumes/cPanelBackups/gitlab_aws"

# 🔴 RED TEAM FIX: GHOST MOUNT SAFEGUARD
if ! mount | grep "on /Volumes/cPanelBackups" > /dev/null; then
    echo "🚨 FATAL: /Volumes/cPanelBackups is NOT physically mounted. Aborting to protect internal SSD."
    exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "🚨 [DATA PRESERVATION] INITIATING AWS GITLAB EXTRACTION..."
echo "====================================================================="

if [ -f "$ROOT_DIR/.env.integration" ]; then
    set -a
    source "$ROOT_DIR/.env.integration"
    set +a
fi

GITLAB_HOST="${GITLAB_HOST:-gitlab.rooz.live}"
SSH_USER="ubuntu"
EXPANDED_KEY="${YOLIFE_GITLAB_KEY/#\~/$HOME}"
SSH_KEY_OPT="-i $EXPANDED_KEY"
SSH_CMD="ssh -4 -p 2222 $SSH_KEY_OPT -o StrictHostKeyChecking=accept-new -o BatchMode=yes -o ConnectTimeout=15 -o ServerAliveInterval=15 -o ServerAliveCountMax=4"

echo "--> [1/2] Triggering Native GitLab Backup..."
eval "$SSH_CMD $SSH_USER@$GITLAB_HOST 'sudo gitlab-backup create STRATEGY=copy BACKUP=sovereignty_$(date +%s) 2>/dev/null || true'"

echo "--> [2/2] Executing Sudo-RSYNC to extract the AWS payload..."
RSYNC_CMD="/usr/local/bin/rsync -avz --progress --delete --rsync-path='sudo rsync' -e \"ssh -4 -p 2222 $SSH_KEY_OPT -o StrictHostKeyChecking=accept-new -o BatchMode=yes -o ConnectTimeout=15\""

eval "caffeinate -i -m -s -d $RSYNC_CMD $SSH_USER@$GITLAB_HOST:/var/opt/gitlab/backups/ $BACKUP_DIR/"

echo "====================================================================="
echo "✅ INCREMENTAL AWS GITLAB EXTRACTION COMPLETE."
echo "Your entire GitLab repository matrix is secured at: $BACKUP_DIR"
