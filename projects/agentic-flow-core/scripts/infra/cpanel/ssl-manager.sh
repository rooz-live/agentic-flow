#!/usr/bin/env bash
set -euo pipefail

# cPanel SSL Certificate Manager
# Manages SSL certificates via cPanel UAPI with multi-domain support
# Integrates with ay prod-cycle for DoR/DoD budget/time constraints

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/source-cpanel-env.sh
source "$SCRIPT_DIR/../lib/source-cpanel-env.sh"
source_cpanel_env_init "$SCRIPT_DIR"
GOALIE_DIR="$PROJECT_ROOT/.goalie"

# Multi-domain configuration (supports rooz.live, yo.life, yoservice.com)
CPANEL_HOST="${CPANEL_HOST:-}"
CPANEL_USER="${CPANEL_USER:-}"
CPANEL_TOKEN="${CPANEL_TOKEN:-}"
CPANEL_DOMAIN="${CPANEL_DOMAIN:-rooz.live}"

# Domain profiles (format: domain:host:user:token)
DOMAIN_PROFILES="${DOMAIN_PROFILES:-}"
if [ -f "$PROJECT_ROOT/config/cpanel_domains.conf" ]; then
    source "$PROJECT_ROOT/config/cpanel_domains.conf"
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

log_pattern() {
    local pattern="$1"
    local data="$2"
    local gate="${3:-ssl}"
    
    if [ ! -d "$GOALIE_DIR" ]; then
        mkdir -p "$GOALIE_DIR"
    fi
    
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local run_id="${AF_RUN_ID:-$(uuidgen | tr '[:upper:]' '[:lower:]')}"
    
    cat >> "$GOALIE_DIR/pattern_metrics.jsonl" <<EOF
{"pattern":"$pattern","timestamp":"$timestamp","run_id":"$run_id","gate":"$gate","data":$data}
EOF
}

check_config() {
    if [ -z "$CPANEL_HOST" ] || [ -z "$CPANEL_USER" ] || [ -z "$CPANEL_TOKEN" ]; then
        echo -e "${RED}Error: cPanel credentials not configured${NC}"
        echo ""
        echo "Please set environment variables:"
        echo "  export CPANEL_HOST='cpanel.yourdomain.com'"
        echo "  export CPANEL_USER='your_cpanel_username'"
        echo "  export CPANEL_TOKEN='your_api_token'"
        echo ""
        echo "To create an API token:"
        echo "  1. Log into cPanel"
        echo "  2. Navigate to Security > Manage API Tokens"
        echo "  3. Create a new token with name 'ssl-automation'"
        echo "  4. Copy the token value"
        echo ""
        exit 1
    fi
}

call_uapi() {
    local module=$1
    local function=$2
    shift 2
    local params="$@"
    
    curl -s -H "Authorization: cpanel $CPANEL_USER:$CPANEL_TOKEN" \
        "https://$CPANEL_HOST:2083/execute/$module/$function?$params"
}

list_ssl_certificates() {
    print_header "📜 Current SSL Certificates"
    
    echo "Fetching SSL certificates for $CPANEL_DOMAIN..."
    echo ""
    
    response=$(call_uapi SSL list_certs)
    
    # Parse and display certificates
    echo "$response" | jq -r '.data[] | "Domain: \(.domain)\nIssuer: \(.issuer.commonName // "N/A")\nExpires: \(.not_after)\nSubjects: \(.domains | join(", "))\n---"'
}

check_autossl_status() {
    print_header "🔄 AutoSSL Status"
    
    echo "Checking AutoSSL configuration..."
    echo ""
    
    response=$(call_uapi SSL get_autossl_pending_queue)
    
    if echo "$response" | jq -e '.data.pending_queue | length > 0' > /dev/null 2>&1; then
        echo -e "${YELLOW}AutoSSL has pending requests:${NC}"
        echo "$response" | jq -r '.data.pending_queue[] | "  - \(.domain)"'
    else
        echo -e "${GREEN}No pending AutoSSL requests${NC}"
    fi
    
    echo ""
    echo "AutoSSL providers:"
    response=$(call_uapi SSL get_autossl_providers)
    echo "$response" | jq -r '.data[] | "  - \(.display_name): \(.status)"'
}

