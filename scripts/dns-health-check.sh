#!/usr/bin/env bash
################################################################################
# DNS Health Check Script
# Validates DNS records and endpoint accessibility
################################################################################

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $*"; }
success() { echo -e "${GREEN}✓${NC} $*"; }
error() { echo -e "${RED}✗${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }

DOMAIN="rooz.live"

# Define endpoints to check
declare -A ENDPOINTS=(
    ["swarm.stx"]="Swarm API (StarlingX)"
    ["swarm.aws"]="Swarm API (AWS)"
    ["swarm.hive"]="Swarm API (Hivelocity)"
    ["swarm.hetz"]="Swarm API (Hetzner)"
    ["stx"]="StarlingX OpenStack"
    ["aws"]="AWS Infrastructure"
    ["gitlab"]="GitLab CI/CD"
    ["hive"]="Hivelocity Bare Metal"
    ["hetz"]="Hetzner Cloud"
)

check_dns_resolution() {
    local subdomain=$1
    local description=$2
    local fqdn="${subdomain}.${DOMAIN}"
    
    echo ""
    log "Checking $description ($fqdn)..."
    
    # Check DNS resolution
    local ip=$(dig +short "$fqdn" @1.1.1.1 | head -1)
    
    if [ -z "$ip" ]; then
        error "No DNS record found"
        return 1
    fi
    
    success "DNS resolves to: $ip"
    
    # Check HTTP accessibility
    local http_code=$(curl -sL -w "%{http_code}" "http://$fqdn/health" -o /dev/null -m 5 2>/dev/null || echo "000")
    
    if [ "$http_code" -eq 200 ]; then
        success "HTTP /health endpoint accessible (200)"
        
        # Try to fetch actual health data
        local health=$(curl -s "http://$fqdn/health" -m 5 2>/dev/null || echo "{}")
        if echo "$health" | jq -e '.status' > /dev/null 2>&1; then
            local status=$(echo "$health" | jq -r '.status')
            echo "  Status: $status"
        fi
        
    elif [ "$http_code" -eq 301 ] || [ "$http_code" -eq 302 ]; then
        warn "HTTP redirect ($http_code) - check server configuration"
    elif [ "$http_code" -eq 000 ]; then
        warn "Connection timeout - server may be down"
    else
        warn "HTTP $http_code - endpoint not accessible"
    fi
    
    # Check HTTPS (if applicable)
    local https_code=$(curl -sL -w "%{http_code}" "https://$fqdn/health" -o /dev/null -m 5 -k 2>/dev/null || echo "000")
    
    if [ "$https_code" -eq 200 ]; then
        success "HTTPS enabled and accessible"
    elif [ "$https_code" -ne 000 ]; then
        warn "HTTPS returns $https_code"
    fi
    
    return 0
}

check_swarm_endpoints() {
    local subdomain=$1
    local fqdn="${subdomain}.${DOMAIN}"
    
    log "Testing Swarm API endpoints on $fqdn..."
    
    # Test all swarm endpoints
    local endpoints=(
        "/api/swarm/queen"
        "/api/swarm/agents"
        "/api/swarm/memory"
        "/api/wsjf/items"
        "/api/roam/audit"
    )
    
    for endpoint in "${endpoints[@]}"; do
        local code=$(curl -s -w "%{http_code}" "http://$fqdn$endpoint" -o /dev/null -m 5 2>/dev/null || echo "000")
        
        if [ "$code" -eq 200 ]; then
            echo "  ✓ $endpoint"
        else
            echo "  ✗ $endpoint ($code)"
        fi
    done
}

check_websocket() {
    local subdomain=$1
    local fqdn="${subdomain}.${DOMAIN}"
    
    log "Testing WebSocket on $fqdn..."
    
    if command -v wscat &> /dev/null; then
        timeout 3 wscat -c "ws://$fqdn/ws/execution" 2>&1 | head -5 || warn "WebSocket test timed out (expected)"
    else
        warn "wscat not installed (npm install -g wscat to test WebSockets)"
    fi
}

test_ssl_certificate() {
    local subdomain=$1
    local fqdn="${subdomain}.${DOMAIN}"
    
    log "Checking SSL certificate for $fqdn..."
    
    if command -v openssl &> /dev/null; then
        local cert_info=$(echo | openssl s_client -servername "$fqdn" -connect "$fqdn:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "")
        
        if [ -n "$cert_info" ]; then
            success "SSL certificate found"
            echo "$cert_info" | sed 's/^/  /'
        else
            warn "No SSL certificate or connection failed"
        fi
    fi
}

generate_report() {
    log "Generating DNS health report..."
    
    local report_file="/tmp/dns-health-report-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$report_file" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "domain": "$DOMAIN",
  "checks": [
EOF
    
    local first=true
    for subdomain in "${!ENDPOINTS[@]}"; do
        local fqdn="${subdomain}.${DOMAIN}"
        local ip=$(dig +short "$fqdn" @1.1.1.1 | head -1)
        local http_code=$(curl -sL -w "%{http_code}" "http://$fqdn/health" -o /dev/null -m 5 2>/dev/null || echo "000")
        
        if [ "$first" = false ]; then
            echo "," >> "$report_file"
        fi
        first=false
        
        cat >> "$report_file" <<EOF
    {
      "subdomain": "$subdomain",
      "fqdn": "$fqdn",
      "description": "${ENDPOINTS[$subdomain]}",
      "ip": "$ip",
      "http_status": $http_code,
      "accessible": $([ "$http_code" -eq 200 ] && echo "true" || echo "false")
    }
EOF
    done
    
    cat >> "$report_file" <<EOF

  ]
}
EOF
    
    success "Report saved to: $report_file"
    echo ""
    cat "$report_file" | jq '.'
}

main() {
    log "🔍 DNS Health Check for $DOMAIN"
    log "DNS Server: 1.1.1.1 (Cloudflare)"
    echo ""
    
    # Check each endpoint
    for subdomain in "${!ENDPOINTS[@]}"; do
        check_dns_resolution "$subdomain" "${ENDPOINTS[$subdomain]}" || true
        
        # Additional checks for swarm endpoints
        if [[ "$subdomain" == swarm.* ]]; then
            check_swarm_endpoints "$subdomain" || true
            check_websocket "$subdomain" || true
        fi
    done
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    
    # Generate summary
    log "Summary:"
    
    local total=0
    local accessible=0
    
    for subdomain in "${!ENDPOINTS[@]}"; do
        local fqdn="${subdomain}.${DOMAIN}"
        local http_code=$(curl -sL -w "%{http_code}" "http://$fqdn/health" -o /dev/null -m 5 2>/dev/null || echo "000")
        
        ((total++))
        if [ "$http_code" -eq 200 ]; then
            ((accessible++))
            success "$fqdn"
        else
            error "$fqdn ($http_code)"
        fi
    done
    
    echo ""
    log "Results: $accessible/$total endpoints accessible"
    
    if [ $accessible -eq $total ]; then
        success "All endpoints healthy! 🎉"
    elif [ $accessible -gt 0 ]; then
        warn "Some endpoints need attention"
    else
        error "No endpoints accessible - check DNS and server configuration"
    fi
    
    # Generate JSON report
    echo ""
    generate_report
    
    echo ""
    log "Next steps:"
    echo "  1. If DNS not propagated: wait 5-30 minutes and retry"
    echo "  2. If server not accessible: check nginx/firewall configuration"
    echo "  3. If HTTPS failing: update SSL certificates"
    echo "  4. Monitor with: watch -n 60 'bash scripts/dns-health-check.sh'"
}

main "$@"
