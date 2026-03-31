#!/bin/bash
# Episode Migration Wrapper
# Compiles and runs TypeScript migration script

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}📦 Episode Migration Tool${NC}\n"

# Check if compiled
if [ ! -f "$PROJECT_ROOT/dist/scripts/migrate-episodes.js" ]; then
  echo -e "${YELLOW}⚠️  Migration script not compiled. Running build...${NC}"
  cd "$PROJECT_ROOT"
  npm run build
  echo ""
fi

# Run migration
echo -e "${GREEN}🚀 Starting migration...${NC}\n"
cd "$PROJECT_ROOT"
node dist/scripts/migrate-episodes.js

echo -e "\n${GREEN}✅ Migration complete!${NC}"
