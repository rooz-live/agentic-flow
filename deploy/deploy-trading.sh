#!/usr/bin/env bash
set -euo pipefail

# deploy-trading.sh — Build and deploy trading dashboard to analytics.interface.tag.ooo
#
# Usage:
#   ./deploy/deploy-trading.sh                    # Full build + deploy
#   ./deploy/deploy-trading.sh --deploy-only      # Skip build, deploy existing dist/
#   ./deploy/deploy-trading.sh --setup-nginx      # Also install nginx config + certbot

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuration — override via env vars
DEPLOY_HOST="${DEPLOY_HOST:-stx-aio-0.corp.interface.tag.ooo}"
DEPLOY_USER="${DEPLOY_USER:-$(whoami)}"
DEPLOY_KEY="${DEPLOY_KEY:-}"  # Optional SSH key path
REMOTE_APP_DIR="/opt/wsjf"
REMOTE_DASHBOARD_DIR="${REMOTE_APP_DIR}/trading-dashboard"

SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=10"
[[ -n "$DEPLOY_KEY" ]] && SSH_OPTS="$SSH_OPTS -i $DEPLOY_KEY"

SKIP_BUILD=false
SETUP_NGINX=false

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "❌ Missing required command: $1"; exit 1; }
}

for arg in "$@"; do
  case "$arg" in
    --deploy-only)  SKIP_BUILD=true ;;
    --setup-nginx)  SETUP_NGINX=true ;;
  esac
done

echo "═══════════════════════════════════════════════════"
echo "  Trading Dashboard Deploy → ${DEPLOY_HOST}"
echo "═══════════════════════════════════════════════════"

require_cmd ssh
require_cmd rsync
require_cmd curl
if [[ "$SKIP_BUILD" == "false" ]]; then
  require_cmd npm
fi

# 1. Build
if [[ "$SKIP_BUILD" == "false" ]]; then
  echo "▶ Building trading dashboard..."
  cd "$PROJECT_ROOT"
  npm run trader:build
  echo "✅ Build complete: dist/"
else
  echo "⏭  Skipping build (--deploy-only)"
fi

# Verify dist exists
if [[ ! -f "$PROJECT_ROOT/dist/trading.html" && ! -f "$PROJECT_ROOT/dist/index.html" ]]; then
  echo "❌ dist/trading.html or dist/index.html not found. Run without --deploy-only first."
  exit 1
fi

# 2. Deploy built assets
echo "▶ Deploying to ${DEPLOY_USER}@${DEPLOY_HOST}:${REMOTE_DASHBOARD_DIR}..."
ssh $SSH_OPTS "${DEPLOY_USER}@${DEPLOY_HOST}" "sudo mkdir -p ${REMOTE_DASHBOARD_DIR} ${REMOTE_APP_DIR}/scripts ${REMOTE_APP_DIR}/.goalie" 2>/dev/null || true
rsync -avz --delete -e "ssh $SSH_OPTS" \
  "$PROJECT_ROOT/dist/" \
  "${DEPLOY_USER}@${DEPLOY_HOST}:${REMOTE_DASHBOARD_DIR}/"
echo "✅ Assets deployed"

# 3. Deploy Flask app + dependencies
echo "▶ Syncing Flask dashboard..."
rsync -avz -e "ssh $SSH_OPTS" \
  "$PROJECT_ROOT/scripts/web_dashboard.py" \
  "${DEPLOY_USER}@${DEPLOY_HOST}:${REMOTE_APP_DIR}/scripts/"

# 4. Sync .goalie metrics (for /api/trading to read)
rsync -avz -e "ssh $SSH_OPTS" \
  "$PROJECT_ROOT/.goalie/pattern_metrics.jsonl" \
  "${DEPLOY_USER}@${DEPLOY_HOST}:${REMOTE_APP_DIR}/.goalie/" 2>/dev/null || echo "⚠️  No metrics to sync"

# 5. Restart Flask
echo "▶ Restarting Flask dashboard on remote..."
ssh $SSH_OPTS "${DEPLOY_USER}@${DEPLOY_HOST}" bash -lc "
  cd ${REMOTE_APP_DIR}
  pkill -f 'web_dashboard.py' 2>/dev/null || true
  sleep 1
  PROJECT_ROOT=${REMOTE_APP_DIR} nohup python3 scripts/web_dashboard.py --host 0.0.0.0 --port 5000 > /var/log/wsjf-dashboard.log 2>&1 &
  echo 'Flask PID: '\$!
"
echo "✅ Flask restart command issued"

# 6. Nginx setup (optional)
# Uses cPanel Nginx include directory — NOT sites-available (cPanel manages its own server blocks)
CPANEL_INCLUDE_DIR="/etc/nginx/conf.d/users/tag/analytics.interface.tag.ooo"
if [[ "$SETUP_NGINX" == "true" ]]; then
  echo "▶ Installing cPanel Nginx include config..."
  rsync -avz -e "ssh $SSH_OPTS" \
    "$PROJECT_ROOT/deploy/cpanel-flask-proxy.conf" \
    "${DEPLOY_USER}@${DEPLOY_HOST}:/tmp/flask-proxy.conf"

  ssh $SSH_OPTS "${DEPLOY_USER}@${DEPLOY_HOST}" bash -lc "
    sudo mkdir -p ${CPANEL_INCLUDE_DIR}
    sudo cp /tmp/flask-proxy.conf ${CPANEL_INCLUDE_DIR}/flask-proxy.conf
    sudo nginx -t && sudo systemctl reload nginx
    echo '✅ cPanel Nginx include configured'
  "
fi

# 7. Health check
echo "▶ Health check..."
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if ssh $SSH_OPTS "${DEPLOY_USER}@${DEPLOY_HOST}" "curl -sf http://localhost:5000/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
if ssh $SSH_OPTS "${DEPLOY_USER}@${DEPLOY_HOST}" "curl -sf http://localhost:5000/api/health" >/dev/null 2>&1; then
  echo "✅ Health check passed"
else
  echo "⚠️  Health check failed on remote Flask endpoint"
fi

if curl -ksf "https://analytics.interface.tag.ooo/api/health" >/dev/null 2>&1; then
  echo "✅ Public TLD health endpoint reachable"
else
  echo "⚠️  Public TLD health endpoint not reachable yet"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ Deploy complete"
echo "  Dashboard:  https://analytics.interface.tag.ooo/"
echo "  Trading:    https://analytics.interface.tag.ooo/trading"
echo "  API:        https://analytics.interface.tag.ooo/api/trading"
echo "  Health:     https://analytics.interface.tag.ooo/api/health"
echo "═══════════════════════════════════════════════════"
