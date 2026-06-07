#!/usr/bin/env bash
set -euo pipefail
DEST="${MAIL_BACKUP_DEST:?set MAIL_BACKUP_DEST}"
SSH_KEY="${MAIL_SSH_KEY:-$HOME/.ssh/sovereign_swarm}"
STX_KEY="${STX_KEY:-$HOME/.ssh/starlingx_key}"

mkdir -p "$DEST/cpanel-mail" "$DEST/cpanel-comet" "$DEST/stx-mail-config" "$DEST/stx-mailstore-data" "$DEST/.logs"

echo "=== Syncing cPanel MailDirs ==="
rsync -aHAXx --partial --append-verify --numeric-ids \
  --exclude='tmp/' --exclude='.spam/' \
  -e "ssh -i $SSH_KEY -o BatchMode=yes" \
  "root@cpanel-whm:/home/bhopti/mail/" "$DEST/cpanel-mail/"

echo "=== Syncing cPanel Comet configs ==="
rsync -aHAXx --partial --append-verify --numeric-ids \
  -e "ssh -i $SSH_KEY -o BatchMode=yes" \
  "root@cpanel-whm:/var/cpanel/comet/" "$DEST/cpanel-comet/"

echo "=== Syncing STX mail configs ==="
rsync -aHAXx --partial --append-verify --numeric-ids \
  -e "ssh -i $STX_KEY -o BatchMode=yes" \
  "ubuntu@stx:/home/ubuntu/mail/" "$DEST/stx-mail-config/"

echo "=== Syncing STX MailStore data volume ==="
rsync -aHAXx --partial --append-verify --numeric-ids \
  --rsync-path="sudo rsync" \
  -e "ssh -i $STX_KEY -o BatchMode=yes" \
  "ubuntu@stx:/mnt/nova/docker/volumes/mail_mailstore_data/_data/" "$DEST/stx-mailstore-data/"

date -u +%Y-%m-%dT%H:%M:%SZ > "$DEST/.last-sync"
echo "OK → $DEST"
