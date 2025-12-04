#!/bin/bash
# =============================================================================
# Phase 1 Blocker Validation Script
# =============================================================================
# Purpose: Test connectivity for all Phase 1 blockers
# Usage: ./scripts/validate_blockers.sh
# Exit codes:
#   0 = All tests passed
#   1 = One or more tests failed
# =============================================================================

# Don't exit on error - we handle errors ourselves
set -uo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
SKIPPED=0

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/config/.env.unified"

# =============================================================================
# Helper Functions
# =============================================================================

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; ((PASSED++)); }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; ((FAILED++)); }
log_skip() { echo -e "${YELLOW}[SKIP]${NC} $1"; ((SKIPPED++)); }
log_header() { echo -e "\n${BLUE}=== $1 ===${NC}"; }

is_placeholder() {
    [[ "$1" == *"PLACEHOLDER"* ]] || [[ -z "$1" ]]
}

# =============================================================================
# Load Environment
# =============================================================================

log_header "Loading Environment Configuration"

if [[ ! -f "$ENV_FILE" ]]; then
    log_fail "Environment file not found: $ENV_FILE"
    echo "  → Create it from template or run Phase 1 setup"
    exit 1
fi

log_pass "Environment file found: $ENV_FILE"

# Source environment variables (extract only KEY=VALUE lines, ignoring comments)
eval "$(grep -E '^[a-zA-Z_][a-zA-Z0-9_]*=' "$ENV_FILE" | sed 's/^/export /')"

log_info "Loaded environment variables successfully"

# =============================================================================
# BLOCKER-004: OpenRouter API Validation
# =============================================================================

log_header "BLOCKER-004: OpenRouter API"

if is_placeholder "${OPENROUTER_API_KEY:-}"; then
    log_skip "OpenRouter API key is placeholder - replace with actual key"
    echo "  → Get key from: https://openrouter.ai/keys"
else
    log_info "Testing OpenRouter API connectivity..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $OPENROUTER_API_KEY" \
        "https://openrouter.ai/api/v1/models" 2>/dev/null || echo "000")

    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    case "$HTTP_CODE" in
        200)
            log_pass "OpenRouter API - Connected successfully (HTTP 200)"
            MODEL_COUNT=$(echo "$BODY" | jq -r '.data | length' 2>/dev/null || echo "?")
            echo "  → Available models: $MODEL_COUNT"
            ;;
        401)
            log_fail "OpenRouter API - Invalid API key (HTTP 401)"
            echo "  → Regenerate key at: https://openrouter.ai/keys"
            ;;
        403)
            log_fail "OpenRouter API - Insufficient credits (HTTP 403)"
            echo "  → Add credits to your OpenRouter account"
            ;;
        *)
            log_fail "OpenRouter API - Connection failed (HTTP $HTTP_CODE)"
            echo "  → Check network connectivity"
            ;;
    esac
fi

# =============================================================================
# BLOCKER-005: OpenAI API Validation
# =============================================================================

log_header "BLOCKER-005: OpenAI API"

if is_placeholder "${OPENAI_API_KEY:-}"; then
    log_skip "OpenAI API key is placeholder - replace with actual key"
    echo "  → Get key from: https://platform.openai.com/api-keys"
else
    log_info "Testing OpenAI API connectivity..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $OPENAI_API_KEY" \
        "https://api.openai.com/v1/models" 2>/dev/null || echo "000")

    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    case "$HTTP_CODE" in
        200)
            log_pass "OpenAI API - Connected successfully (HTTP 200)"
            MODEL_COUNT=$(echo "$BODY" | jq -r '.data | length' 2>/dev/null || echo "?")
            echo "  → Available models: $MODEL_COUNT"
            ;;
        401)
            log_fail "OpenAI API - Invalid API key (HTTP 401)"
            echo "  → Regenerate key at: https://platform.openai.com/api-keys"
            ;;
        429)
            log_fail "OpenAI API - Rate limited (HTTP 429)"
            echo "  → Wait and retry, or check usage limits"
            ;;
        *)
            log_fail "OpenAI API - Connection failed (HTTP $HTTP_CODE)"
            echo "  → Check network connectivity"
            ;;
    esac
