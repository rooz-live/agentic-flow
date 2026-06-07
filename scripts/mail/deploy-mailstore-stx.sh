#!/usr/bin/env bash
# Deploy Wave A MailStore stack to STX and rebuild container.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck disable=SC1091
source "$(dirname "$0")/_mail_infra_env.sh"
STX="${STX_SSH_HOST:-stx}"
KEY="${STX_KEY:-$HOME/.ssh/starlingx_key}"
REMOTE_DIR="${STX_MAIL_DIR:-/home/ubuntu/mail}"

rsync -az -e "ssh -p 2222 -i $KEY" \
  "$REPO_ROOT/deploy/mail/Dockerfile" \
  "$REPO_ROOT/deploy/mail/mock_server.py" \
  "$REPO_ROOT/deploy/mail/imap_ingest.py" \
  "$REPO_ROOT/deploy/mail/docker-compose.mailstore.yml" \
  "$STX:$REMOTE_DIR/"

if [[ -f "$REPO_ROOT/deploy/mail/.env.stx" ]]; then
  scp -P 2222 -i "$KEY" "$REPO_ROOT/deploy/mail/.env.stx" "$STX:$REMOTE_DIR/.env"
elif [[ ! -f "$REMOTE_DIR/.env" ]]; then
  echo "FAIL: create deploy/mail/.env.stx with IMAP_INGEST_* (gitignored) or pre-place $REMOTE_DIR/.env on STX" >&2
  exit 1
fi

ssh -p 2222 -i "$KEY" "$STX" "cd $REMOTE_DIR && sudo docker rm -f mailstore-server 2>/dev/null || true; sudo docker compose -f docker-compose.mailstore.yml up -d --build --force-recreate"
echo "OK MailStore redeployed on STX"
