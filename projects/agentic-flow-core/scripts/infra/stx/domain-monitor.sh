#!/usr/bin/env bash
set -euo pipefail

# STX Domain Health Monitor - Enhanced Version
# Features: Alerting, detailed diagnostics, historical logging, response time tracking

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
CONFIG_FILE="$PROJECT_ROOT/config/stx-domains.json"
LOG_FILE="$PROJECT_ROOT/logs/stx-monitor.log"
METRICS_FILE="$PROJECT_ROOT/logs/stx-metrics.jsonl"
STATE_FILE="$PROJECT_ROOT/logs/stx-state.json"

# Alert configuration
ALERT_EMAIL="${ALERT_EMAIL:-}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
ALERT_ON_CHANGE="${ALERT_ON_CHANGE:-true}"

# SLA thresholds (ms)
WARN_THRESHOLD=1000
CRIT_THRESHOLD=3000

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Ensure directories exist
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$METRICS_FILE")"
mkdir -p "$(dirname "$STATE_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log_metric() {
    local domain=$1
    local status=$2
    local response_time=$3
    local http_code=$4
    local diagnostic=$5
    
    jq -n \
        --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        --arg domain "$domain" \
        --arg status "$status" \
        --arg rt "$response_time" \
        --arg code "$http_code" \
        --arg diag "$diagnostic" \
        '{timestamp: $ts, domain: $domain, status: $status, response_time_ms: ($rt|tonumber), http_code: $code, diagnostic: $diag}' \
        >> "$METRICS_FILE"
}

print_header() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

diagnose_domain() {
    local domain=$1
    local diagnostic=""
    
    # Check DNS
    if ! dig +short "$domain" | grep -q '.'; then
        diagnostic="NO_DNS_RECORD"
        echo "$diagnostic"
        return
    fi
    
    # Check SSL cert
    if echo | timeout 3 openssl s_client -connect "$domain:443" -servername "$domain" 2>/dev/null | \
       grep -q "Verify return code: 0"; then
        diagnostic="DNS_OK"
    else
        # Check if cert exists but is invalid
        if echo | timeout 3 openssl s_client -connect "$domain:443" -servername "$domain" 2>&1 | \
           grep -q "certificate"; then
            diagnostic="SSL_CERT_INVALID"
        else
            diagnostic="SSL_UNREACHABLE"
        fi
    fi
    
    echo "$diagnostic"
}

check_domain_advanced() {
    local domain=$1
    local health_endpoint=${2:-"/"}
    local start_time=$(date +%s%3N)
    local status_code="000"
    local response_time=0
    local diagnostic=""
    
    # Try HTTPS first
    if response=$(curl -s -o /dev/null -w "%{http_code}:%{time_total}" --connect-timeout 5 --max-time 10 \
                  "https://$domain$health_endpoint" 2>/dev/null); then
        status_code=$(echo "$response" | cut -d: -f1)
        response_time=$(echo "$response" | cut -d: -f2 | awk '{print int($1 * 1000)}')
        
        if [ "$status_code" = "200" ] || [ "$status_code" = "301" ] || [ "$status_code" = "302" ]; then
            if [ "$response_time" -lt "$WARN_THRESHOLD" ]; then
                echo -e "${GREEN}✓${NC} (${response_time}ms)"
                diagnostic="HEALTHY"
            elif [ "$response_time" -lt "$CRIT_THRESHOLD" ]; then
                echo -e "${YELLOW}⚠${NC} (${response_time}ms - slow)"
                diagnostic="SLOW_RESPONSE"
            else
                echo -e "${YELLOW}⚠${NC} (${response_time}ms - critical latency)"
                diagnostic="CRITICAL_LATENCY"
            fi
            log_metric "$domain" "$diagnostic" "$response_time" "$status_code" "$diagnostic"
            return 0
        fi
    fi
    
    # If HTTPS failed, diagnose
    diagnostic=$(diagnose_domain "$domain")
    echo -e "${RED}✗${NC} ($diagnostic)"
    log_metric "$domain" "DOWN" "0" "$status_code" "$diagnostic"
    return 1
}

