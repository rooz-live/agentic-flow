#!/bin/bash
# =========================================================================
# SYSTEMIC.OS - OMNI-REHYDRATION: ALL CPANEL ACCOUNTS
# =========================================================================
# P0: Restores decades of EML and WEB data for ALL missing/overwritten accounts
# from the physical incremental backup.
# =========================================================================

set -euo pipefail

# Utilize the ProxyJump alias defined in ~/.ssh/config and the dedicated cPanel key
export SSH_KEY="$HOME/.ssh/sovereign_swarm"
export CPANEL_HOST="cpanel-whm"
BACKUP_DIR="/Volumes/cPanelBackups/incremental/home"

echo "🚨 [P0 RESTORE] Initiating Omni-Rehydration for ALL cPanel accounts..."
echo "Source: $BACKUP_DIR"
echo "Target: root@$CPANEL_HOST:/home/"

ACCOUNTS=(
    "bhopti" "rooz" "tag" "yocloud" "artchat" "chatfans" 
    "cwleader" "decisioncall" "eneu" "eudm" "foundassion" 
    "goodread" "iconoclash" "masslessmassive" "mbo" "nwn" 
    "ogov" "paycom" "pub3030" "quoteparty" "rethinkr" 
    "splitcite" "tagvote" "yo" "yoclouddev" "yoservice"
)

# Crucial: Export SSH_AUTH_SOCK="" to prevent 1Password Agent 
# from triggering "Too many authentication failures" during the ProxyJump.
export SSH_AUTH_SOCK=""
RSYNC_CMD="rsync -avz --progress -e \"ssh -o IdentitiesOnly=yes -i $SSH_KEY -o StrictHostKeyChecking=accept-new\""

for account in "${ACCOUNTS[@]}"; do
    echo "====================================================================="
    echo "🔄 Rehydrating Account: $account"
    
    echo "   --> Checking if account exists on Edge..."
    if ! ssh -o IdentitiesOnly=yes -i $SSH_KEY root@$CPANEL_HOST "test -d /home/$account"; then
        echo "   --> ⚠️ Account /home/$account NOT FOUND on KVM Edge. Skipping to avoid void dump."
        continue
    fi

    if [ -d "$BACKUP_DIR/$account/mail" ]; then
        echo "   --> Pushing Mail for $account..."
        eval "caffeinate -i -m -s -d $RSYNC_CMD $BACKUP_DIR/$account/mail/ root@$CPANEL_HOST:/home/$account/mail/"
    else
        echo "   --> No mail directory found for $account locally."
    fi

    if [ -d "$BACKUP_DIR/$account/public_html" ]; then
        echo "   --> Pushing Web Assets for $account..."
        eval "caffeinate -i -m -s -d $RSYNC_CMD $BACKUP_DIR/$account/public_html/ root@$CPANEL_HOST:/home/$account/public_html/"
    else
        echo "   --> No public_html found for $account locally."
    fi

    echo "   --> Enforcing cPanel ownership & mail permissions..."
    ssh -o IdentitiesOnly=yes -i $SSH_KEY root@$CPANEL_HOST "/usr/local/cpanel/scripts/chownpublichtmls && /usr/local/cpanel/scripts/mailperm $account" || true
done

echo "====================================================================="
echo "✅ P0 OMNI-REHYDRATION COMPLETE."
