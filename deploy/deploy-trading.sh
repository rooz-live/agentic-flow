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

for arg in "$@"; do
  case "$arg" in
    --deploy-only)  SKIP_BUILD=true ;;
    --setup-nginx)  SETUP_NGINX=true ;;
  esac
done

echo "═══════════════════════════════════════════════════"
echo "  Trading Dashboard Deploy → ${DEPLOY_HOST}"
echo "═══════════════════════════════════════════════════"

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
if [[ ! -f "$PROJECT_ROOT/dist/index.html" ]]; then
  echo "❌ dist/index.html not found. Run without --deploy-only first."
  exit 1
fi

# 2. Deploy built assets
echo "▶ Deploying to ${DEPLOY_USER}@${DEPLOY_HOST}:${REMOTE_DASHBOARD_DIR}..."
ssh $SSH_OPTS "${DEPLOY_USER}@${DEPLOY_HOST}" "sudo mkdir -p ${REMOTE_DASHBOARD_DIR}" 2>/dev/null || true
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
echo "✅ Flask restarted"

# 6. Nginx setup (optional)
if [[ "$SETUP_NGINX" == "true" ]]; then
  echo "▶ Installing nginx config..."
  rsync -avz -e "ssh $SSH_OPTS" \
    "$PROJECT_ROOT/deploy/nginx-analytics.conf" \
    "${DEPLOY_USER}@${DEPLOY_HOST}:/tmp/nginx-analytics.conf"

  ssh $SSH_OPTS "${DEPLOY_USER}@${DEPLOY_HOST}" bash -lc "
    sudo cp /tmp/nginx-analytics.conf /etc/nginx/sites-available/analytics
    sudo ln -sf /etc/nginx/sites-available/analytics /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
    echo '✅ Nginx configured'
    
    # SSL (optional — requires DNS pointing to this server)
    if command -v certbot &>/dev/null; then
      sudo certbot --nginx -d analytics.interface.tag.ooo --non-interactive --agree-tos -m admin@interface.tag.ooo || echo '⚠️  Certbot failed (DNS may not be pointed yet)'
    fi
  "
fi

# 7. Health check
echo "▶ Health check..."
sleep 2
if ssh $SSH_OPTS "${DEPLOY_USER}@${DEPLOY_HOST}" "curl -sf http://localhost:5000/api/health" >/dev/null 2>&1; then
  echo "✅ Health check passed"
else
  echo "⚠️  Health check failed (Flask may still be starting)"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ Deploy complete"
echo "  Dashboard:  https://analytics.interface.tag.ooo/"
echo "  Trading:    https://analytics.interface.tag.ooo/trading"
echo "  API:        https://analytics.interface.tag.ooo/api/trading"
echo "  Health:     https://analytics.interface.tag.ooo/api/health"
echo "═══════════════════════════════════════════════════"
