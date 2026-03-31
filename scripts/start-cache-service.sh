#!/usr/bin/env bash
#
# Start Cache Service (Node.js + NAPI-RS)
# ========================================
# Starts the Node.js cache service with Rust NAPI-RS bindings
#
# Usage:
#   ./scripts/start-cache-service.sh
#   ./scripts/start-cache-service.sh --port 3001

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Starting Cache Service (NAPI-RS)${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"

# Step 1: Check if Node.js is installed
echo -e "\n${YELLOW}Step 1: Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not installed${NC}"
    echo "Please install Node.js: https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✓ Node.js installed: $(node --version)${NC}"

# Step 2: Check if npm is installed
echo -e "\n${YELLOW}Step 2: Checking npm installation...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm installed: $(npm --version)${NC}"

# Step 3: Install dependencies
echo -e "\n${YELLOW}Step 3: Installing dependencies...${NC}"
if [[ ! -d "node_modules" ]]; then
    npm install
fi
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 4: Build Rust NAPI bindings
echo -e "\n${YELLOW}Step 4: Building Rust NAPI bindings...${NC}"
cd rust/core
if ! cargo build --release --features napi; then
    echo -e "${RED}✗ Failed to build Rust NAPI bindings${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Rust NAPI bindings built${NC}"
cd "$PROJECT_ROOT"

# Step 5: Start cache service
echo -e "\n${YELLOW}Step 5: Starting cache service...${NC}"
PORT="${1:-3000}"
export PORT="$PORT"

echo -e "${GREEN}✓ Cache service starting on port $PORT${NC}"
node cache_service.js

