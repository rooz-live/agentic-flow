#!/usr/bin/env bash
# ============================================================================
# GitLab Monitoring Setup Script
# ============================================================================
# Purpose: Configure monitoring and alerting for gitlab.interface.splitcite.com
# Usage: ./setup_monitoring.sh [--dry-run] [--verbose] [--alerts-only] [--dashboard-only]
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs/migration"
GOALIE_DIR="$PROJECT_ROOT/.goalie"
CYCLE_LOG="$GOALIE_DIR/cycle_log.jsonl"
MONITORING_DIR="$PROJECT_ROOT/config/monitoring"

TARGET_GITLAB="gitlab.interface.splitcite.com"
HEALTH_CHECK_INTERVAL=60

DISK_WARN_THRESHOLD=20
MEMORY_WARN_THRESHOLD=90
CPU_WARN_THRESHOLD=80
PIPELINE_FAIL_THRESHOLD=50

SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
NOTIFICATION_EMAIL="${NOTIFICATION_EMAIL:-}"

DRY_RUN=false
VERBOSE=false
ALERTS_ONLY=false
DASHBOARD_ONLY=false

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run) DRY_RUN=true; shift ;;
        --verbose) VERBOSE=true; shift ;;
        --alerts-only) ALERTS_ONLY=true; shift ;;
        --dashboard-only) DASHBOARD_ONLY=true; shift ;;
        --help|-h) echo "Usage: $0 [--dry-run] [--verbose] [--alerts-only] [--dashboard-only]"; exit 0 ;;
        *) echo "Unknown: $1"; exit 2 ;;
    esac
done

get_timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log_info() { echo -e "${BLUE}[INFO]${NC} $(get_timestamp) $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $(get_timestamp) $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $(get_timestamp) $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(get_timestamp) $1"; }

log_to_goalie() {
    local action="$1" status="$2" msg="$3"
    if [[ "$DRY_RUN" == "false" ]]; then
        echo "{\"type\":\"monitoring_setup\",\"timestamp\":\"$(get_timestamp)\",\"action\":\"$action\",\"status\":\"$status\",\"message\":\"$msg\"}" >> "$CYCLE_LOG"
    fi
    return 0
}

send_alert() {
    local level="$1" title="$2" msg="$3"
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        local color="good"
        [[ "$level" == "warning" ]] && color="warning"
        [[ "$level" == "critical" ]] && color="danger"
        curl -s -X POST "$SLACK_WEBHOOK_URL" -H 'Content-type: application/json' \
            -d "{\"attachments\":[{\"color\":\"$color\",\"title\":\"$title\",\"text\":\"$msg\"}]}" >/dev/null 2>&1 || true
    fi
    if [[ -n "$NOTIFICATION_EMAIL" ]]; then
        echo "$msg" | mail -s "[$level] $title" "$NOTIFICATION_EMAIL" 2>/dev/null || true
    fi
}


# ============================================================================
# Health Check Script Generation
# ============================================================================

create_health_check_script() {
    log_info "Creating health check script..."
    mkdir -p "$MONITORING_DIR"
    
    cat > "$MONITORING_DIR/gitlab_health_check.sh" << 'HEALTH_SCRIPT'
#!/usr/bin/env bash
# GitLab Health Check - Runs every minute via cron

TARGET_GITLAB="gitlab.interface.splitcite.com"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
ALERT_LOG="/var/log/gitlab-alerts.log"

get_timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

send_alert() {
    local level="$1" title="$2" msg="$3"
    echo "$(get_timestamp) [$level] $title: $msg" >> "$ALERT_LOG"
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        local color="good"
        [[ "$level" == "warning" ]] && color="warning"
        [[ "$level" == "critical" ]] && color="danger"
        curl -s -X POST "$SLACK_WEBHOOK_URL" -H 'Content-type: application/json' \
            -d "{\"attachments\":[{\"color\":\"$color\",\"title\":\"$title\",\"text\":\"$msg\"}]}" >/dev/null 2>&1
    fi
}

# Check GitLab health endpoint
if ! curl -sf --connect-timeout 10 "https://$TARGET_GITLAB/-/health" >/dev/null; then
    send_alert "critical" "GitLab Down" "Health endpoint not responding"
    exit 1
fi

# Check services (run on GitLab server)
if command -v gitlab-ctl &>/dev/null; then
    for svc in puma sidekiq postgresql redis; do
        if ! gitlab-ctl status $svc 2>/dev/null | grep -q "run:"; then
            send_alert "critical" "GitLab Service Down" "$svc is not running"
        fi
    done
    
    # Check disk space
    disk_pct=$(df /var/opt/gitlab 2>/dev/null | awk 'NR==2 {gsub(/%/,"",$5); print $5}')
    if [[ "$disk_pct" =~ ^[0-9]+$ ]] && [[ "$disk_pct" -gt 80 ]]; then
        send_alert "warning" "Disk Space Low" "GitLab disk at ${disk_pct}% used"
    fi
    
    # Check memory
    mem_pct=$(free 2>/dev/null | awk '/Mem:/ {printf "%.0f", $3/$2*100}')
    if [[ "$mem_pct" =~ ^[0-9]+$ ]] && [[ "$mem_pct" -gt 90 ]]; then
        send_alert "warning" "Memory High" "Memory at ${mem_pct}% used"
    fi
fi

exit 0
HEALTH_SCRIPT
    
    chmod +x "$MONITORING_DIR/gitlab_health_check.sh"
    log_success "Created health check script at $MONITORING_DIR/gitlab_health_check.sh"
}