fi

# =============================================================================
# BLOCKER-007: StarlingX Connectivity
# =============================================================================

log_header "BLOCKER-007: StarlingX Infrastructure"

STX_HOST="${STX_HOSTNAME:-stx-aio-0.corp.interface.tag.ooo}"
STX_IP="${STX_IP_ADDRESS:-}"
STX_PORT="${STX_SSH_PORT:-2222}"
STX_USER="${STX_SSH_USER:-root}"

if is_placeholder "$STX_IP"; then
    log_skip "StarlingX IP address is placeholder - contact infra team"
    echo "  → Request IP for: $STX_HOST"
    echo "  → Update STX_IP_ADDRESS in $ENV_FILE"
else
    log_info "Testing StarlingX connectivity to $STX_IP:$STX_PORT..."

    # Test TCP connectivity first
    if nc -z -w5 "$STX_IP" "$STX_PORT" 2>/dev/null; then
        log_pass "StarlingX - TCP port $STX_PORT is open"

        # Test SSH authentication (will likely fail without proper key)
        log_info "Testing SSH authentication..."
        if timeout 10 ssh -o BatchMode=yes -o ConnectTimeout=5 \
            -p "$STX_PORT" "$STX_USER@$STX_IP" "echo 'SSH_OK'" 2>/dev/null | grep -q "SSH_OK"; then
            log_pass "StarlingX - SSH authentication successful"
        else
            log_skip "StarlingX - SSH auth failed (may need key setup)"
            echo "  → Ensure SSH key is configured for $STX_USER@$STX_IP"
        fi
    else
        log_fail "StarlingX - Cannot reach $STX_IP:$STX_PORT"
        echo "  → Verify IP address is correct"
        echo "  → Check network/firewall configuration"
    fi
fi

# Also test hostname resolution
log_info "Testing hostname resolution for $STX_HOST..."
if host "$STX_HOST" >/dev/null 2>&1; then
    RESOLVED_IP=$(host "$STX_HOST" | awk '/has address/ {print $4}' | head -1)
    log_pass "Hostname resolves to: $RESOLVED_IP"
else
    log_skip "Hostname does not resolve via DNS"
    echo "  → Add to /etc/hosts or configure local DNS"
fi

# =============================================================================
# Summary Report
# =============================================================================

log_header "Validation Summary"

echo ""
echo "┌─────────────────────────────────────────────────────────┐"
echo "│  PHASE 1 BLOCKER VALIDATION REPORT                      │"
echo "├─────────────────────────────────────────────────────────┤"
printf "│  %-10s │ %-40s │\n" "Status" "Count"
echo "├─────────────────────────────────────────────────────────┤"
printf "│  ${GREEN}PASSED${NC}     │ %-40s │\n" "$PASSED tests"
printf "│  ${RED}FAILED${NC}     │ %-40s │\n" "$FAILED tests"
printf "│  ${YELLOW}SKIPPED${NC}    │ %-40s │\n" "$SKIPPED tests (need credentials)"
echo "└─────────────────────────────────────────────────────────┘"
echo ""

# Determine overall status
if [[ $FAILED -gt 0 ]]; then
    echo -e "${RED}❌ BLOCKERS REMAIN - Fix failed tests before production deployment${NC}"
    exit 1
elif [[ $SKIPPED -gt 0 ]]; then
    echo -e "${YELLOW}⚠️  INCOMPLETE - Replace placeholder values and re-run validation${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Replace PLACEHOLDER values in $ENV_FILE"
    echo "  2. Re-run: ./scripts/validate_blockers.sh"
    echo "  3. See docs/API_KEY_ACQUISITION.md for detailed instructions"
    exit 0
else
    echo -e "${GREEN}✅ ALL BLOCKERS RESOLVED - Ready for production deployment${NC}"
    exit 0
fi
