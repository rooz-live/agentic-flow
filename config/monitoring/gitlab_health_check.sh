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
