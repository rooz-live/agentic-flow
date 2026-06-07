#!/usr/bin/env bash
set -euo pipefail
DEST="${MAIL_BACKUP_DEST:?set MAIL_BACKUP_DEST}"
SSH_KEY="${MAIL_SSH_KEY:-$HOME/.ssh/sovereign_swarm}"
REMOTE="${MAIL_REMOTE_PATH:-/home/bhopti/mail/}"
mkdir -p "$DEST/.logs"
rsync -aHAXx --partial --append-verify --numeric-ids \
  --exclude='tmp/' --exclude='.spam/' \
  -e "ssh -i $SSH_KEY -o BatchMode=yes" \
  "root@cpanel-whm:$REMOTE" "$DEST/current/"
date -u +%Y-%m-%dT%H:%M:%SZ > "$DEST/.last-sync"
echo "OK → $DEST/current"
