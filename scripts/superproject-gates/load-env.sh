#!/bin/bash
# Dynamic Environment Loader
# Loads environment variables with hierarchical override system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Default environment
ENVIRONMENT="${1:-development}"

# Available infrastructures and services
INFRASTRUCTURES=("aws" "cpanel" "starlingx" "hetzner" "hivelocity")
SERVICES=("claude-flow" "mcp" "observability" "database")

# Function to load env file if exists
load_env_file() {
    local file="$1"
    local label="$2"
    
    if [[ -f "$file" ]]; then
        echo -e "${BLUE}[LOADING]${NC} $label: $file"
        set -a  # Auto-export variables
        source "$file"
        set +a
        return 0
    else
        echo -e "${YELLOW}[SKIP]${NC} $label: $file (not found)"
        return 1
    fi
}

# Function to export variable with override tracking
export_with_tracking() {
    local key="$1"
    local value="$2"
    local source="$3"
    
    if [[ -n "${!key}" ]] && [[ "${!key}" != "$value" ]]; then
        echo -e "${GREEN}[OVERRIDE]${NC} $key (was: ${!key:0:10}... → now: ${value:0:10}... from $source)"
    fi
    export "$key=$value"
}

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Environment Configuration Loader${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Environment: ${GREEN}$ENVIRONMENT${NC}"
echo -e "Project Root: ${BLUE}$PROJECT_ROOT${NC}"
echo ""

# Step 1: Load base configuration
echo -e "${YELLOW}[STEP 1]${NC} Loading base configuration..."
load_env_file "$SCRIPT_DIR/.env.base" "Base Config"
echo ""

# Step 2: Load infrastructure configs
echo -e "${YELLOW}[STEP 2]${NC} Loading infrastructure configurations..."
for infra in "${INFRASTRUCTURES[@]}"; do
    load_env_file "$SCRIPT_DIR/infrastructure/.env.$infra" "Infrastructure: $infra"
done
echo ""

# Step 3: Load service configs
echo -e "${YELLOW}[STEP 3]${NC} Loading service configurations..."
for service in "${SERVICES[@]}"; do
    load_env_file "$SCRIPT_DIR/services/.env.$service" "Service: $service"
done
echo ""

# Step 4: Load environment-specific config
echo -e "${YELLOW}[STEP 4]${NC} Loading environment-specific configuration..."
if [[ "$ENVIRONMENT" != "development" ]]; then
    load_env_file "$SCRIPT_DIR/.env.$ENVIRONMENT" "Environment: $ENVIRONMENT"
fi
echo ""

# Step 5: Load local overrides (highest priority)
echo -e "${YELLOW}[STEP 5]${NC} Loading local overrides..."
if load_env_file "$SCRIPT_DIR/.env.local" "Local Overrides"; then
    echo -e "${GREEN}✓${NC} Local overrides applied"
else
    echo -e "${YELLOW}ℹ${NC} No local overrides found (create .env.local for secrets)"
fi
echo ""

# Export environment variable
export AGENTIC_FLOW_ENV="$ENVIRONMENT"

# Validation: Check for required variables
echo -e "${YELLOW}[VALIDATION]${NC} Checking required variables..."
REQUIRED_VARS=(
    "NODE_ENV"
    "PROJECT_NAME"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [[ -z "${!var}" ]]; then
        MISSING_VARS+=("$var")
    fi
done

if [[ ${#MISSING_VARS[@]} -gt 0 ]]; then
    echo -e "${RED}✗${NC} Missing required variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo -e "  ${RED}•${NC} $var"
    done
    echo ""
    echo -e "${YELLOW}ℹ${NC} Add missing variables to config/env/.env.base or .env.local"
    echo ""
fi

# Infrastructure connectivity check
echo -e "${YELLOW}[CONNECTIVITY]${NC} Infrastructure status..."

# Check AWS
if [[ -n "$AWS_ACCESS_KEY_ID" ]] && [[ -n "$AWS_SECRET_ACCESS_KEY" ]]; then
    echo -e "${GREEN}✓${NC} AWS credentials configured"
else
    echo -e "${YELLOW}ℹ${NC} AWS credentials not configured"
fi

# Check StarlingX
if [[ -n "$YOLIFE_STX_HOST" ]] && [[ -f "${YOLIFE_STX_KEY:-$HOME/.ssh/starlingx_key}" ]]; then
    echo -e "${GREEN}✓${NC} StarlingX SSH configured"
else
    echo -e "${YELLOW}ℹ${NC} StarlingX SSH not configured"
fi

# Check cPanel
if [[ -n "$YOLIFE_CPANEL_HOST" ]] && [[ -n "$CPANEL_API_TOKEN" ]]; then
    echo -e "${GREEN}✓${NC} cPanel API configured"
else
    echo -e "${YELLOW}ℹ${NC} cPanel API not configured"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Environment loaded successfully${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Export summary function
print_env_summary() {
    echo -e "${BLUE}Current Environment Summary:${NC}"
    echo -e "  Environment: ${GREEN}${AGENTIC_FLOW_ENV:-unknown}${NC}"
    echo -e "  Node: ${GREEN}${NODE_ENV:-unknown}${NC}"
    echo -e "  Project: ${GREEN}${PROJECT_NAME:-unknown}${NC}"
    echo ""
    echo -e "${BLUE}Loaded Configurations:${NC}"
    echo -e "  AWS: ${AWS_REGION:-not configured}"
    echo -e "  StarlingX: ${YOLIFE_STX_HOST:-not configured}"
    echo -e "  cPanel: ${YOLIFE_CPANEL_HOST:-not configured}"
    echo -e "  Claude Flow: v${CLAUDE_FLOW_VERSION:-not configured}"
    echo -e "  MCP Server: port ${MCP_SERVER_PORT:-not configured}"
    echo ""
}

# Make function available
export -f print_env_summary
