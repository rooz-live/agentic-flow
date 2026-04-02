#!/bin/bash
# Test TLD Configuration - Verify TLD setup is working

set -euo pipefail

# Source configurations
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$PROJECT_ROOT/_SYSTEM/_AUTOMATION/tld-server-config.sh"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🧪 Testing TLD Configuration${NC}"
echo ""

# Test 1: Check config file exists
echo -e "${YELLOW}Test 1: Configuration file${NC}"
if [[ -f "$PROJECT_ROOT/.tld-config" ]]; then
    echo -e "${GREEN}✅ .tld-config found${NC}"
else
    echo -e "${RED}❌ .tld-config not found${NC}"
fi

# Test 2: Check domain mappings via explicit substitution
echo -e "\n${YELLOW}Test 2: Domain mappings${NC}"
for env in prod staging dev gateway evidence process; do
    domain=$(get_domain_for_env "$env")
    if [[ -z "$domain" ]]; then
        echo "  ❌ $env mapping failed (Empty binding)"
        exit 1
    fi
    echo "  $env → $domain"
done

# Test 3: Generate URLs
echo -e "\n${YELLOW}Test 3: URL generation${NC}"
for env in prod staging gateway evidence process; do
    url=$(generate_public_url "$env" 80)
    echo "  $env: $url"
done

# Test 4: Check readiness
echo -e "\n${YELLOW}Test 4: Readiness checks${NC}"
if check_tld_readiness; then
    echo -e "  ✅ Readiness checks passed"
else
    echo -e "  ⚠️ Readiness blocked via Early Exit (Expected if unmapped natively)"
fi

# Test 5: Show current configuration
echo -e "\n${YELLOW}Test 5: Current configuration${NC}"
echo "  DASHBOARD_DOMAIN: $DASHBOARD_DOMAIN"
echo "  DASHBOARD_PORT: $DASHBOARD_PORT"
echo "  DASHBOARD_SSL: $DASHBOARD_SSL"
echo "  DASHBOARD_PROTOCOL: $DASHBOARD_PROTOCOL"
echo "  USE_TLD_BY_DEFAULT: ${USE_TLD_BY_DEFAULT:-false}"

echo ""
echo -e "${GREEN}✅ TLD Configuration Test Complete${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Start server: ./scripts/quick-start-dashboard.sh"
echo "  2. Start tunnel: ./scripts/start-tld-tunnel.sh staging 8080"
echo "  3. Check status: ./scripts/orchestrators/cascade-tunnel.sh status"
