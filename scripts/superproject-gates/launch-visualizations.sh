#!/usr/bin/env bash
#
# Launch all visualization components for agentic-flow-core
# - WebSocket server (port 8081)
# - Three.js Hive Mind (browser)
# - Deck.gl Geospatial Dashboard (browser)
# - MYM Scoring Report (terminal)
#

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║   Agentic Flow - Visualization Suite Launcher                     ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check dependencies
echo "🔍 Checking dependencies..."

if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Please install Node.js (npm install -g npx)"
    exit 1
fi

if ! command -v open &> /dev/null; then
    # Fallback for Linux
    if command -v xdg-open &> /dev/null; then
        alias open='xdg-open'
    else
        echo "⚠️  'open' command not found. Will print URLs instead."
    fi
fi

echo "✅ Dependencies OK"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down visualization suite..."
    if [ ! -z "${WS_PID:-}" ]; then
        kill $WS_PID 2>/dev/null || true
        echo "✅ WebSocket server stopped"
    fi
    if [ ! -z "${HTTP_PID:-}" ]; then
        kill $HTTP_PID 2>/dev/null || true
        echo "✅ HTTP server stopped"
    fi
    echo "👋 Goodbye!"
}

trap cleanup EXIT INT TERM

# 1. Start WebSocket server
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}1. Starting WebSocket Server${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npx tsx src/visual-interface/ws-server.ts &
WS_PID=$!
echo "✅ WebSocket server started (PID: $WS_PID)"
echo "📡 Listening on ws://localhost:8081"
echo ""
sleep 2

# 2. Start HTTP server for visualizations
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}2. Starting HTTP Server${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if http-server is available
if ! command -v http-server &> /dev/null; then
    echo "📦 Installing http-server..."
    npm install -g http-server
fi

npx http-server src/visual-interface -p 8080 --silent &
HTTP_PID=$!
echo "✅ HTTP server started (PID: $HTTP_PID)"
echo "🌐 Serving on http://localhost:8080"
echo ""
sleep 2

# 3. Run MYM Scoring
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}3. Running MYM Alignment Scoring${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npx tsx src/governance/mym-scoring.ts
echo ""

# 4. Open visualizations in browser
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}4. Launching Visualizations${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

HIVE_URL="http://localhost:8080/hive-mind-viz.html"
DECK_URL="http://localhost:8080/metrics-deckgl.html"

if command -v open &> /dev/null; then
    echo "🚀 Opening Three.js Hive Mind..."
    open "$HIVE_URL"
    sleep 1
    
    echo "🚀 Opening Deck.gl Dashboard..."
    open "$DECK_URL"
else
    echo "📋 Open these URLs in your browser:"
    echo "   Three.js Hive Mind: $HIVE_URL"
    echo "   Deck.gl Dashboard:  $DECK_URL"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ All Systems Operational${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Active Services:"
echo "   • WebSocket Server:  ws://localhost:8081 (PID: $WS_PID)"
echo "   • HTTP Server:       http://localhost:8080 (PID: $HTTP_PID)"
echo "   • Three.js Hive:     $HIVE_URL"
echo "   • Deck.gl Dashboard: $DECK_URL"
echo ""
echo -e "${YELLOW}Press Ctrl+C to shutdown all services${NC}"
echo ""

# Keep script running
wait
