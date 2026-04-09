#!/bin/bash
# Dashboard Server Launcher with TLD Support
# Usage: ./quick-start-dashboard.sh [env] [port]

set -euo pipefail

# Source TLD configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$PROJECT_ROOT/_SYSTEM/_AUTOMATION/tld-server-config.sh"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Parse arguments
ENV="${1:-${USE_TLD_BY_DEFAULT:-true}}"
PORT="${2:-8080}"

# If USE_TLD_BY_DEFAULT is true, use staging environment
if [[ "$ENV" == "true" ]]; then
    ENV="staging"
fi

echo -e "${BLUE}🚀 Starting Dashboard Server${NC}"
echo -e "${BLUE}Environment: $ENV${NC}"
echo -e "${BLUE}Port: $PORT${NC}"

# Flatten environment configuration mapping via early default declarative initialization
BIND_ADDRESS="localhost"
PUBLIC_URL="http://localhost:$PORT"

if [[ "$ENV" != "local" ]]; then
    configure_server "$ENV" "$PORT"
    BIND_ADDRESS="$SERVER_BIND_ADDRESS"
    PUBLIC_URL="$DASHBOARD_PUBLIC_URL"
fi

# Check if port is in use
if lsof -tiTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Port $PORT already in use - server likely running${NC}"
    echo -e "${YELLOW}Public URL: $PUBLIC_URL${NC}"
    exit 0
fi

# Export DASHBOARD_PORT and DASHBOARD_ROOT for the bound constraints
export DASHBOARD_PORT="$PORT"
export DASHBOARD_ROOT="$PROJECT_ROOT"

# Source the bound reasoning framework
source "$PROJECT_ROOT/_SYSTEM/_AUTOMATION/run-bounded-eta.sh"

echo -e "${BLUE}🚀 Starting HTTP Server bounded via Process Contracts...${NC}"
if run_bounded_eta "http_server" start_http_server_bounded "$PORT" "$BIND_ADDRESS"; then
    echo -e "${GREEN}✅ Bounded HTTP Server started successfully${NC}"
    echo -e "${GREEN}📍 Local URL: http://localhost:$PORT${NC}"
    echo -e "${GREEN}🌐 Public URL: $PUBLIC_URL${NC}"
    echo "Dashboard accessible at: ${PUBLIC_URL}/00-DASHBOARD/"
    
    # Mirror the PID for cascade-tunnel orchestrator compatibility
    if [[ -f "/tmp/http-server.pid" ]]; then
        cp "/tmp/http-server.pid" "/tmp/dashboard-server.pid"
    fi
else
    echo -e "${RED}❌ Failed to start bounded HTTP server. Process contract violated.${NC}"
    exit 1
fi
