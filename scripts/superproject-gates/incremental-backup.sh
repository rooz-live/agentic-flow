#!/bin/bash
# Incremental Backup Strategy for Long-Horizon Utilization
# Uses rsync hardlinks + compression for maximum efficiency

set -e

BACKUP_ROOT="${HOME}/backups/agentic-flow"
PROJECT_ROOT="/Users/shahroozbhopti/Documents/code/investing/agentic-flow"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CURRENT_BACKUP="${BACKUP_ROOT}/incremental/${TIMESTAMP}"
LATEST_LINK="${BACKUP_ROOT}/latest"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Incremental Backup - Long-Horizon Optimization          ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"

# Create backup directories
mkdir -p "${BACKUP_ROOT}"/{incremental,full,archives}
mkdir -p "${CURRENT_BACKUP}"

# Calculate space before backup
SPACE_BEFORE=$(du -sh "${PROJECT_ROOT}" | cut -f1)
echo -e "\n${YELLOW}📊 Current project size: ${SPACE_BEFORE}${NC}"

# Perform incremental backup using rsync with hardlinks
echo -e "\n${BLUE}🔄 Creating incremental backup...${NC}"

if [ -d "${LATEST_LINK}" ]; then
    # Incremental: hardlink unchanged files from latest backup
    rsync -avh --progress \
        --link-dest="${LATEST_LINK}" \
        --exclude='node_modules' \
        --exclude='.git/objects' \
        --exclude='*.log' \
        --exclude='dist' \
        --exclude='build' \
        --exclude='.cache' \
        --exclude='coverage' \
        "${PROJECT_ROOT}/" \
        "${CURRENT_BACKUP}/"
    
    BACKUP_TYPE="incremental"
else
    # First backup: full copy
    rsync -avh --progress \
        --exclude='node_modules' \
        --exclude='.git/objects' \
        --exclude='*.log' \
        --exclude='dist' \
        --exclude='build' \
        --exclude='.cache' \
        --exclude='