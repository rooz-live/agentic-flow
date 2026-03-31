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

# Configure based on environment
if [[ "$ENV" != "local" ]]; then
    configure_server "$ENV" "$PORT"
    BIND_ADDRESS="$SERVER_BIND_ADDRESS"
    PUBLIC_URL="$DASHBOARD_PUBLIC_URL"
else
    BIND_ADDRESS="localhost"
    PUBLIC_URL="http://localhost:$PORT"
fi

# Check if port is in use
if lsof -i:"$PORT" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Port $PORT already in use - server likely running${NC}"
    echo -e "${YELLOW}Public URL: $PUBLIC_URL${NC}"
    exit 0
fi

# Start HTTP server in background
cd "$PROJECT_ROOT"
python3 -m http.server "$PORT" --bind "$BIND_ADDRESS" > /tmp/http-server.log 2>&1 &
SERVER_PID=$!

echo "Server PID: $SERVER_PID"
sleep 2

# Verify server is running
if curl -s "http://localhost:$PORT" >/dev/null; then
    echo -e "${GREEN}✅ HTTP Server started successfully${NC}"
    echo -e "${GREEN}📍 Local URL: http://localhost:$PORT${NC}"
    echo -e "${GREEN}🌐 Public URL: $PUBLIC_URL${NC}"
    echo "Dashboard accessible at: ${PUBLIC_URL}/00-DASHBOARD/"
    echo "Log file: /tmp/http-server.log"
    
    # Save PID for cleanup
    echo "$SERVER_PID" > /tmp/dashboard-server.pid
else
    echo -e "${RED}❌ Failed to start HTTP server${NC}"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi
