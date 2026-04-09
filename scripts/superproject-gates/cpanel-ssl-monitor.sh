#!/usr/bin/env bash
set -euo pipefail

# SSL Certificate Monitoring Daemon
# Integrates with ay prod-cycle for continuous SSL health monitoring
# Logs to .goalie/pattern_metrics.jsonl for WSJF prioritization

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
GOALIE_DIR="$PROJECT_ROOT/.goalie"
SSL_MANAGER="$SCRIPT_DIR/cpanel-ssl-manager.sh"

# Configuration
CHECK_INTERVAL="${SSL_CHECK_INTERVAL:-3600}"  # 1 hour default
RENEWAL_THRESHOLD="${SSL_RENEWAL_THRESHOLD_DAYS:-30}"
ALERT_EMAIL="${SSL_ALERT_EMAIL:-}"
AUTO_TRIGGER="${SSL_AUTO_TRIGGER:-false}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_event() {
    local level="$1"
    local message="$2"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    case "$level" in
        INFO) echo -e "${CYAN}[INFO]${NC} $message" ;;
        WARN) echo -e "${YELLOW}[WARN]${NC} $message" ;;
        ERROR) echo -e "${RED}[ERROR]${NC} $message" ;;
        SUCCESS) echo -e "${GREEN}[SUCCESS]${NC} $message" ;;
    esac
    
    # Also log to file
    echo "[$timestamp] [$level] $message" >> "$GOALIE_DIR/ssl_monitor.log"
}

log_pattern() {
    local pattern="$1"
    local data="$2"
    
    if [ ! -d "$GOALIE_DIR" ]; then
        mkdir -p "$GOALIE_DIR"
    fi
    
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local run_id="${AF_RUN_ID:-$(uuidgen | tr '[:upper:]' '[:lower:]')}"
    
    cat >> "$GOALIE_DIR/pattern_metrics.jsonl" <<EOF
{"pattern":"$pattern","timestamp":"$timestamp","run_id":"$run_id","gate":"ssl","circle":"orchestrator","data":$data}
EOF
}

check_certificate_expiry() {
    local domain="$1"
    local expiry_date
    local days_until_expiry
    
    # Get certificate expiry date
    expiry_date=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | \
                  openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
    
    if [ -z "$expiry_date" ]; then
        return 1
    fi
    
    local expiry_epoch=$(date -j -f "%b %d %H:%M:%S %Y %Z" "$expiry_date" +%s 2>/dev/null || echo 0)
    local now_epoch=$(date +%s)
    days_until_expiry=$(( (expiry_epoch - now_epoch) / 86400 ))
    
    echo "$days_until_expiry"
}

send_alert() {
    local subject="$1"
    local message="$2"
    
    if [ -n "$ALERT_EMAIL" ]; then
        echo "$message" | mail -s "$subject" "$ALERT_EMAIL" 2>/dev/null || \
            log_event "WARN" "Failed to send alert email to $ALERT_EMAIL"
    fi
    
    # Log as high-priority pattern event
    log_pattern "ssl-alert" "{\"subject\":\"$subject\",\"message\":\"$message\",\"priority\":\"high\"}"
}

run_check_cycle() {
    log_event "INFO" "Starting SSL check cycle..."
    
    local start_time=$(date +%s)
    local domains=("rooz.live" "yo.life" "yoservice.com")
    local issues=0
    local warnings=0
    
    for domain in "${domains[@]}"; do
        log_event "INFO" "Checking $domain..."
        
        # Run coverage check
        if ! "$SSL_MANAGER" check "$domain" > /dev/null 2>&1; then
            log_event "ERROR" "SSL validation failed for $domain"
            ((issues++))
            
            # Auto-trigger if enabled
            if [ "$AUTO_TRIGGER" == "true" ]; then
                log_event "INFO" "Auto-triggering AutoSSL for $domain..."
                "$SSL_MANAGER" trigger "$domain"
            else
                send_alert "SSL Issue: $domain" \
                    "SSL certificate validation failed for $domain.\nRun: ./scripts/cpanel-ssl-manager.sh trigger $domain"
            fi
        else
            # Check expiry
            days_left=$(check_certificate_expiry "$domain" || echo "-1")
            
            if [ "$days_left" -lt "$RENEWAL_THRESHOLD" ] && [ "$days_left" -ge 0 ]; then
                log_event "WARN" "$domain certificate expires in $days_left days"
                ((warnings++))
                
                if [ "$days_left" -lt 7 ]; then
                    send_alert "SSL Expiring Soon: $domain" \
                        "Certificate for $domain expires in $days_left days.\nConsider manual renewal."
                fi
            else
                log_event "SUCCESS" "$domain certificate valid ($days_left days remaining)"
            fi
        fi
    done
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Log cycle summary
    log_pattern "ssl-monitor-cycle" \
        "{\"issues\":$issues,\"warnings\":$warnings,\"duration_ms\":$((duration * 1000)),\"domains_checked\":${#domains[@]}}"
    
    if [ $issues -gt 0 ]; then
        log_event "ERROR" "Check cycle completed with $issues issues, $warnings warnings (${duration}s)"
        return 1
    elif [ $warnings -gt 0 ]; then
        log_event "WARN" "Check cycle completed with $warnings warnings (${duration}s)"
        return 0
    else
        log_event "SUCCESS" "Check cycle completed successfully (${duration}s)"
        return 0
    fi
}

