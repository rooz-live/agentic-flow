#!/usr/bin/env bash
set -euo pipefail

# TLS Cert Issue Script - Dry Run / Echo Mode
# Usage: ./tls_cert_issue.sh [--prod-echo]
# No real certbot execution or sudo. Echoes the command only.

DOMAINS="hostbill.interface.tag.ooo,stx.interface.tag.ooo"
EMAIL="admin@interface.tag.ooo"
STAGING_SERVER="https://acme-staging-v02.api.letsencrypt.org/directory"
PROD_SERVER="https://acme-v02.api.letsencrypt.org/directory"

MODE="${1:-dry-run}"
case "$MODE" in
  --prod-echo)
    SERVER="$PROD_SERVER"
    DRY_RUN="--dry-run"
    ;;
  *)
    SERVER="$STAGING_SERVER"
    DRY_RUN="--dry-run"
    ;;
esac

CMD="certbot certonly --standalone $DRY_RUN --email $EMAIL --server $SERVER --agree-tos --non-interactive -d $DOMAINS"

echo "=== TLS Certbot Command ($MODE) ==="
echo "$CMD"
echo ""
echo "Notes:"
echo "- Standalone mode requires port 80 free."
echo "- For real issuance: install certbot, run on target server (HostBill/StarlingX), remove --dry-run, add sudo if needed."
echo "- SANs configured for both domains."
echo "- Integrates with STARLINGX_SERVER from .env."
echo "- SSH access via ~/.ssh/starlingx_key for deploys."
