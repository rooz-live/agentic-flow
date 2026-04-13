#!/usr/bin/env bash
set -euo pipefail

# Deploy flask-proxy.conf to server
# Copies canonical config from repo → server, validates, reloads Nginx

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/source-cpanel-env.sh
source "$SCRIPT_DIR/../lib/source-cpanel-env.sh"
source_cpanel_env_init "$SCRIPT_DIR"

SSH_HOST="${CPANEL_SSH_HOST:-rooz-aws}"
LOCAL_CONF="$SCRIPT_DIR/flask-proxy.conf"
REMOTE_DIR="/etc/nginx/conf.d/users/tag/analytics.interface.tag.ooo"
REMOTE_CONF="$REMOTE_DIR/flask-proxy.conf"

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

if [ ! -f "$LOCAL_CONF" ]; then
    echo -e "${RED}Error: $LOCAL_CONF not found${NC}"
    exit 1
fi

echo -e "${CYAN}Deploying flask-proxy.conf to $SSH_HOST...${NC}"

# Backup current remote config
echo "  Backing up remote config..."
ssh -o ConnectTimeout=10 -o BatchMode=yes "$SSH_HOST" \
    "sudo cp $REMOTE_CONF ${REMOTE_CONF}.bak.\$(date +%Y%m%d_%H%M%S) 2>/dev/null || true"

# Upload new config
echo "  Uploading..."
scp -o ConnectTimeout=10 "$LOCAL_CONF" "/tmp/flask-proxy.conf.upload"
ssh -o ConnectTimeout=10 -o BatchMode=yes "$SSH_HOST" \
    "sudo mv /tmp/flask-proxy.conf.upload $REMOTE_CONF && sudo chown root:root $REMOTE_CONF"

# Validate
echo "  Validating nginx config..."
if ssh -o ConnectTimeout=10 -o BatchMode=yes "$SSH_HOST" "sudo nginx -t 2>&1"; then
    echo "  Reloading nginx..."
    ssh -o ConnectTimeout=10 -o BatchMode=yes "$SSH_HOST" "sudo systemctl reload nginx"
    echo -e "${GREEN}✓ Deployed and reloaded${NC}"

    # Verify health
    sleep 1
    STATUS=$(curl -so /dev/null -w "%{http_code}" --connect-timeout 5 https://analytics.interface.tag.ooo/health 2>/dev/null || echo "000")
    if [ "$STATUS" = "200" ]; then
        echo -e "${GREEN}✓ Health check: $STATUS${NC}"
    else
        echo -e "${RED}⚠ Health check: $STATUS (check Flask app)${NC}"
    fi
else
    echo -e "${RED}✗ Nginx config test failed — rolling back${NC}"
    ssh -o ConnectTimeout=10 -o BatchMode=yes "$SSH_HOST" \
        "sudo cp \$(ls -t ${REMOTE_CONF}.bak.* | head -1) $REMOTE_CONF && sudo nginx -t && sudo systemctl reload nginx"
    echo -e "${RED}Rollback complete${NC}"
    exit 1
fi
