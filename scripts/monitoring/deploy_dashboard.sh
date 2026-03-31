#!/bin/bash
# Deploy INFRA-2 Monitoring Dashboard to yo.tag.ooo
# Usage: ./deploy_dashboard.sh [--dry-run]

set -euo pipefail

REMOTE_HOST="yo.tag.ooo"
REMOTE_USER="ubuntu"
PEM_FILE="$HOME/pem/rooz.pem"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REMOTE_DIR="/home/ubuntu/agentic-flow"

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }

run_remote() {
    local cmd="$1"
    if $DRY_RUN; then
        log "[DRY-RUN] Would execute: $cmd"
    else
        ssh -i "$PEM_FILE" -o StrictHostKeyChecking=no "$REMOTE_USER@$REMOTE_HOST" "$cmd"
    fi
}

copy_file() {
    local src="$1"
    local dst="$2"
    if $DRY_RUN; then
        log "[DRY-RUN] Would copy: $src -> $REMOTE_HOST:$dst"
    else
        scp -i "$PEM_FILE" -o StrictHostKeyChecking=no "$src" "$REMOTE_USER@$REMOTE_HOST:$dst"
    fi
}

log "=== INFRA-2 Monitoring Dashboard Deployment ==="
log "Target: $REMOTE_HOST:8080"
$DRY_RUN && log "Mode: DRY-RUN"

# Step 1: Create remote directory structure
log "Step 1: Creating remote directory..."
run_remote "mkdir -p $REMOTE_DIR/scripts/monitoring $REMOTE_DIR/cache $REMOTE_DIR/logs"

# Step 2: Copy dashboard files
log "Step 2: Copying dashboard files..."
copy_file "$SCRIPT_DIR/dashboard_server.js" "$REMOTE_DIR/scripts/monitoring/dashboard_server.js"
copy_file "$SCRIPT_DIR/dashboard.html" "$REMOTE_DIR/scripts/monitoring/dashboard.html"
copy_file "$PROJECT_ROOT/package.json" "$REMOTE_DIR/package.json"

# Step 3: Install dependencies
log "Step 3: Installing Node.js dependencies..."
run_remote "cd $REMOTE_DIR && npm install ws sqlite3 --save 2>/dev/null || true"

# Step 4: Deploy systemd service
log "Step 4: Deploying systemd service..."
copy_file "$SCRIPT_DIR/dashboard.service" "/tmp/agentic-dashboard.service"
run_remote "sudo cp /tmp/agentic-dashboard.service /etc/systemd/system/ && sudo systemctl daemon-reload"

# Step 5: Start service
log "Step 5: Starting dashboard service..."
run_remote "sudo systemctl enable agentic-dashboard && sudo systemctl restart agentic-dashboard"

# Step 6: Verify
log "Step 6: Verifying deployment..."
sleep 2
run_remote "sudo systemctl status agentic-dashboard --no-pager | head -15"

# Step 7: Test HTTP endpoint
log "Step 7: Testing HTTP endpoint..."
if ! $DRY_RUN; then
    run_remote "curl -s http://localhost:8080/api/metrics | head -c 200" && echo ""
fi

log ""
log "=== Deployment Complete ==="
log "Dashboard: http://$REMOTE_HOST:8080"
log "WebSocket: ws://$REMOTE_HOST:8080"
log "Logs: /home/ubuntu/dashboard.log"

