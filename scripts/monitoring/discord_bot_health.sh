#!/bin/bash
# Discord Bot Health Check Script
# Purpose: Monitor Discord bot health on yo.tag.ooo
# Exit codes: 0 = healthy, 1 = unhealthy
# Usage: ./discord_bot_health.sh [--verbose]

set -euo pipefail

# Configuration
BOT_LOG="/home/ubuntu/discord_bot.log"
HEALTH_LOG="/home/ubuntu/discord_bot_health.log"
SCREEN_NAME="discord_bot"
MAX_INACTIVITY_MINUTES=5
FAILURE_COUNT_FILE="/tmp/discord_bot_failures"

VERBOSE=false
[[ "${1:-}" == "--verbose" ]] && VERBOSE=true

log() {
    local level="$1"
    local msg="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $msg" >> "$HEALTH_LOG"
    $VERBOSE && echo "[$timestamp] [$level] $msg"
}

# Check 1: Screen session exists
check_screen_session() {
    if screen -ls | grep -q "$SCREEN_NAME"; then
        log "INFO" "Screen session '$SCREEN_NAME' is running"
        return 0
    else
        log "ERROR" "Screen session '$SCREEN_NAME' not found"
        return 1
    fi
}

# Check 2: Process is running (find by name since PID may change)
check_process() {
    if pgrep -f "discord_wsjf_bot.py" > /dev/null 2>&1; then
        local pid=$(pgrep -f "discord_wsjf_bot.py" | head -1)
        log "INFO" "Discord bot process running (PID: $pid)"
        return 0
    else
        log "ERROR" "Discord bot process not found"
        return 1
    fi
}

# Check 3: Discord Gateway connected (check for Session ID in recent logs)
check_gateway_connection() {
    if [[ ! -f "$BOT_LOG" ]]; then
        log "WARN" "Bot log file not found: $BOT_LOG"
        return 1
    fi
    
    # Check last 100 lines for Session ID (indicates successful gateway connection)
    if tail -100 "$BOT_LOG" 2>/dev/null | grep -q "Session ID"; then
        log "INFO" "Discord Gateway connection confirmed"
        return 0
    else
        log "WARN" "No recent Session ID found in logs"
        return 1
    fi
}

# Check 4: Recent activity (log updated within MAX_INACTIVITY_MINUTES)
check_recent_activity() {
    if [[ ! -f "$BOT_LOG" ]]; then
        log "WARN" "Bot log file not found for activity check"
        return 1
    fi
    
    local log_mtime=$(stat -c %Y "$BOT_LOG" 2>/dev/null || stat -f %m "$BOT_LOG" 2>/dev/null)
    local now=$(date +%s)
    local age_minutes=$(( (now - log_mtime) / 60 ))
    
    if [[ $age_minutes -le $MAX_INACTIVITY_MINUTES ]]; then
        log "INFO" "Bot log updated $age_minutes minutes ago (threshold: $MAX_INACTIVITY_MINUTES)"
        return 0
    else
        log "WARN" "Bot log stale: $age_minutes minutes old"
        return 1
    fi
}

# Track consecutive failures
track_failures() {
    local failed="$1"
    local count=0
    
    if [[ -f "$FAILURE_COUNT_FILE" ]]; then
        count=$(cat "$FAILURE_COUNT_FILE")
    fi
    
    if [[ "$failed" == "true" ]]; then
        count=$((count + 1))
        echo "$count" > "$FAILURE_COUNT_FILE"
        
        if [[ $count -ge 3 ]]; then
            log "CRITICAL" "3 consecutive failures - ALERT triggered"
            # Could add: curl webhook, send email, etc.
            echo "ALERT: Discord bot unhealthy - $count consecutive failures" | \
                mail -s "Discord Bot Alert" root 2>/dev/null || true
        fi
    else
        echo "0" > "$FAILURE_COUNT_FILE"
    fi
}

# Main health check
main() {
    log "INFO" "=== Health check started ==="
    
    local failed=false
    local checks_passed=0
    local total_checks=4
    
    check_screen_session && ((checks_passed++)) || failed=true
    check_process && ((checks_passed++)) || failed=true
    check_gateway_connection && ((checks_passed++)) || true  # Warning only
    check_recent_activity && ((checks_passed++)) || true     # Warning only
    
    track_failures "$failed"
    
    if [[ "$failed" == "true" ]]; then
        log "ERROR" "Health check FAILED ($checks_passed/$total_checks passed)"
        exit 1
    else
        log "INFO" "Health check PASSED ($checks_passed/$total_checks passed)"
        exit 0
    fi
}

main "$@"