create_cron_job() {
    log_info "Creating cron job configuration..."
    
    cat > "$MONITORING_DIR/gitlab_health_check.cron" << EOF
# GitLab Health Check - Run every minute
* * * * * $MONITORING_DIR/gitlab_health_check.sh >> /var/log/gitlab-health.log 2>&1

# Daily backup verification - Run at 3 AM
0 3 * * * ssh $TARGET_GITLAB 'ls -la /var/opt/gitlab/backups/*.tar 2>/dev/null | tail -1' >> /var/log/gitlab-backup-check.log 2>&1
EOF
    
    log_success "Created cron configuration at $MONITORING_DIR/gitlab_health_check.cron"
    log_info "To install: crontab $MONITORING_DIR/gitlab_health_check.cron"
}


# ============================================================================
# Dashboard Generation
# ============================================================================

create_dashboard() {
    log_info "Creating monitoring dashboard..."
    mkdir -p "$MONITORING_DIR"
    
    cat > "$MONITORING_DIR/dashboard.html" << 'DASHBOARD'
<!DOCTYPE html>
<html>
<head>
    <title>GitLab Migration Monitoring Dashboard</title>
    <meta http-equiv="refresh" content="30">
    <style>
        body { font-family: -apple-system, sans-serif; margin: 20px; background: #1a1a2e; color: #eee; }
        .header { text-align: center; padding: 20px; }
        .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .card { background: #16213e; border-radius: 10px; padding: 20px; }
        .card h3 { margin-top: 0; color: #0f4c75; }
        .status-ok { color: #00ff88; }
        .status-warn { color: #ffaa00; }
        .status-error { color: #ff4444; }
        .metric { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #333; }
    </style>
</head>
<body>
    <div class="header">
        <h1>GitLab Migration Monitoring</h1>
        <p>Target: gitlab.interface.splitcite.com</p>
        <p id="timestamp">Last updated: Loading...</p>
    </div>
    <div class="status-grid">
        <div class="card">
            <h3>Service Health</h3>
            <div class="metric"><span>Puma</span><span class="status-ok">●</span></div>
            <div class="metric"><span>Sidekiq</span><span class="status-ok">●</span></div>
            <div class="metric"><span>PostgreSQL</span><span class="status-ok">●</span></div>
            <div class="metric"><span>Redis</span><span class="status-ok">●</span></div>
        </div>
        <div class="card">
            <h3>System Resources</h3>
            <div class="metric"><span>Disk Usage</span><span id="disk">--</span></div>
            <div class="metric"><span>Memory</span><span id="memory">--</span></div>
            <div class="metric"><span>CPU</span><span id="cpu">--</span></div>
        </div>
        <div class="card">
            <h3>CI/CD Status</h3>
            <div class="metric"><span>Active Pipelines</span><span id="pipelines">--</span></div>
            <div class="metric"><span>Runners Online</span><span id="runners">--</span></div>
            <div class="metric"><span>Failed Rate (24h)</span><span id="fail-rate">--</span></div>
        </div>
    </div>
    <script>
        document.getElementById('timestamp').textContent = 'Last updated: ' + new Date().toISOString();
    </script>
</body>
</html>
DASHBOARD
    
    log_success "Created dashboard at $MONITORING_DIR/dashboard.html"
}

# ============================================================================
# Main
# ============================================================================

main() {
    mkdir -p "$MONITORING_DIR" "$LOG_DIR" "$GOALIE_DIR"
    
    echo ""
    echo "============================================================================"
    echo "       GitLab Monitoring Setup - $(get_timestamp)"
    echo "============================================================================"
    echo "  Target: $TARGET_GITLAB"
    [[ "$DRY_RUN" == "true" ]] && echo "  Mode: DRY RUN"
    echo ""
    
    log_to_goalie "setup_start" "started" "Monitoring setup started"
    
    if [[ "$DASHBOARD_ONLY" != "true" ]]; then
        create_health_check_script
        create_cron_job
    fi
    
    if [[ "$ALERTS_ONLY" != "true" ]]; then
        create_dashboard
    fi
    
    echo ""
    echo "============================================================================"
    echo "  Monitoring setup complete!"
    echo "============================================================================"
    echo "  Health check: $MONITORING_DIR/gitlab_health_check.sh"
    echo "  Cron config:  $MONITORING_DIR/gitlab_health_check.cron"
    echo "  Dashboard:    $MONITORING_DIR/dashboard.html"
    echo ""
    echo "  Next steps:"
    echo "  1. Set SLACK_WEBHOOK_URL environment variable for alerts"
    echo "  2. Install cron: crontab $MONITORING_DIR/gitlab_health_check.cron"
    echo "  3. Open dashboard.html in browser or serve via HTTP"
    echo "============================================================================"
    
    log_to_goalie "setup_complete" "completed" "Monitoring setup completed"
}

main "$@"
