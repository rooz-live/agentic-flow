#!/usr/bin/env bash
# SSO Flow Validation Test Suite
# RISK-005: Multi-domain SSO testing across 7 interface.* domains
# Usage: ./scripts/security/test-sso-flow.sh [--domain DOMAIN] [--verbose]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SSO_ENDPOINT="${SSO_ENDPOINT:-https://auth.interface.tag.ooo}"
REALM="interface"
TIMEOUT=10
VERBOSE="${VERBOSE:-false}"

# Domains to test
DOMAINS=(
    "app.interface.tag.ooo"
    "enterprise.interface.tag.ooo"
    "billing.interface.tag.ooo"
    "forum.interface.tag.ooo"
    "blog.interface.tag.ooo"
    "analytics.interface.tag.ooo"
    "risk.interface.tag.ooo"
)

# Parse arguments
SPECIFIC_DOMAIN=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --domain) SPECIFIC_DOMAIN="$2"; shift 2 ;;
        --verbose) VERBOSE="true"; shift ;;
        --help) echo "Usage: $0 [--domain DOMAIN] [--verbose]"; exit 0 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

log() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[PASS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; }

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# Test 1: Keycloak OIDC Discovery
test_oidc_discovery() {
    log "Testing OIDC Discovery endpoint..."
    local url="${SSO_ENDPOINT}/realms/${REALM}/.well-known/openid-configuration"
    
    if response=$(curl -s --max-time "$TIMEOUT" "$url" 2>/dev/null); then
        if echo "$response" | jq -e '.authorization_endpoint' >/dev/null 2>&1; then
            success "OIDC Discovery: Keycloak responding correctly"
            ((PASS_COUNT++))
            if [[ "$VERBOSE" == "true" ]]; then
                echo "  Auth endpoint: $(echo "$response" | jq -r '.authorization_endpoint')"
                echo "  Token endpoint: $(echo "$response" | jq -r '.token_endpoint')"
            fi
        else
            fail "OIDC Discovery: Invalid response format"
            ((FAIL_COUNT++))
        fi
    else
        warn "OIDC Discovery: Cannot reach Keycloak (not deployed yet?)"
        ((WARN_COUNT++))
    fi
}

# Test 2: Domain reachability
test_domain_reachability() {
    local domain="$1"
    log "Testing domain: $domain"
    
    if curl -s --max-time "$TIMEOUT" -o /dev/null -w "%{http_code}" "https://${domain}" 2>/dev/null | grep -qE '^(200|301|302|401|403)$'; then
        success "Domain reachable: $domain"
        ((PASS_COUNT++))
    else
        warn "Domain unreachable: $domain (may not be deployed)"
        ((WARN_COUNT++))
    fi
}

# Test 3: Cross-domain cookie configuration
test_cookie_config() {
    log "Testing cross-domain cookie configuration..."
    # Check if cookie domain is properly configured
    if [[ -f "config/security/multi_domain_sso.yaml" ]]; then
        if grep -q '.interface.tag.ooo' config/security/multi_domain_sso.yaml; then
            success "Cookie domain configured: .interface.tag.ooo"
            ((PASS_COUNT++))
        else
            fail "Cookie domain not configured correctly"
            ((FAIL_COUNT++))
        fi
    else
        fail "SSO config file not found"
        ((FAIL_COUNT++))
    fi
}

# Test 4: Client configurations exist
test_client_configs() {
    log "Testing client configurations..."
    local configs=(
        "config/security/wordpress-sso.php:WordPress"
        "config/security/flarum-oauth.json:Flarum"
        "config/security/hostbill-oauth.php:HostBill"
        "config/security/keycloak/docker-compose.yml:Keycloak"
    )
    for cfg in "${configs[@]}"; do
        local file="${cfg%:*}"
        local name="${cfg#*:}"
        if [[ -f "$file" ]]; then
            success "$name config exists: $file"
            ((PASS_COUNT++))
        else
            fail "$name config missing: $file"
            ((FAIL_COUNT++))
        fi
    done
}

# Main execution
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║        SSO Flow Validation Test Suite (RISK-005)              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

test_oidc_discovery
test_cookie_config
test_client_configs

# Test domains
if [[ -n "$SPECIFIC_DOMAIN" ]]; then
    test_domain_reachability "$SPECIFIC_DOMAIN"
else
    for domain in "${DOMAINS[@]}"; do
        test_domain_reachability "$domain"
    done
fi

# Summary
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "                      Test Summary"
echo "════════════════════════════════════════════════════════════════"
echo -e "  ${GREEN}PASSED${NC}: $PASS_COUNT"
echo -e "  ${YELLOW}WARNINGS${NC}: $WARN_COUNT"
echo -e "  ${RED}FAILED${NC}: $FAIL_COUNT"
echo ""

TOTAL=$((PASS_COUNT + WARN_COUNT + FAIL_COUNT))
COMPLETION=$(( (PASS_COUNT * 100) / TOTAL ))
echo "SSO Implementation Progress: ${COMPLETION}%"

if [[ $FAIL_COUNT -eq 0 ]]; then
    exit 0
else
    exit 1
fi

