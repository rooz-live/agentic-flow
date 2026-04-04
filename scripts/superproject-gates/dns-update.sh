#!/usr/bin/env bash
################################################################################
# Cloudflare DNS Update Script for rooz.live
# Automatically configures production DNS records
################################################################################

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $*"; }
success() { echo -e "${GREEN}✓${NC} $*"; }
error() { echo -e "${RED}✗${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }

################################################################################
# Configuration
################################################################################

# Cloudflare credentials (set these as environment variables)
ZONE_ID="${CLOUDFLARE_ZONE_ID:-}"
API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"
DOMAIN="rooz.live"

# Get infrastructure IPs
STX_IP="${YOLIFE_STX_HOST:-}"
GITLAB_INSTANCE="${YOLIFE_GITLAB_INSTANCE_ID:-i-04492376399ba0b47}"

################################################################################
# Functions
################################################################################

check_requirements() {
    if [ -z "$ZONE_ID" ] || [ -z "$API_TOKEN" ]; then
        error "Cloudflare credentials not set"
        echo ""
        echo "Please set environment variables:"
        echo "  export CLOUDFLARE_ZONE_ID='your_zone_id'"
        echo "  export CLOUDFLARE_API_TOKEN='your_api_token'"
        echo ""
        echo "Get these from: https://dash.cloudflare.com/"
        echo "  - Zone ID: Overview tab of your domain"
        echo "  - API Token: My Profile → API Tokens → Create Token"
        echo "    Required permissions: Zone.DNS (Edit)"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        error "jq not installed"
        echo "Install with: brew install jq"
        exit 1
    fi
    
    success "Requirements met"
}

get_aws_ip() {
    if ! command -v aws &> /dev/null; then
        warn "AWS CLI not installed, skipping AWS IP lookup"
        echo ""
        return
    fi
    
    log "Fetching AWS GitLab instance IP..."
    AWS_IP=$(aws ec2 describe-instances \
        --instance-ids "$GITLAB_INSTANCE" \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$AWS_IP" ] && [ "$AWS_IP" != "None" ]; then
        success "AWS IP: $AWS_IP"
        export AWS_IP
    else
        warn "Could not fetch AWS IP"
    fi
}

get_hivelocity_ip() {
    if [ -z "${HIVELOCITY_API_KEY:-}" ]; then
        warn "HIVELOCITY_API_KEY not set, skipping"
        return
    fi
    
    log "Fetching Hivelocity device 24460 IP..."
    HIVE_IP=$(curl -s -H "X-API-KEY: $HIVELOCITY_API_KEY" \
        "https://core.hivelocity.net/api/v2/device/24460" | jq -r '.primaryIp' 2>/dev/null || echo "")
    
    if [ -n "$HIVE_IP" ] && [ "$HIVE_IP" != "null" ]; then
        success "Hivelocity IP: $HIVE_IP"
        export HIVE_IP
    else
        warn "Could not fetch Hivelocity IP"
    fi
}

list_dns_records() {
    log "Fetching existing DNS records..."
    
    curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
        -H "Authorization: Bearer $API_TOKEN" \
        -H "Content-Type: application/json" | jq -r '.result[] | "\(.name) → \(.type) → \(.content)"'
}

create_or_update_dns_record() {
    local name=$1
    local type=$2
    local content=$3
    local proxied=${4:-false}
    local ttl=${5:-1}  # 1 = Auto
    
    # Check if record exists
    local record_id=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?name=$name" \
        -H "Authorization: Bearer $API_TOKEN" \
        -H "Content-Type: application/json" | jq -r '.result[0].id // empty')
    
    if [ -n "$record_id" ] && [ "$record_id" != "null" ]; then
        # Update existing record
        log "Updating $name..."
        response=$(curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$record_id" \
            -H "Authorization: Bearer $API_TOKEN" \
            -H "Content-Type: application/json" \
            --data "{
                \"type\": \"$type\",
                \"name\": \"$name\",
                \"content\": \"$content\",
                \"ttl\": $ttl,
                \"proxied\": $proxied
            }")
    else
        # Create new record
        log "Creating $name..."
        response=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
            -H "Authorization: Bearer $API_TOKEN" \
            -H "Content-Type: application/json" \
            --data "{
                \"type\": \"$type\",
                \"name\": \"$name\",
                \"content\": \"$content\",
                \"ttl\": $ttl,
                \"proxied\": $proxied
            }")
    fi
    
    # Check response
    if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
        success "$name → $content"
    else
        error "$name failed: $(echo $response | jq -r '.errors[0].message // "Unknown error"')"
    fi
}

create_cname_record() {
    local name=$1
    local target=$2
    local proxied=${3:-false}
    
    create_or_update_dns_record "$name" "CNAME" "$target" "$proxied" 1
}

################################################################################
# Main DNS Configuration
################################################################################

main() {
    log "🌐 Configuring DNS for $DOMAIN"
    echo ""
    
    check_requirements
    
    # Get infrastructure IPs
    get_aws_ip
    get_hivelocity_ip
    
    echo ""
    log "Current DNS records:"
    list_dns_records | grep -E "(swarm|stx|aws|gitlab|hive|hetz)" || echo "No matching records found"
    echo ""
    
    # Prompt for confirmation
    read -p "Continue with DNS updates? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        warn "Aborted"
        exit 0
    fi
    
    log "Creating/updating DNS records..."
    echo ""
    
    # Critical production records (Priority 1)
    if [ -n "$STX_IP" ]; then
        create_or_update_dns_record "swarm.stx.$DOMAIN" "A" "$STX_IP" false 60
        create_or_update_dns_record "stx.$DOMAIN" "A" "$STX_IP" false 300
        create_or_update_dns_record "stx-api.$DOMAIN" "A" "$STX_IP" false 300
    else
        warn "STX_IP not set, skipping StarlingX records"
    fi
    
    if [ -n "${AWS_IP:-}" ]; then
        create_or_update_dns_record "swarm.aws.$DOMAIN" "A" "$AWS_IP" false 60
        create_or_update_dns_record "aws.$DOMAIN" "A" "$AWS_IP" false 300
        create_or_update_dns_record "gitlab.$DOMAIN" "A" "$AWS_IP" true 1  # Proxied
    else
        warn "AWS_IP not set, skipping AWS records"
    fi
    
    if [ -n "${HIVE_IP:-}" ]; then
        create_or_update_dns_record "swarm.hive.$DOMAIN" "A" "$HIVE_IP" false 60
        create_or_update_dns_record "hive.$DOMAIN" "A" "$HIVE_IP" false 300
    else
        warn "HIVE_IP not set, skipping Hivelocity records"
    fi
    
    echo ""
    
    # CNAME records (Priority 2)
    log "Creating CNAME records..."
    create_cname_record "cicd.$DOMAIN" "gitlab.$DOMAIN" true
    create_cname_record "api.$DOMAIN" "swarm.$DOMAIN" false
    
    echo ""
    success "DNS configuration complete!"
    
    # Show updated records
    echo ""
    log "Updated DNS records:"
    list_dns_records | grep -E "(swarm|stx|aws|gitlab|hive|hetz|cicd|api)"
    
    echo ""
    log "Verification:"
    echo "  Wait 1-5 minutes for DNS propagation"
    echo "  Then run: bash scripts/dns-health-check.sh"
    echo ""
    echo "Next steps:"
    echo "  1. Update SSL certificates: certbot certonly --dns-cloudflare -d *.rooz.live"
    echo "  2. Configure nginx on each server for HTTPS"
    echo "  3. Test endpoints: curl https://swarm.stx.rooz.live/health"
}

main "$@"
