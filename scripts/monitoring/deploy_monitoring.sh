#!/bin/bash
# Deploy Discord Bot Monitoring to yo.tag.ooo
# Usage: ./deploy_monitoring.sh [--dry-run]

set -euo pipefail

REMOTE_HOST="yo.tag.ooo"
REMOTE_USER="ubuntu"
PEM_FILE="$HOME/pem/rooz.pem"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

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

log "=== Discord Bot Monitoring Deployment ==="
log "Target: $REMOTE_HOST"
$DRY_RUN && log "Mode: DRY-RUN (no changes will be made)"

# Step 1: Copy health check script
log "Step 1: Copying health check script..."
copy_file "$SCRIPT_DIR/discord_bot_health.sh" "/home/ubuntu/discord_bot_health.sh"
run_remote "chmod +x /home/ubuntu/discord_bot_health.sh"

# Step 2: Deploy logrotate configuration
log "Step 2: Deploying logrotate configuration..."
copy_file "$SCRIPT_DIR/discord_bot.logrotate" "/tmp/discord_bot.logrotate"
run_remote "sudo cp /tmp/discord_bot.logrotate /etc/logrotate.d/discord_bot && sudo chmod 644 /etc/logrotate.d/discord_bot"

# Step 3: Add cron job for health monitoring
log "Step 3: Setting up cron job..."
CRON_JOB="*/5 * * * * /home/ubuntu/discord_bot_health.sh >> /home/ubuntu/discord_bot_health.log 2>&1"
run_remote "(crontab -l 2>/dev/null | grep -v 'discord_bot_health.sh'; echo '$CRON_JOB') | crontab -"

# Step 4: Test health check
log "Step 4: Running initial health check..."
if ! $DRY_RUN; then
    run_remote "/home/ubuntu/discord_bot_health.sh --verbose" || {
        log "WARNING: Initial health check returned non-zero (bot may not be running)"
    }
fi

# Step 5: Verify cron job
log "Step 5: Verifying cron configuration..."
run_remote "crontab -l | grep discord_bot"

log ""
log "=== Deployment Complete ==="
log "Health check will run every 5 minutes"
log "Logs: /home/ubuntu/discord_bot_health.log"
log "View cron: ssh -i $PEM_FILE $REMOTE_USER@$REMOTE_HOST 'crontab -l'"