daemon_mode() {
    log_event "INFO" "Starting SSL monitoring daemon (check interval: ${CHECK_INTERVAL}s)"
    
    # Create PID file
    local pid_file="$GOALIE_DIR/ssl_monitor.pid"
    echo $$ > "$pid_file"
    
    # Trap signals for graceful shutdown
    trap 'log_event "INFO" "Shutting down SSL monitor..."; rm -f "$pid_file"; exit 0' SIGINT SIGTERM
    
    while true; do
        run_check_cycle || true
        
        log_event "INFO" "Next check in ${CHECK_INTERVAL}s..."
        sleep "$CHECK_INTERVAL"
    done
}

once_mode() {
    run_check_cycle
}

show_status() {
    local pid_file="$GOALIE_DIR/ssl_monitor.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${GREEN}SSL monitor is running (PID: $pid)${NC}"
            
            # Show last log entries
            if [ -f "$GOALIE_DIR/ssl_monitor.log" ]; then
                echo ""
                echo "Recent activity:"
                tail -10 "$GOALIE_DIR/ssl_monitor.log"
            fi
        else
            echo -e "${YELLOW}SSL monitor is not running (stale PID file)${NC}"
            rm -f "$pid_file"
        fi
    else
        echo -e "${YELLOW}SSL monitor is not running${NC}"
    fi
}

stop_daemon() {
    local pid_file="$GOALIE_DIR/ssl_monitor.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            log_event "INFO" "Stopping SSL monitor (PID: $pid)..."
            kill "$pid"
            rm -f "$pid_file"
            log_event "SUCCESS" "SSL monitor stopped"
        else
            log_event "WARN" "SSL monitor not running (stale PID file)"
            rm -f "$pid_file"
        fi
    else
        log_event "WARN" "SSL monitor is not running"
    fi
}

show_usage() {
    cat << EOF
SSL Certificate Monitoring Daemon

Usage: $0 <command>

Commands:
  start             Start monitoring daemon
  stop              Stop monitoring daemon
  status            Show daemon status
  once              Run single check cycle
  help              Show this help message

Configuration (environment variables):
  SSL_CHECK_INTERVAL            Check interval in seconds (default: 3600)
  SSL_RENEWAL_THRESHOLD_DAYS    Alert threshold in days (default: 30)
  SSL_ALERT_EMAIL               Email for alerts (optional)
  SSL_AUTO_TRIGGER              Auto-trigger AutoSSL on failures (default: false)

Integration:
  - Logs to .goalie/pattern_metrics.jsonl for ay prod-cycle
  - Uses pattern:ssl-monitor-cycle for metrics
  - Creates .goalie/ssl_monitor.log for detailed logs
  - Creates .goalie/ssl_monitor.pid for daemon tracking

Examples:
  # Start monitoring
  $0 start

  # Check status
  $0 status

  # Run single check
  $0 once

  # Stop monitoring
  $0 stop

EOF
}

# Main execution
case "${1:-help}" in
    start)
        daemon_mode
        ;;
    stop)
        stop_daemon
        ;;
    status)
        show_status
        ;;
    once)
        once_mode
        ;;
    help|*)
        show_usage
        ;;
esac
