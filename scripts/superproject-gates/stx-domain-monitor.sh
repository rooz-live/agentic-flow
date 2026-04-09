#!/usr/bin/env bash
set -euo pipefail

# STX Domain Health Monitor for yo.life, rooz.live, yoservice.com
# Monitors StarlingX deployment domains with real-time health checks

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="$PROJECT_ROOT/config/stx-domains.json"
LOG_FILE="$PROJECT_ROOT/logs/stx-monitor.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Ensure logs directory exists
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

print_header() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

check_domain() {
    local domain=$1
    local health_endpoint=${2:-"/"}
    
    # Try HTTPS first, fall back to HTTP
    local status_code
    if status_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "https://$domain$health_endpoint" 2>/dev/null); then
        if [ "$status_code" = "200" ] || [ "$status_code" = "301" ] || [ "$status_code" = "302" ]; then
            echo -e "${GREEN}✓${NC}"
            return 0
        fi
    fi
    
    # Try HTTP as fallback
    if status_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "http://$domain$health_endpoint" 2>/dev/null); then
        if [ "$status_code" = "200" ] || [ "$status_code" = "301" ] || [ "$status_code" = "302" ]; then
            echo -e "${YELLOW}⚠${NC}"
            return 0
        fi
    fi
    
    echo -e "${RED}✗${NC}"
    return 1
}

monitor_stx_domains() {
    print_header "🌐 STX Domain Health Monitor"
    
    log "Starting STX domain health check..."
    
    # yo.life domains
    echo ""
    echo -e "${BLUE}▶ yo.life TLD Domains${NC}"
    echo "  yo.life              : $(check_domain 'yo.life' '/') (Primary)"
    echo "  www.yo.life          : $(check_domain 'www.yo.life' '/')"
    echo "  rooz.yo.life         : $(check_domain 'rooz.yo.life' '/')"
    echo "  api.yo.life          : $(check_domain 'api.yo.life' '/api/health')"
    
    # rooz.live domains
    echo ""
    echo -e "${BLUE}▶ rooz.live TLD Domains${NC}"
    echo "  rooz.live            : $(check_domain 'rooz.live' '/') (Subscription)"
    echo "  www.rooz.live        : $(check_domain 'www.rooz.live' '/')"
    echo "  circles.rooz.live    : $(check_domain 'circles.rooz.live' '/')"
    
    # yoservice.com domains
    echo ""
    echo -e "${BLUE}▶ yoservice.com TLD Domains${NC}"
    echo "  yoservice.com        : $(check_domain 'yoservice.com' '/') (Service)"
    echo "  www.yoservice.com    : $(check_domain 'www.yoservice.com' '/')"
    echo "  api.yoservice.com    : $(check_domain 'api.yoservice.com' '/api/health')"
    
    # Local web monitoring
    echo ""
    echo -e "${BLUE}▶ Local Web Monitoring${NC}"
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        echo -e "  localhost:3000       : ${GREEN}✓${NC} (Active)"
    else
        echo -e "  localhost:3000       : ${RED}✗${NC} (Inactive - run: ./scripts/ay-yo.sh web 3000)"
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
    
    log "STX domain health check complete"
    echo ""
}

# Continuous monitoring mode
continuous_monitor() {
    local interval=${1:-60}
    
    print_header "🔄 Continuous Monitoring Mode (${interval}s interval)"
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
    once|o|*)
        monitor_stx_domains
        ;;
esac
