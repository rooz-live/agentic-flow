#!/usr/bin/env bash
#
# validate-secrets.sh - Validate secrets configuration and report gaps
#
# Usage: ./scripts/validate-secrets.sh [--strict]
#
# Options:
#   --strict    Exit with error code if any secrets are missing

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STRICT_MODE=false

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --strict)
            STRICT_MODE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--strict]"
            exit 1
            ;;
    esac
done

echo "=== Agentic Flow Secrets Validation ==="
echo ""

# Load .env if it exists
if [ -f "$PROJECT_ROOT/.env" ]; then
    echo "Loading environment from .env file..."
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
    echo ""
fi

# Track counts
TOTAL_SECRETS=0
SET_SECRETS=0
MISSING_SECRETS=0
PLACEHOLDER_SECRETS=0

# Check if a value is set and not a placeholder
check_secret() {
    local name="$1"
    local required="$2"  # "required" or "optional"
    local value="${!name:-}"
    
    TOTAL_SECRETS=$((TOTAL_SECRETS + 1))
    
    if [ -z "$value" ]; then
        if [ "$required" = "required" ]; then
            echo -e "${RED}❌ $name${NC} - MISSING (required)"
            MISSING_SECRETS=$((MISSING_SECRETS + 1))
        else
            echo -e "${YELLOW}⚠️  $name${NC} - Not set (optional)"
        fi
        return 1
    elif [[ "$value" == *"your_"* ]] || [[ "$value" == *"placeholder"* ]]; then
        echo -e "${YELLOW}⚠️  $name${NC} - PLACEHOLDER"
        PLACEHOLDER_SECRETS=$((PLACEHOLDER_SECRETS + 1))
        return 1
    else
        echo -e "${GREEN}✅ $name${NC} - Set (${#value} chars)"
        SET_SECRETS=$((SET_SECRETS + 1))
        return 0
    fi
}

echo "--- AWS Configuration ---"
check_secret AWS_ACCESS_KEY_ID required
check_secret AWS_SECRET_ACCESS_KEY required
check_secret AWS_REGION optional
echo ""

echo "--- AI/LLM API Keys ---"
check_secret ANTHROPIC_API_KEY required
check_secret OPENAI_API_KEY optional
check_secret OPENROUTER_API_KEY optional
check_secret GEMINI_API_KEY optional
echo ""

echo "--- Database ---"
check_secret POSTGRES_PASSWORD required
check_secret POSTGRES_USER optional
check_secret POSTGRES_DB optional
echo ""

echo "--- CI/CD & Version Control ---"
check_secret GITLAB_TOKEN optional
check_secret GITHUB_TOKEN optional
echo ""

echo "--- Security & Secrets Management ---"
check_secret PASSBOLT_API_TOKEN optional
echo ""

echo "--- Infrastructure & CDN ---"
check_secret CLOUDFLARE_API_TOKEN optional
check_secret CLOUDFLARE_API_KEY optional
check_secret CLOUDFLARE_EMAIL optional
check_secret CPANEL_API_KEY optional
check_secret HOSTBILL_API_KEY optional
check_secret HOSTBILL_API_ID optional
check_secret HOSTBILL_URL optional
check_secret HIVELOCITY_API_KEY optional
echo ""

echo "--- Payment Gateways ---"
check_secret STRIPE_SECRET_KEY optional
check_secret STRIPE_PUBLIC_KEY optional
check_secret PAYPAL_CLIENT_ID optional
check_secret PAYPAL_CLIENT_SECRET optional
check_secret KLARNA_USERNAME optional
check_secret KLARNA_PASSWORD optional
check_secret SQUARE_ACCESS_TOKEN optional
echo ""

echo "--- Communication Services ---"
check_secret DISCORD_BOT_TOKEN optional
check_secret PLIVO_AUTH_ID optional
check_secret PLIVO_AUTH_TOKEN optional
check_secret TELNYX_API_KEY optional
echo ""

# Summary
echo "======================================="
echo "Summary:"
echo "  Total secrets checked: $TOTAL_SECRETS"
echo -e "  ${GREEN}Set: $SET_SECRETS${NC}"
echo -e "  ${YELLOW}Placeholders: $PLACEHOLDER_SECRETS${NC}"
echo -e "  ${RED}Missing: $MISSING_SECRETS${NC}"
echo ""

# Recommendations
if [ $MISSING_SECRETS -gt 0 ] || [ $PLACEHOLDER_SECRETS -gt 0 ]; then
    echo "Recommendations:"
    
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        echo "  1. Create .env file: cp .env.example .env"
    fi
    
    if [ $MISSING_SECRETS -gt 0 ]; then
        echo "  2. Fill in required credentials in .env"
    fi
    
    if [ $PLACEHOLDER_SECRETS -gt 0 ]; then
        echo "  3. Replace placeholder values with real credentials"
    fi
    
    echo "  4. See docs/SECURITY.md for credential acquisition"
    echo ""
fi

# Check .gitignore
if ! grep -q "^\.env$" "$PROJECT_ROOT/.gitignore" 2>/dev/null; then
    echo -e "${RED}⚠️  WARNING: .env is NOT in .gitignore!${NC}"
    echo "   Add it with: echo '.env' >> .gitignore"
    echo ""
fi

# Exit code
if [ "$STRICT_MODE" = true ] && [ $MISSING_SECRETS -gt 0 ]; then
    echo -e "${RED}FAILED: $MISSING_SECRETS required secrets missing${NC}"
    exit 1
elif [ $MISSING_SECRETS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  $MISSING_SECRETS secrets missing (non-blocking)${NC}"
    exit 0
else
    echo -e "${GREEN}✅ All required secrets configured${NC}"
    exit 0
fi
