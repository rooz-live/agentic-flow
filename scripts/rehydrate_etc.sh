#!/bin/bash
ACCOUNTS=("bhopti" "rooz" "tag" "yocloud" "artchat" "chatfans" "cwleader" "decisioncall" "eneu" "eudm" "foundassion" "goodread" "iconoclash" "masslessmassive" "mbo" "nwn" "ogov" "paycom" "pub3030" "quoteparty" "rethinkr" "splitcite" "tagvote" "yo" "yoclouddev" "yoservice")
BACKUP_DIR="/Volumes/cPanelBackups/incremental/home"
CPANEL_HOST="cpanel-whm"
SSH_KEY="$HOME/.ssh/sovereign_swarm"
export SSH_AUTH_SOCK=""

for account in "${ACCOUNTS[@]}"; do
    if [ -d "$BACKUP_DIR/$account/etc" ]; then
        echo "Pushing etc for $account..."
        caffeinate -i -m -s -d rsync -avz -e "ssh -o IdentitiesOnly=yes -i $SSH_KEY" "$BACKUP_DIR/$account/etc/" "root@$CPANEL_HOST:/home/$account/etc/"
        ssh -o IdentitiesOnly=yes -i $SSH_KEY root@$CPANEL_HOST "chown -R $account:mail /home/$account/etc && /scripts/mailperm $account"
    fi
done
echo "All ETC restored."
