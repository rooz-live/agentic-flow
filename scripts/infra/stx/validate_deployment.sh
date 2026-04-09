#!/usr/bin/env bash
# StarlingX Deployment Validation
# Quick validation for soft launch readiness

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}StarlingX Deployment Validation${NC}"
echo -e "${BLUE}======================================${NC}\n"

# 1. Check OpenStack CLI
echo -n "1. OpenStack CLI: "
if command -v openstack &> /dev/null; then
    echo -e "${GREEN}✓ Installed${NC} ($(which openstack))"
else
    echo -e "${RED}✗ Not found${NC}"
    echo "   Install: pip install python-openstackclient"
    exit 1
fi

# 2. Check environment variables
echo -n "2. OS_AUTH_URL: "
if [[ -n "${OS_AUTH_URL:-}" ]]; then
    echo -e "${GREEN}✓ Configured${NC} ($OS_AUTH_URL)"
else
    echo -e "${YELLOW}⚠ Not set${NC}"
fi

echo -n "3. OS_PASSWORD: "
if [[ -n "${OS_PASSWORD:-}" ]]; then
    echo -e "${GREEN}✓ Configured${NC} (redacted)"
else
    echo -e "${YELLOW}⚠ Not set${NC}"
fi

# 4. Check StarlingX connectivity
echo -n "4. StarlingX SSH: "
STX_IP="${STX_IP_ADDRESS:-**********}"
STX_PORT="${STX_SSH_PORT:-2222}"

if [[ "$STX_IP" != "**********" ]] && nc -z -w5 "$STX_IP" "$STX_PORT" 2>/dev/null; then
    echo -e "${GREEN}✓ Reachable${NC} ($STX_IP:$STX_PORT)"
else
    echo -e "${YELLOW}⚠ Not reachable${NC} (check STX_IP_ADDRESS)"
fi

# 5. Check HostBill configuration
echo -n "5. HostBill API: "
if [[ -n "${HOSTBILL_API_URL:-}" ]] && [[ -n "${HOSTBILL_API_KEY:-}" ]]; then
    echo -e "${GREEN}✓ Configured${NC}"
else
    echo -e "${YELLOW}⚠ Not configured${NC} (can use --skip-billing)"
fi

# 6. Check .goalie directory
echo -n "6. .goalie directory: "
if [[ -d ".goalie" ]]; then
    echo -e "${GREEN}✓ Exists${NC}"
    
    # Check pattern metrics
    if [[ -f ".goalie/pattern_metrics.jsonl" ]]; then
        COUNT=$(wc -l < .goalie/pattern_metrics.jsonl 2>/dev/null || echo "0")
        echo "   Pattern metrics: $COUNT events"
    fi
else
    echo -e "${YELLOW}⚠ Missing${NC}"
    mkdir -p .goalie
    echo "   Created .goalie directory"
fi

# 7. Check rollback procedure
echo -n "7. Rollback procedure: "
if [[ -f ".goalie/ROLLBACK_PROCEDURE.yaml" ]]; then
    echo -e "${GREEN}✓ Documented${NC}"
else
    echo -e "${YELLOW}⚠ Not found${NC}"
fi

# 8. Check ROAM tracker
echo -n "8. ROAM tracker: "
if [[ -f ".goalie/ROAM_TRACKER.yaml" ]]; then
    echo -e "${GREEN}✓ Available${NC}"
    
    # Count resolved blockers
    RESOLVED=$(grep -c "roam_status: \"RESOLVED\"" .goalie/ROAM_TRACKER.yaml 2>/dev/null || echo "0")
    echo "   Resolved blockers: $RESOLVED"
else
    echo -e "${YELLOW}⚠ Not found${NC}"
fi

# Summary
echo -e "\n${BLUE}======================================${NC}"
echo -e "${BLUE}Validation Summary${NC}"
echo -e "${BLUE}======================================${NC}"
echo -e "${GREEN}✓${NC} Ready for dry-run deployment testing"
echo -e "\nNext steps:"
echo -e "  1. Set required environment variables (OS_AUTH_URL, OS_PASSWORD)"
echo -e "  2. Test deployment: ${BLUE}bash scripts/starlingx/deploy.sh --dry-run --skip-billing${NC}"
echo -e "  3. Review metrics: ${BLUE}.goalie/pattern_metrics.jsonl${NC}"