trigger_autossl_check() {
    print_header "🚀 Trigger AutoSSL Certificate Check"
    
    echo "Requesting AutoSSL certificate for $CPANEL_DOMAIN..."
    echo ""
    
    # Trigger AutoSSL check for the domain
    response=$(call_uapi SSL start_autossl_check "domain=$CPANEL_DOMAIN")
    
    if echo "$response" | jq -e '.status == 1' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ AutoSSL check initiated successfully${NC}"
        echo ""
        echo "AutoSSL will attempt to:"
        echo "  1. Verify domain ownership via HTTP validation"
        echo "  2. Issue certificate for $CPANEL_DOMAIN and subdomains"
        echo "  3. Install certificate automatically"
        echo ""
        echo "This process typically takes 5-15 minutes."
        echo "Check status with: $0 status"
    else
        echo -e "${RED}✗ AutoSSL check failed${NC}"
        echo "$response" | jq -r '.errors[]' || echo "$response"
    fi
}

install_custom_cert() {
    local cert_file=$1
    local key_file=$2
    local domain=${3:-$CPANEL_DOMAIN}
    
    print_header "📥 Install Custom SSL Certificate"
    
    if [ ! -f "$cert_file" ] || [ ! -f "$key_file" ]; then
        echo -e "${RED}Error: Certificate or key file not found${NC}"
        exit 1
    fi
    
    echo "Installing certificate for $domain..."
    
    cert=$(cat "$cert_file" | jq -sRr @uri)
    key=$(cat "$key_file" | jq -sRr @uri)
    
    response=$(call_uapi SSL install_ssl \
        "domain=$domain" \
        "cert=$cert" \
        "key=$key")
    
    if echo "$response" | jq -e '.status == 1' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Certificate installed successfully${NC}"
    else
        echo -e "${RED}✗ Installation failed${NC}"
        echo "$response" | jq -r '.errors[]' || echo "$response"
    fi
}

check_domain_coverage() {
    print_header "🔍 SSL Certificate Coverage Check"
    
    local target_domain="${1:-all}"
    local domains=()
    
    # Define domain sets
    case "$target_domain" in
        rooz.live|rooz)
            domains=("rooz.live" "www.rooz.live" "circles.rooz.live" "api.rooz.live")
            ;;
        yo.life|yo)
            domains=("yo.life" "www.yo.life" "api.yo.life" "rooz.yo.life")
            ;;
        yoservice.com|yoservice)
            domains=("yoservice.com" "www.yoservice.com" "api.yoservice.com")
            ;;
        all)
            domains=("rooz.live" "www.rooz.live" "circles.rooz.live" "api.rooz.live" \
                     "yo.life" "www.yo.life" "api.yo.life" "rooz.yo.life" \
                     "yoservice.com" "www.yoservice.com" "api.yoservice.com")
            ;;
        *)
            domains=("$target_domain")
            ;;
    esac
    
    echo "Checking SSL coverage for ${#domains[@]} domain(s)..."
    echo ""
    
    local valid=0
    local invalid=0
    local no_dns=0
    local start_time=$(date +%s)
    
    for domain in "${domains[@]}"; do
        echo -n "  $domain: "
        
        if timeout 3 curl -s -I "https://$domain" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ SSL Valid${NC}"
            ((valid++))
        else
            # Check if DNS exists
            if dig +short "$domain" | grep -q '.'; then
                echo -e "${RED}✗ SSL Invalid/Missing${NC}"
                ((invalid++))
            else
                echo -e "${YELLOW}⚠ No DNS Record${NC}"
                ((no_dns++))
            fi
        fi
    done
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    echo "Summary: $valid valid, $invalid invalid, $no_dns no DNS (checked in ${duration}s)"
    
    # Log to pattern metrics for ay prod integration
    log_pattern "ssl-coverage-check" "{\"valid\":$valid,\"invalid\":$invalid,\"no_dns\":$no_dns,\"duration_ms\":$((duration * 1000)),\"domain\":\"$target_domain\"}" "ssl"
    
    # Return appropriate exit code
    if [ $invalid -gt 0 ]; then
        return 1
    fi
    return 0
}

show_autossl_log() {
    print_header "📋 AutoSSL Recent Activity"
    
    response=$(call_uapi SSL get_autossl_log)
    
    echo "$response" | jq -r '.data[] | "[\(.timestamp)] \(.message)"' | tail -20
}

generate_csr() {
    local domain=${1:-$CPANEL_DOMAIN}
    
    print_header "🔑 Generate Certificate Signing Request (CSR)"
    
    echo "Generating CSR for $domain with wildcard support..."
    
    # Generate CSR via cPanel UAPI
    response=$(call_uapi SSL generate_ssl_key_and_csr \
        "domains=$domain,*.$domain,www.$domain,circles.$domain" \
        "country=DE" \
        "state=Berlin" \
        "city=Berlin" \
        "company=yo.life" \
        "email=admin@$domain")
    
    if echo "$response" | jq -e '.status == 1' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ CSR generated successfully${NC}"
        echo ""
        echo "CSR:"
        echo "$response" | jq -r '.data.csr'
        echo ""
        echo "Private Key (save securely):"
        echo "$response" | jq -r '.data.key'
    else
        echo -e "${RED}✗ CSR generation failed${NC}"
        echo "$response" | jq -r '.errors[]' || echo "$response"
    fi
}

