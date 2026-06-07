#!/usr/bin/env bash
# FA: wire MDOD-A3 — create/rotate mailarchive@bhopti.com, deploy ingest to STX, capture evidence.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck disable=SC1091
source "$(dirname "$0")/_mail_infra_env.sh"
IMAP_USER="${IMAP_INGEST_USER:-mailarchive@bhopti.com}"
IMAP_PW="${IMAP_INGEST_PASSWORD:-$(openssl rand -base64 18 | tr -d '/+=' | head -c 24)}"

ssh -o BatchMode=yes "$CPANEL_SSH_HOST" \
  "uapi --user=bhopti Email add_pop email=mailarchive password='${IMAP_PW}' quota=256 2>/dev/null || \
   uapi --user=bhopti Email passwd_pop email=mailarchive password='${IMAP_PW}'"

cat > "$REPO_ROOT/deploy/mail/.env.stx" << ENV
MAILSTORE_ADMIN_PASSWORD=\${MAILSTORE_ADMIN_PASSWORD:-changeme-local-dev}
IMAP_SOURCE_HOST=cpanel-whm
IMAP_SOURCE_PORT=993
IMAP_INGEST_USER=${IMAP_USER}
IMAP_INGEST_PASSWORD=${IMAP_PW}
IMAP_EXCLUDE_DOMAINS=rooz.live
IMAP_INGEST_INTERVAL_SEC=300
ENV
chmod 600 "$REPO_ROOT/deploy/mail/.env.stx"

bash "$(dirname "$0")/deploy-mailstore-stx.sh"
bash "$(dirname "$0")/capture-mailstore-evidence.sh"

if command -v op >/dev/null 2>&1; then
  op item edit "${OP_WHM_ITEM_ID:-smpwr2wngwbkqu2nxiywb6smoq}" --vault "${OP_WHM_VAULT:-Personal}" \
    "mailarchive imap user=${IMAP_USER}" \
    "mailarchive imap password=${IMAP_PW}" >/dev/null 2>&1 || \
    echo "WARN: op sync skipped — unlock 1Password and re-run whm-op-sync or edit WHM CP root"
fi

rm -f "$REPO_ROOT/deploy/mail/.env.stx"
echo "OK wired MDOD-A3 — check .goalie/evidence/mail/mailstore_*.json"