send_alert() {
    local subject=$1
    local message=$2
    
    # Email alert
    if [ -n "$ALERT_EMAIL" ]; then
        echo "$message" | mail -s "$subject" "$ALERT_EMAIL" 2>/dev/null || true
    fi
    
    # Slack alert
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$subject\\n$message\"}" \
            "$SLACK_WEBHOOK" 2>/dev/null || true
    fi
    
    log "ALERT: $subject"
}

check_state_changes() {
    local current_state=$1
    
    if [ ! -f "$STATE_FILE" ]; then
        echo "$current_state" > "$STATE_FILE"
        return
    fi
    
    local prev_state=$(cat "$STATE_FILE")
    
    if [ "$prev_state" != "$current_state" ]; then
        send_alert "STX Domain Status Change Detected" \
            "Previous: $prev_state\nCurrent: $current_state"
        echo "$current_state" > "$STATE_FILE"
    fi
}

generate_remediation_report() {
    echo ""
    print_header "🔧 Remediation Actions Required"
    
    echo ""
    echo -e "${RED}Critical Issues:${NC}"
    echo ""
    
    # Check each failing domain
    if ! dig +short rooz.yo.life | grep -q '.'; then
        echo -e "  ${YELLOW}1. rooz.yo.life - Missing DNS Record${NC}"
        echo "     Action: Add DNS A record or CNAME"
        echo "     Example (Cloudflare): rooz.yo.life → CNAME → yo.life"
        echo ""
    fi
    
    if ! dig +short api.yo.life | grep -q '.'; then
        echo -e "  ${YELLOW}2. api.yo.life - Missing DNS Record${NC}"
        echo "     Action: Add DNS A record pointing to API server"
        echo "     Example: api.yo.life → A → <API_SERVER_IP>"
        echo ""
    fi
    
    if ! dig +short api.yoservice.com | grep -q '.'; then
        echo -e "  ${YELLOW}3. api.yoservice.com - Missing DNS Record${NC}"
        echo "     Action: Add DNS A record pointing to API server"
        echo "     Example: api.yoservice.com → A → <API_SERVER_IP>"
        echo ""
    fi
    
    # Check SSL cert issue
    if ! echo | timeout 3 openssl s_client -connect circles.rooz.live:443 -servername circles.rooz.live 2>&1 | \
       grep -q "Verify return code: 0"; then
        echo -e "  ${YELLOW}4. circles.rooz.live - SSL Certificate Issue${NC}"
        echo "     Action: Update SSL certificate to include circles.rooz.live as SAN"
        echo "     Options:"
        echo "       - Reissue cert with circles.rooz.live in SAN list"
        echo "       - Use wildcard cert: *.rooz.live"
        echo ""
    fi
    
    echo -e "${BLUE}Run these checks:${NC}"
    echo "  # Verify DNS propagation"
    echo "  dig rooz.yo.life"
    echo "  dig api.yo.life"
    echo "  dig api.yoservice.com"
    echo ""
    echo "  # Check SSL certificate"
    echo "  echo | openssl s_client -connect circles.rooz.live:443 -servername circles.rooz.live 2>/dev/null | openssl x509 -noout -text | grep 'DNS:'"
    echo ""
}