batch_check_all_domains() {
    print_header "🌐 Batch SSL Check - All Configured Domains"
    
    local domains=("rooz.live" "yo.life" "yoservice.com")
    local overall_status=0
    
    for domain in "${domains[@]}"; do
        echo ""
        echo -e "${CYAN}Checking $domain...${NC}"
        if ! check_domain_coverage "$domain"; then
            overall_status=1
        fi
    done
    
    return $overall_status
}

trigger_multi_domain() {
    print_header "🚀 Trigger AutoSSL - Multiple Domains"
    
    local domains=("rooz.live" "yo.life" "yoservice.com")
    
    for domain in "${domains[@]}"; do
        echo ""
        echo -e "${CYAN}Processing $domain...${NC}"
        
        # Set domain-specific credentials if available
        case "$domain" in
            rooz.live)
                CPANEL_HOST="rooz.live"
                CPANEL_USER="rooz"
                CPANEL_TOKEN="${CPANEL_TOKEN_ROOZ:-$CPANEL_TOKEN}"
                ;;
            yo.life)
                CPANEL_HOST="yo.life"
                CPANEL_USER="yo"
                CPANEL_TOKEN="${CPANEL_TOKEN_YO:-$CPANEL_TOKEN}"
                ;;
            yoservice.com)
                CPANEL_HOST="yoservice.com"
                CPANEL_USER="yoservice"
                CPANEL_TOKEN="${CPANEL_TOKEN_YOSERVICE:-$CPANEL_TOKEN}"
                ;;
        esac
        
        CPANEL_DOMAIN="$domain"
        trigger_autossl_check
        
        # Rate limit between domains
        sleep 2
    done
}

show_usage() {
    cat << EOF
cPanel SSL Certificate Manager (Multi-Domain)

Usage: $0 <command> [options]

Commands:
  list              List all SSL certificates
  status            Check AutoSSL status
  trigger [domain]  Trigger AutoSSL check for domain(s)
  check [domain]    Check SSL coverage (rooz.live|yo.life|yoservice.com|all)
  batch             Check all configured domains
  multi-trigger     Trigger AutoSSL for all configured domains
  log               Show recent AutoSSL activity
  csr               Generate CSR for wildcard certificate
  install <cert> <key> [domain]
                    Install custom SSL certificate
  help              Show this help message

Environment Variables:
  CPANEL_HOST       cPanel hostname (e.g., cpanel.example.com)
  CPANEL_USER       cPanel username
  CPANEL_TOKEN      cPanel API token
  CPANEL_DOMAIN     Primary domain (default: rooz.live)

Examples:
  # Check current status
  $0 status
  
  # Trigger AutoSSL
  $0 trigger
  
  # Check SSL coverage
  $0 check
  
  # Generate wildcard CSR
  $0 csr
  
  # Install custom certificate
  $0 install /path/to/cert.pem /path/to/key.pem circles.rooz.live

Setup:
  1. Create API token in cPanel (Security > Manage API Tokens)
  2. Export credentials:
     export CPANEL_HOST='cpanel.yourdomain.com'
     export CPANEL_USER='username'
     export CPANEL_TOKEN='token_value'
  3. Run commands

EOF
}

# Main execution
case "${1:-help}" in
    list|l)
        check_config
        list_ssl_certificates
        ;;
    status|s)
        check_config
        check_autossl_status
        ;;
    trigger|t)
        if [ "${2:-}" == "all" ] || [ "${2:-}" == "multi" ]; then
            trigger_multi_domain
        else
            check_config
            CPANEL_DOMAIN="${2:-$CPANEL_DOMAIN}"
            trigger_autossl_check
        fi
        ;;
    check|c)
        check_domain_coverage "${2:-all}"
        ;;
    batch|b)
        batch_check_all_domains
        ;;
    multi-trigger|mt)
        trigger_multi_domain
        ;;
    log)
        check_config
        show_autossl_log
        ;;
    csr)
        check_config
        generate_csr "${2:-}"
        ;;
    install|i)
        check_config
        install_custom_cert "${2:-}" "${3:-}" "${4:-}"
        ;;
    help|h|*)
        show_usage
        ;;
esac
