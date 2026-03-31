#!/usr/bin/env bash
# mcp-start.sh - Start MCP server with proper port configuration
set -euo pipefail

MCP_PORT="${MCP_PORT:-3001}"  # Avoid conflict with Grafana on 3000

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${CYAN}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[✓]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[⚠]${NC} $*"; }
log_error() { echo -e "${RED}[✗]${NC} $*"; }

# Check if already running
if ps aux | grep -E "agentdb.*mcp.*start" | grep -v grep >/dev/null 2>&1; then
    # Check if suspended
    if ps aux | grep -E "agentdb.*mcp.*start" | grep -v grep | grep -q " T "; then
        log_warn "MCP server is suspended - resuming..."
        # Get PID
        MCP_PID=$(ps aux | grep -E "agentdb.*mcp.*start" | grep -v grep | awk '{print $2}' | head -1)
        if [ -n "$MCP_PID" ]; then
            kill -CONT "$MCP_PID" 2>/dev/null || true
            sleep 2
            log_success "MCP server resumed (PID: $MCP_PID)"
            exit 0
        fi
    else
        log_warn "MCP server already running"
        exit 0
    fi
fi

# Check port availability
if lsof -i :"$MCP_PORT" 2>/dev/null | grep -v "agentdb" >/dev/null; then
    CONFLICTING_PROCESS=$(lsof -i :"$MCP_PORT" 2>/dev/null | tail -1 | awk '{print $1}')
    log_error "Port $MCP_PORT is in use by: $CONFLICTING_PROCESS"
    log_info "Use: MCP_PORT=3002 $0 to use different port"
    exit 1
fi

# Start MCP server
log_info "Starting MCP server on port $MCP_PORT..."

# Start in background with proper logging
export MCP_PORT
nohup npx agentdb mcp start --port "$MCP_PORT" --verbose \
    > /tmp/mcp-server.log 2>&1 &

MCP_PID=$!
log_info "MCP server started (PID: $MCP_PID)"

# Wait for server to be ready
for i in {1..10}; do
    sleep 1
    if curl -sf http://localhost:$MCP_PORT/health >/dev/null 2>&1; then
        log_success "MCP server ready on port $MCP_PORT"
        echo "$MCP_PID" > /tmp/mcp-server.pid
        exit 0
    fi
done

log_error "MCP server failed to start - check logs: /tmp/mcp-server.log"
tail -20 /tmp/mcp-server.log
exit 1
