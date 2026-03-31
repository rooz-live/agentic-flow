#!/bin/bash
# start-eta-dashboard.sh - Launch dashboard with ETA tracking and tunnel
# Starts: 1) ETA API server, 2) Cascade tunnel with bounded reasoning, 3) Opens dashboard

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
API_PORT=8081
TUNNEL_PORT=8080
DASHBOARD_FILE="WSJF-LIVE-V6-ETA-TRACKED.html"

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  ETA DASHBOARD LAUNCHER WITH BOUNDED REASONING${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Check dependencies
check_deps() {
    local missing=()
    
    command -v python3 >/dev/null 2>&1 || missing+=("python3")
    command -v jq >/dev/null 2>&1 || missing+=("jq")
    
    if [[ ${#missing[@]} -gt 0 ]]; then
        echo -e "${YELLOW}Missing dependencies: ${missing[*]}${NC}"
        echo "Please install missing dependencies and try again."
        exit 1
    fi
}

# Start ETA API server
start_api_server() {
    echo -e "${GREEN}1. Starting ETA API Server on port $API_PORT...${NC}"
    
    if lsof -ti:$API_PORT >/dev/null 2>&1; then
        echo "Port $API_PORT is in use, stopping existing process..."
        lsof -ti:$API_PORT | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
    
    python3 "$SCRIPT_DIR/api/eta-server.py" $API_PORT > /tmp/eta-server.log 2>&1 &
    API_PID=$!
    echo $API_PID > /tmp/eta-server.pid
    
    # Wait for server to start
    sleep 2
    
    if curl -s "http://localhost:$API_PORT/api/eta-state" >/dev/null 2>&1; then
        echo -e "${GREEN}✓ API server started (PID: $API_PID)${NC}"
    else
        echo -e "${YELLOW}⚠ API server may not be responding${NC}"
    fi
}

# Start cascade tunnel with ETA tracking
start_tunnel() {
    echo -e "${GREEN}2. Starting Cascade Tunnel with ETA tracking...${NC}"
    
    # Check if already running
    if [[ -f "/tmp/cascade-tunnel.pid" ]] && kill -0 $(cat "/tmp/cascade-tunnel.pid") 2>/dev/null; then
        echo "Tunnel already running, stopping first..."
        "$SCRIPT_DIR/orchestrators/cascade-tunnel.sh" stop
        sleep 2
    fi
    
    # Start tunnel in background
    "$SCRIPT_DIR/orchestrators/cascade-tunnel.sh" start $TUNNEL_PORT > /tmp/cascade-tunnel.log 2>&1 &
    TUNNEL_PID=$!
    
    # Wait a moment for startup
    sleep 3
    
    # Check if tunnel started
    if [[ -f "/tmp/active-tunnel-url.txt" ]]; then
        TUNNEL_URL=$(cat "/tmp/active-tunnel-url.txt")
        echo -e "${GREEN}✓ Tunnel established: $TUNNEL_URL${NC}"
    else
        echo -e "${YELLOW}⚠ Tunnel may still be starting...${NC}"
    fi
}

# Open dashboard
open_dashboard() {
    echo -e "${GREEN}3. Opening Dashboard...${NC}"
    
    # Determine dashboard URL
    if [[ -n "${TUNNEL_URL:-}" ]]; then
        DASHBOARD_URL="${TUNNEL_URL}/${DASHBOARD_FILE}"
    else
        DASHBOARD_URL="http://localhost:$API_PORT/${DASHBOARD_FILE}"
    fi
    
    echo -e "${BLUE}Dashboard URL: $DASHBOARD_URL${NC}"
    
    # Try to open in browser
    if command -v open >/dev/null 2>&1; then
        open "$DASHBOARD_URL"
    elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$DASHBOARD_URL"
    else
        echo "Please open manually: $DASHBOARD_URL"
    fi
}

# Show status
show_status() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  SYSTEM STATUS${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    
    # API Server
    if [[ -f "/tmp/eta-server.pid" ]] && kill -0 $(cat "/tmp/eta-server.pid") 2>/dev/null; then
        echo -e "API Server: ${GREEN}Running${NC} (http://localhost:$API_PORT)"
    else
        echo -e "API Server: ${YELLOW}Stopped${NC}"
    fi
    
    # Tunnel
    if [[ -f "/tmp/cascade-tunnel.pid" ]] && kill -0 $(cat "/tmp/cascade-tunnel.pid") 2>/dev/null; then
        if [[ -f "/tmp/active-tunnel-url.txt" ]]; then
            echo -e "Tunnel: ${GREEN}Running${NC} ($(cat "/tmp/active-tunnel-provider.txt" 2>/dev/null || echo "unknown"))"
            echo -e "URL: $(cat "/tmp/active-tunnel-url.txt" 2>/dev/null || echo "unknown")"
        else
            echo -e "Tunnel: ${YELLOW}Starting...${NC}"
        fi
    else
        echo -e "Tunnel: ${YELLOW}Stopped${NC}"
    fi
    
    # Bounded Reasoning Status
    if command -v "$SCRIPT_DIR/../_SYSTEM/_AUTOMATION/bounded-reasoning-framework.sh" >/dev/null 2>&1; then
        echo ""
        "$SCRIPT_DIR/../_SYSTEM/_AUTOMATION/bounded-reasoning-framework.sh" status 2>/dev/null || true
    fi
    
    echo ""
    echo -e "${BLUE}Logs:${NC}"
    echo "  API Server: /tmp/eta-server.log"
    echo "  Cascade Tunnel: /tmp/cascade-tunnel.log"
    echo "  TDD History: /tmp/tdd-history.jsonl"
    echo ""
    echo -e "${BLUE}Commands:${NC}"
    echo "  Stop all: ./scripts/start-eta-dashboard.sh stop"
    echo "  Restart tunnel: ./scripts/orchestrators/cascade-tunnel.sh restart"
    echo "  View status: ./scripts/orchestrators/cascade-tunnel.sh status"
}

# Stop all services
stop_all() {
    echo -e "${YELLOW}Stopping all services...${NC}"
    
    # Stop API server
    if [[ -f "/tmp/eta-server.pid" ]]; then
        kill $(cat "/tmp/eta-server.pid") 2>/dev/null || true
        rm -f "/tmp/eta-server.pid"
        echo "✓ API server stopped"
    fi
    
    # Stop tunnel
    "$SCRIPT_DIR/orchestrators/cascade-tunnel.sh" stop
    
    echo -e "${GREEN}All services stopped${NC}"
}

# Main execution
case "${1:-start}" in
    "start")
        check_deps
        start_api_server
        start_tunnel
        sleep 2
        open_dashboard
        show_status
        ;;
    "stop")
        stop_all
        ;;
    "status")
        show_status
        ;;
    "restart")
        stop_all
        sleep 2
        check_deps
        start_api_server
        start_tunnel
        open_dashboard
        show_status
        ;;
    *)
        echo "Usage: $0 {start|stop|status|restart}"
        exit 1
        ;;
esac
