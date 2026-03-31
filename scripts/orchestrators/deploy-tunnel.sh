#!/usr/bin/env bash
# =============================================================================
# Dashboard Tunnel Orchestrator (Phase 4 Discovery Logic)
#
# Purpose: Serves the local WSJF-LIVE interactive dashboards over HTTP
#          and tunnels them to the public internet securely.
#
# Usage: ./deploy-tunnel.sh [tailscale|ngrok]
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR/../validation-core.sh" ]]; then
    source "$SCRIPT_DIR/../validation-core.sh"
else
    # Fallbacks if core library is missing
    EXIT_SUCCESS=0
    EXIT_INVALID_ARGS=10
    EXIT_COMMAND_NOT_FOUND=60
fi

PORT=8080
DASHBOARD_DIR="$HOME/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/00-DASHBOARD"
TUNNEL_MODE="${1:-tailscale}"

echo "🚀 Starting Dashboard Tunnel Broker..."

SERVER_PID=""

cleanup() {
    if [[ -n "$SERVER_PID" ]]; then
        echo "🛑 Stopping Local HTTP Server (PID: $SERVER_PID)..."
        kill "$SERVER_PID" 2>/dev/null || true
    fi
}

trap cleanup EXIT INT TERM

if [ ! -d "$DASHBOARD_DIR" ]; then
    echo "❌ Error: Dashboard directory not found at $DASHBOARD_DIR"
    exit $EXIT_INVALID_ARGS
fi

# 1. Start Python local server if not already running
if ! lsof -i :$PORT > /dev/null; then
    echo "📦 Spawning Local HTTP Server on Port $PORT..."
    python3 -m http.server $PORT --directory "$DASHBOARD_DIR" &
    SERVER_PID=$!
    echo "✅ Server started with PID: $SERVER_PID"
    sleep 2
else
    echo "✅ Local HTTP Server already running on Port $PORT"
fi

# 2. Launch targeted tunnel layer
if [ "$TUNNEL_MODE" == "tailscale" ]; then
    if ! command -v tailscale &> /dev/null; then
        echo "❌ tailscale not found. Install via: brew install tailscale"
        exit $EXIT_COMMAND_NOT_FOUND
    fi
    echo "🔗 Tunneling via Tailscale Funnel (https://interface.rooz.live)..."
    echo "⚠️ Note: Ensure your Tailscale funnel is correctly CNAME'd in DNS."
    tailscale funnel $PORT

elif [ "$TUNNEL_MODE" == "ngrok" ]; then
    if ! command -v ngrok &> /dev/null; then
        echo "❌ ngrok not found. Install via: brew install ngrok/ngrok/ngrok"
        exit $EXIT_COMMAND_NOT_FOUND
    fi
    
    # Check for v3 config with api_key
    NGROK_CONFIG="$HOME/.ngrok2/ngrok.yml"
    if [[ ! -f "$NGROK_CONFIG" ]] || ! grep -q "api_key\|authtoken" "$NGROK_CONFIG" 2>/dev/null; then
        echo "⚠️  ngrok v3 config not found or api_key missing"
        echo "Run: ngrok config add-authtoken <your_token>"
        echo "Continuing with default ngrok configuration..."
    fi
    
    echo "🔗 Tunneling via ngrok (v3 config)..."
    
    # Use v3 config if available, otherwise fallback to simple command
    if [[ -f "$NGROK_CONFIG" ]] && grep -q "domain:" "$NGROK_CONFIG" 2>/dev/null; then
        # Reserved domain configured - use named tunnel
        echo "   Using reserved domain from ngrok.yml config"
        ngrok start dashboard --config="$NGROK_CONFIG"
    elif [[ -f "$NGROK_CONFIG" ]]; then
        # Config exists but no reserved domain
        echo "   Using ngrok v3 config (no reserved domain)"
        ngrok http $PORT --config="$NGROK_CONFIG"
    else
        # Fallback to basic command
        ngrok http $PORT
    fi

else
    echo "❌ Unknown tunnel mode: $TUNNEL_MODE"
    echo "Usage: ./deploy-tunnel.sh [tailscale|ngrok]"
    exit $EXIT_INVALID_ARGS
fi
