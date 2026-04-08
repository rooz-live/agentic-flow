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
# Guard clause: DEPLOY_USER must not default to local whoami (RCA: local username
# doesn't exist on remote server, causing password prompt instead of key auth)
DEPLOY_HOST="${DEPLOY_HOST:-stx-aio-0.corp.interface.tag.ooo}"
DEPLOY_USER="${DEPLOY_USER:-ubuntu}"
DEPLOY_KEY="${DEPLOY_KEY:-$HOME/.ssh/starlingx_key}"
DEPLOY_PORT="${DEPLOY_PORT:-2222}"
REMOTE_APP_DIR="/opt/wsjf"
REMOTE_DASHBOARD_DIR="${REMOTE_APP_DIR}/trading-dashboard"

SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=10 -p ${DEPLOY_PORT}"
[[ -n "$DEPLOY_KEY" && -f "$DEPLOY_KEY" ]] && SSH_OPTS="$SSH_OPTS -i $DEPLOY_KEY"

# Guard clause: fail fast if key doesn't exist
if [[ ! -f "$DEPLOY_KEY" ]]; then
  echo "❌ SSH key not found: $DEPLOY_KEY"
  echo "   Set DEPLOY_KEY=/path/to/key or ensure ~/.ssh/starlingx_key exists"
  exit 1
fi

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
# IMPORTANT: use trader:build:tld (--base=/trading/) not trader:build (--base=/).
# Vite builds asset paths relative to --base. Without this, the bundle generates
# /assets/trading-*.js (absolute root) which nginx serves 404 because Flask routes
# assets under /trading/<path>. With --base=/trading/ the HTML references
# /trading/assets/trading-*.js which the Flask /trading/<path:filename> route handles.
if [[ "$SKIP_BUILD" == "false" ]]; then
  echo "▶ Building trading dashboard (--base=/trading/)..."
  cd "$PROJECT_ROOT"
  npm run trader:build:tld
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
ssh $SSH_OPTS "${DEPLOY_USER}@${DEPLOY_HOST}" \
  "sudo mkdir -p ${REMOTE_DASHBOARD_DIR} ${REMOTE_APP_DIR}/scripts ${REMOTE_APP_DIR}/.goalie ${REMOTE_APP_DIR}/logs && sudo chown -R ${DEPLOY_USER}:${DEPLOY_USER} ${REMOTE_APP_DIR}" 2>/dev/null || true
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
for jsonl in pattern_metrics.jsonl trading_signals.jsonl; do
  if [[ -f "$PROJECT_ROOT/.goalie/$jsonl" ]]; then
    rsync -avz -e "ssh $SSH_OPTS" \
      "$PROJECT_ROOT/.goalie/$jsonl" \
      "${DEPLOY_USER}@${DEPLOY_HOST}:${REMOTE_APP_DIR}/.goalie/"
  fi
done
echo "✅ JSONL data synced"

# 5. Ensure Flask is installed on remote
echo "▶ Ensuring Flask dependencies on remote..."
ssh $SSH_OPTS "${DEPLOY_USER}@${DEPLOY_HOST}" \
  "pip3 install -q flask flask-cors flask-socketio 2>&1 | tail -3" || echo "⚠️  pip install step failed (Flask may already be installed)"

# 5b. Stop existing Flask (via PID file — avoids pkill -f self-kill bug)
ssh $SSH_OPTS "${DEPLOY_USER}@${DEPLOY_HOST}" \
  "[ -f ${REMOTE_APP_DIR}/flask.pid ] && kill \$(cat ${REMOTE_APP_DIR}/flask.pid) 2>/dev/null; rm -f ${REMOTE_APP_DIR}/flask.pid" || true

# 5c. Start Flask and save PID
echo "▶ Starting Flask dashboard on remote..."
ssh $SSH_OPTS "${DEPLOY_USER}@${DEPLOY_HOST}" \
  "mkdir -p ${REMOTE_APP_DIR}/logs; cd ${REMOTE_APP_DIR} && PROJECT_ROOT=${REMOTE_APP_DIR} nohup python3 scripts/web_dashboard.py --port 5000 >> ${REMOTE_APP_DIR}/logs/wsjf-dashboard.log 2>&1 & echo \$! > ${REMOTE_APP_DIR}/flask.pid && echo Flask-PID:\$(cat ${REMOTE_APP_DIR}/flask.pid)" || echo "⚠️  Flask start failed"
echo "✅ Flask restart command issued"

# 6. Nginx setup (optional)
# Uses cPanel Nginx include directory — NOT sites-available (cPanel manages its own server blocks)
CPANEL_INCLUDE_DIR="/etc/nginx/conf.d/users/tag/analytics.interface.tag.ooo"
if [[ "$SETUP_NGINX" == "true" ]]; then
  echo "▶ Installing cPanel Nginx include config..."
  rsync -avz -e "ssh $SSH_OPTS" \
    "$PROJECT_ROOT/deploy/cpanel-flask-proxy.conf" \
    "${DEPLOY_USER}@${DEPLOY_HOST}:/tmp/flask-proxy.conf"

  ssh $SSH_OPTS "${DEPLOY_USER}@${DEPLOY_HOST}" "
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
