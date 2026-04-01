#!/bin/bash
# TLD Tunnel Launcher - Start dashboard with TLD configuration
# Usage: ./start-tld-tunnel.sh [env] [port]

set -euo pipefail

# Source configurations
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$PROJECT_ROOT/_SYSTEM/_AUTOMATION/tld-server-config.sh"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Parse arguments
ENV="${1:-staging}"
PORT="${2:-8080}"

echo -e "${CYAN}🌐 TLD Tunnel Launcher${NC}"
echo -e "${BLUE}Environment: $ENV${NC}"
echo -e "${BLUE}Port: $PORT${NC}"
echo ""

# Configure TLD settings
configure_server "$ENV" "$PORT"

# Get domain via posix safe function
DOMAIN=$(get_domain_for_env "$ENV")

echo -e "${YELLOW}Configuration:${NC}"
echo "  Domain: $DOMAIN"
echo "  Public URL: $DASHBOARD_PUBLIC_URL"
echo "  Bind Address: $SERVER_BIND_ADDRESS"
echo ""

# Start the HTTP server with TLD config
echo -e "${BLUE}🚀 Starting HTTP Server...${NC}"
"$SCRIPT_DIR/quick-start-dashboard.sh" "$ENV" "$PORT"

# Give server a moment to start
sleep 3

# Start tunnel cascade
echo -e "${BLUE}🌍 Starting Tunnel Cascade...${NC}"
"$SCRIPT_DIR/orchestrators/cascade-tunnel.sh" start "$PORT"

# Show status
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ TLD Tunnel System Active${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Local Access: http://localhost:$PORT"
echo "Public URL: $DASHBOARD_PUBLIC_URL"
echo ""

# Show tunnel status
if [[ -f "/tmp/active-tunnel-url.txt" ]]; then
    ACTIVE_URL=$(cat /tmp/active-tunnel-url.txt)
    ACTIVE_PROVIDER=$(cat /tmp/active-tunnel-provider.txt)
    echo -e "${GREEN}Active Tunnel: $ACTIVE_PROVIDER${NC}"
    echo -e "${GREEN}Tunnel URL: $ACTIVE_URL${NC}"
else
    echo -e "${YELLOW}No active tunnel (using direct server access)${NC}"
fi

echo ""
echo "Dashboard paths:"
echo "  Main: ${DASHBOARD_PUBLIC_URL}/00-DASHBOARD/"
echo "  WSJF: ${DASHBOARD_PUBLIC_URL}/00-DASHBOARD/WSJF-LIVE-V5-MODULAR.html"
echo ""
echo -e "${BLUE}To stop: ./scripts/orchestrators/cascade-tunnel.sh stop${NC}"
