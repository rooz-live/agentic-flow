#!/bin/bash
# Launch ReactFlow Mind Map Visualization

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/web"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  🚨 MAA Standstill Campaign Mind Map${NC}"
echo -e "${CYAN}  ReactFlow Visualization with PNG Export${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if node_modules exists
if [[ ! -d "node_modules" ]]; then
    echo -e "${YELLOW}⚠${NC} Dependencies not installed. Running npm install..."
    npm install
fi

# Check if dist exists
if [[ ! -d "dist" ]]; then
    echo -e "${YELLOW}⚠${NC} Build not found. Running npm run build..."
    npm run build
fi

echo -e "${GREEN}✓${NC} Starting development server..."
echo ""
echo -e "${CYAN}Features:${NC}"
echo "  • 5-day hierarchical mind map"
echo "  • ROAM urgency indicators (Red/Amber/Blue)"
echo "  • Real-time state visualization from tracking/daily-send-state.json"
echo "  • API endpoint: http://localhost:5173/api/state"
echo "  • PNG export for court evidence"
echo ""
echo -e "${CYAN}Controls:${NC}"
echo "  • Drag to pan"
echo "  • Scroll to zoom"
echo "  • Click '📸 Export PNG' to download"
echo ""
echo -e "${CYAN}Opening browser...${NC}"
echo ""

# Start dev server
npm run dev
