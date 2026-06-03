#!/bin/bash
ACCOUNTS=("bhopti" "rooz" "tag" "yocloud" "artchat" "chatfans" "cwleader" "decisioncall" "eneu" "eudm" "foundassion" "goodread" "iconoclash" "masslessmassive" "mbo" "nwn" "ogov" "paycom" "pub3030" "quoteparty" "rethinkr" "splitcite" "tagvote" "yo" "yoclouddev" "yoservice")
BACKUP_DIR="/Volumes/cPanelBackups/incremental/home"
CPANEL_HOST="cpanel-whm"
SSH_KEY="$HOME/.ssh/sovereign_swarm"
export SSH_AUTH_SOCK=""

for account in "${ACCOUNTS[@]}"; do
    if [ -d "$BACKUP_DIR/$account/.spamassassin" ]; then
        echo "Pushing Spam protections for $account..."
        caffeinate -i -m -s -d rsync -avz -e "ssh -o IdentitiesOnly=yes -i $SSH_KEY" "$BACKUP_DIR/$account/.spamassassin" "$BACKUP_DIR/$account/.filter*" "$BACKUP_DIR/$account/.cpanel/email_filters*" "root@$CPANEL_HOST:/home/$account/" 2>/dev/null || true
        ssh -o IdentitiesOnly=yes -i $SSH_KEY root@$CPANEL_HOST "chown -R $account:$account /home/$account/.spamassassin /home/$account/.filter* /home/$account/.cpanel/email_filters* 2>/dev/null || true"
    fi
done
echo "All Spam Protections restored."