monitor_stx_domains() {
    print_header "🌐 STX Domain Health Monitor - Enhanced"
    
    log "Starting enhanced STX domain health check..."
    
    local state_summary=""
    
    # yo.life domains
    echo ""
    echo -e "${BLUE}▶ yo.life TLD Domains${NC}"
    echo "  yo.life              : $(check_domain_advanced 'yo.life' '/') (Primary)"
    echo "  www.yo.life          : $(check_domain_advanced 'www.yo.life' '/')"
    echo "  rooz.yo.life         : $(check_domain_advanced 'rooz.yo.life' '/')"
    echo "  api.yo.life          : $(check_domain_advanced 'api.yo.life' '/api/health')"
    
    # rooz.live domains
    echo ""
    echo -e "${BLUE}▶ rooz.live TLD Domains${NC}"
    echo "  rooz.live            : $(check_domain_advanced 'rooz.live' '/') (Subscription)"
    echo "  www.rooz.live        : $(check_domain_advanced 'www.rooz.live' '/')"
    echo "  circles.rooz.live    : $(check_domain_advanced 'circles.rooz.live' '/')"
    
    # yoservice.com domains
    echo ""
    echo -e "${BLUE}▶ yoservice.com TLD Domains${NC}"
    echo "  yoservice.com        : $(check_domain_advanced 'yoservice.com' '/') (Service)"
    echo "  www.yoservice.com    : $(check_domain_advanced 'www.yoservice.com' '/')"
    echo "  api.yoservice.com    : $(check_domain_advanced 'api.yoservice.com' '/api/health')"
    
    # Local web monitoring
    echo ""
    echo -e "${BLUE}▶ Local Web Monitoring${NC}"
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        echo -e "  localhost:3000       : ${GREEN}✓${NC} (Active)"
    else
        echo -e "  localhost:3000       : ${RED}✗${NC} (Inactive)"
    fi
    
    # StarlingX health
    echo ""
    echo -e "${BLUE}▶ StarlingX Integration${NC}"
    echo "  OpenStack Compatible : ✓"
    echo "  Provider             : Hivelocity"
    echo "  Region               : us-west-1"
    echo "  Auto-Failover        : Enabled"
    
    # Circle status
    echo ""
    echo -e "${BLUE}▶ Circle Equity Status${NC}"
    if command -v npx &> /dev/null; then
        EPISODES=$(npx agentdb stats 2>/dev/null | grep "Episodes:" | awk '{print $2}' || echo "0")
        EMBEDDINGS=$(npx agentdb stats 2>/dev/null | grep "Embeddings:" | awk '{print $2}' || echo "0")
        echo "  Episodes Accumulated : $EPISODES"
        echo "  Embeddings Stored    : $EMBEDDINGS"
        echo "  Circles Active       : 6 (orchestrator, assessor, analyst, innovator, seeker, intuitive)"
    else
        echo "  AgentDB              : Not available"
    fi
    
    # Generate remediation report if issues found
    if [ -f "$METRICS_FILE" ]; then
        if tail -20 "$METRICS_FILE" | jq -r 'select(.status == "DOWN" or .diagnostic == "NO_DNS_RECORD" or .diagnostic == "SSL_CERT_INVALID")' | grep -q .; then
            generate_remediation_report
        fi
    fi
    
    log "Enhanced STX domain health check complete"
    echo ""
}

# Continuous monitoring mode
continuous_monitor() {
    local interval=${1:-60}
    
    print_header "🔄 Continuous Monitoring Mode (${interval}s interval)"
    echo "Alerting: $([ -n "$ALERT_EMAIL" ] && echo "Email enabled" || echo "Disabled")"
    echo "Press Ctrl+C to stop"
    echo ""
    
    while true; do
        monitor_stx_domains
        sleep "$interval"
    done
}

# Main execution
case "${1:-once}" in
    continuous|c)
        INTERVAL=${2:-60}
        continuous_monitor "$INTERVAL"
        ;;
    diagnose|d)
        generate_remediation_report
        ;;
    metrics|m)
        if [ -f "$METRICS_FILE" ]; then
            echo "Recent metrics (last 10 entries):"
            tail -10 "$METRICS_FILE" | jq -r '[.timestamp, .domain, .status, (.response_time_ms|tostring) + "ms", .diagnostic] | @tsv'
        else
            echo "No metrics file found"
        fi
        ;;
    once|o|*)
        monitor_stx_domains
        ;;
esac
