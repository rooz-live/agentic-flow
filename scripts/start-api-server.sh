#!/bin/bash
# Start yo.life API Server
# Provides REST endpoints for circle equity, episodes, and ROAM data

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting yo.life API Server${NC}"

# Check if compiled
if [ ! -f "$PROJECT_ROOT/dist/api/server.js" ]; then
  echo -e "${YELLOW}⚠️  Server not compiled. Running build...${NC}"
  cd "$PROJECT_ROOT"
  npm run build
fi

# Set environment variables
export NODE_ENV="${NODE_ENV:-development}"
export PORT="${PORT:-3001}"
export JWT_SECRET="${JWT_SECRET:-yo-life-dev-secret-change-in-prod}"

# Check if port is already in use
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; then
  echo -e "${RED}❌ Port $PORT is already in use${NC}"
  echo "Kill the process with: kill \$(lsof -t -i:$PORT)"
  exit 1
fi

echo -e "${GREEN}✅ Port $PORT is available${NC}"
echo -e "${BLUE}📝 Environment:${NC}"
echo "  - NODE_ENV: $NODE_ENV"
echo "  - PORT: $PORT"
echo "  - JWT_SECRET: ${JWT_SECRET:0:10}..."

# Start server
echo -e "${GREEN}🔄 Starting server...${NC}"
cd "$PROJECT_ROOT"
node dist/api/server.js
