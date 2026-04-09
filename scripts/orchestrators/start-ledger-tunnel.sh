#!/bin/bash
# start-ledger-tunnel.sh - Start individual ledger tunnel with bounded reasoning
# Usage: ./start-ledger-tunnel.sh <ledger-id> <domain> <port>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$PROJECT_ROOT/_SYSTEM/_AUTOMATION/bounded-reasoning-framework.sh" 2>/dev/null || true
# eta-live-stream.sh removed in Cycle BJ consolidation (R-2026-016)

if [[ $# -lt 3 ]]; then
    echo "Usage: $0 <ledger-id> <domain> <port>"
    exit 10
fi

# Arguments
LEDGER_ID="$1"
DOMAIN="$2"
PORT="$3"

# Validate ledger ID
case "$LEDGER_ID" in
    "law"|"pur"|"hab"|"file")
        ;;
    *)
        echo "Invalid ledger ID: $LEDGER_ID"
        echo "Valid IDs: law, pur, hab, file"
        exit 1
        ;;
esac

# Ledger configurations
declare -A LEDGER_CONFIGS=(
    ["law"]="law-root|law.rooz.live|Legal aggregate root"
    ["pur"]="pur-gateway|pur.tag.vote|WSJF validation gate"
    ["hab"]="hab-evidence|hab.yo.life|Habitability evidence"
    ["file"]="file-process|file.rooz.live|Filing execution layer"
)

# Get config for this ledger
config="${LEDGER_CONFIGS[$LEDGER_ID]}"
ngrok_name=$(echo "$config" | cut -d'|' -f1)
reserved_domain=$(echo "$config" | cut -d'|' -f2)
purpose=$(echo "$config" | cut -d'|' -f3)

echo "Starting $LEDGER_ID tunnel: $purpose"
echo "Domain: $DOMAIN"
echo "Port: $PORT"
echo "ngrok config: $ngrok_name"

# Start appropriate tunnel based on available tools
if command -v ngrok >/dev/null 2>&1; then
    # Use ngrok with named tunnel
    echo "Starting ngrok tunnel: $ngrok_name"
    
    # Check if ngrok config has this tunnel
    if [[ -f "$HOME/.config/ngrok/ngrok.yml" ]]; then
        NGROK_CONFIG="$HOME/.config/ngrok/ngrok.yml"
    else
        NGROK_CONFIG="$HOME/.ngrok2/ngrok.yml"
    fi

    if grep -q "$ngrok_name:" "$NGROK_CONFIG" 2>/dev/null; then
        ngrok start "$ngrok_name" --config="$NGROK_CONFIG" > "/tmp/ngrok-${LEDGER_ID}.log" 2>&1 &
        NGROK_PID=$!
        echo "Started ngrok with PID: $NGROK_PID"
        
        # Wait and extract URL
        sleep 5
        URL=$(grep -oE 'https://[a-zA-Z0-9.-]+\.ngrok\.io|https://[a-zA-Z0-9.-]+\.ngrok-free\.app|https://[a-zA-Z0-9.-]+\.ngrok\.app' "/tmp/ngrok-${LEDGER_ID}.log" 2>/dev/null || echo "")
        
        if [[ -n "$URL" ]]; then
            echo "✅ $LEDGER_ID tunnel active: $URL"
            echo "$URL" > "/tmp/tunnel-${LEDGER_ID}.url"
            echo "$NGROK_PID" > "/tmp/tunnel-${LEDGER_ID}.pid"
        else
            echo "❌ Failed to get ngrok URL"
            kill $NGROK_PID 2>/dev/null || true
            exit 1
        fi
    else
        echo "ngrok tunnel $ngrok_name not found in config"
        echo "Falling back to temporary tunnel..."
        
        ngrok http "$PORT" --log="/tmp/ngrok-${LEDGER_ID}.log" &
        NGROK_PID=$!
        
        sleep 5
        URL=$(grep -oE 'https://[a-zA-Z0-9.-]+\.ngrok\.io|https://[a-zA-Z0-9.-]+\.ngrok-free\.app|https://[a-zA-Z0-9.-]+\.ngrok\.app' "/tmp/ngrok-${LEDGER_ID}.log" 2>/dev/null || echo "")
        
        if [[ -n "$URL" ]]; then
            echo "✅ $LEDGER_ID tunnel active (temporary): $URL"
            echo "$URL" > "/tmp/tunnel-${LEDGER_ID}.url"
            echo "$NGROK_PID" > "/tmp/tunnel-${LEDGER_ID}.pid"
        else
            echo "❌ Failed to start ngrok tunnel"
            exit 1
        fi
    fi
    
elif command -v cloudflared >/dev/null 2>&1; then
    # Use Cloudflare tunnel
    echo "Starting Cloudflare tunnel for $LEDGER_ID"
    
    cloudflared tunnel --url "http://localhost:$PORT" --log "/tmp/cloudflare-${LEDGER_ID}.log" &
    CF_PID=$!
    
    sleep 5
    URL=$(grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "/tmp/cloudflare-${LEDGER_ID}.log" 2>/dev/null || echo "")
    
    if [[ -n "$URL" ]]; then
        echo "✅ $LEDGER_ID tunnel active: $URL"
        echo "$URL" > "/tmp/tunnel-${LEDGER_ID}.url"
        echo "$CF_PID" > "/tmp/tunnel-${LEDGER_ID}.pid"
    else
        echo "❌ Failed to start Cloudflare tunnel"
        kill $CF_PID 2>/dev/null || true
        exit 1
    fi
    
else
    echo "❌ No tunnel provider available (ngrok or cloudflared required)"
    exit 1
fi

# Keep running with bounded monitoring
MAX_RUNTIME=3600  # 1 hour max
start_time=$(date +%s)

echo "Tunnel is active. Will auto-stop after $((MAX_RUNTIME/60)) minutes."
echo "Press Ctrl+C to stop early."

trap 'echo "Stopping $LEDGER_ID tunnel..."; kill $(cat "/tmp/tunnel-${LEDGER_ID}.pid" 2>/dev/null) 2>/dev/null || true; rm -f "/tmp/tunnel-${LEDGER_ID}.pid" "/tmp/tunnel-${LEDGER_ID}.url"; exit 0' INT TERM

while true; do
    current_time=$(date +%s)
    elapsed=$((current_time - start_time))
    
    # Check runtime limit
    if [[ $elapsed -ge $MAX_RUNTIME ]]; then
        echo "⏰ Runtime limit reached ($((MAX_RUNTIME/60)) minutes)"
        break
    fi
    
    # Health check
    if curl -s "http://localhost:$PORT" >/dev/null 2>&1; then
        remaining=$((MAX_RUNTIME - elapsed))
        echo "\r[$(date +%H:%M:%S)] Tunnel active, ${remaining}s remaining..."
    else
        echo "\n⚠️ HTTP server on port $PORT not responding"
    fi
    
    sleep 10
done

echo "\n🛑 Auto-stopping $LEDGER_ID tunnel after runtime limit"
if [[ -f "/tmp/tunnel-${LEDGER_ID}.pid" ]]; then
    kill "$(cat "/tmp/tunnel-${LEDGER_ID}.pid" 2>/dev/null || echo "")" 2>/dev/null || true
fi
rm -f "/tmp/tunnel-${LEDGER_ID}.pid" "/tmp/tunnel-${LEDGER_ID}.url"
