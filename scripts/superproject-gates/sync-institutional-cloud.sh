#!/bin/bash

# Sync Institutional Cloud Systems
# Synchronizes knowledge across GitLab, leantime.io, and plane.so

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the root directory
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
cd "$REPO_ROOT"

echo -e "${BLUE}=== Institutional Cloud Sync ===${NC}"
echo -e "${BLUE}Syncing knowledge across GitLab, leantime.io, and plane.so${NC}"

# Navigate to agentic-flow-core
if [ -d "agentic-flow-core" ]; then
    cd agentic-flow-core
fi

# Build if needed
if [ ! -d "dist" ]; then
    echo -e "${YELLOW}Building TypeScript...${NC}"
    npm run build
fi

# Track overall status
OVERALL_STATUS=0
SYNC_RESULTS=()

# Sync GitLab
echo -e "\n${YELLOW}=== Syncing GitLab ===${NC}"
if command -v git &> /dev/null; then
    echo -e "${GREEN}✓ Git repository exists${NC}"
    
    # Push current state
    if git remote -v | grep -q origin; then
        echo -e "${YELLOW}Pushing to GitLab...${NC}"
        if git push origin $(git branch --show-current) 2>&1; then
            echo -e "${GREEN}✓ GitLab sync successful${NC}"
            SYNC_RESULTS+=("gitlab:success")
        else
            echo -e "${RED}✗ GitLab sync failed${NC}"
            SYNC_RESULTS+=("gitlab:failed")
            OVERALL_STATUS=1
        fi
    else
        echo -e "${YELLOW}No GitLab remote configured${NC}"
        SYNC_RESULTS+=("gitlab:skipped")
    fi
else
    echo -e "${RED}✗ Git not available${NC}"
    SYNC_RESULTS+=("gitlab:failed")
    OVERALL_STATUS=1
fi

# Sync leantime.io
echo -e "\n${YELLOW}=== Syncing leantime.io ===${NC}"
# Note: This would require leantime.io API integration
# For now, we'll check if configuration exists
if [ -f "config/knowledge-redundancy.config.json" ]; then
    echo -e "${GREEN}✓ Knowledge redundancy configuration found${NC}"
    
    # Run sync via Node.js
    RESULT=$(node -e "
        const { KnowledgeRedundancySystem } = require('./dist/governance/knowledge-redundancy.js');
        const system = new KnowledgeRedundancySystem();
        
        system.syncLayer('institutional_cloud').then(results => {
            const leantimeResult = results.find(r => r.system === 'leantime');
            if (leantimeResult) {
                console.log(leantimeResult.success ? 'success' : 'failed');
            } else {
                console.log('skipped');
            }
        }).catch(err => {
            console.error('error:', err.message);
            process.exit(1);
        });
    " 2>&1)
    
    if echo "$RESULT" | grep -q "success"; then
        echo -e "${GREEN}✓ leantime.io sync successful${NC}"
        SYNC_RESULTS+=("leantime:success")
    elif echo "$RESULT" | grep -q "skipped"; then
        echo -e "${YELLOW}leantime.io sync skipped (not configured)${NC}"
        SYNC_RESULTS+=("leantime:skipped")
    else
        echo -e "${RED}✗ leantime.io sync failed${NC}"
        SYNC_RESULTS+=("leantime:failed")
        OVERALL_STATUS=1
    fi
else
    echo -e "${YELLOW}leantime.io sync skipped (no config)${NC}"
    SYNC_RESULTS+=("leantime:skipped")
fi

# Sync plane.so
echo -e "\n${YELLOW}=== Syncing plane.so ===${NC}"
# Note: This would require plane.so API integration
# For now, we'll check if configuration exists
if [ -f "config/knowledge-redundancy.config.json" ]; then
    echo -e "${GREEN}✓ Knowledge redundancy configuration found${NC}"
    
    # Run sync via Node.js
    RESULT=$(node -e "
        const { KnowledgeRedundancySystem } = require('./dist/governance/knowledge-redundancy.js');
        const system = new KnowledgeRedundancySystem();
        
        system.syncLayer('institutional_cloud').then(results => {
            const planeResult = results.find(r => r.system === 'plane');
            if (planeResult) {
                console.log(planeResult.success ? 'success' : 'failed');
            } else {
                console.log('skipped');
            }
        }).catch(err => {
            console.error('error:', err.message);
            process.exit(1);
        });
    " 2>&1)
    
    if echo "$RESULT" | grep -q "success"; then
        echo -e "${GREEN}✓ plane.so sync successful${NC}"
        SYNC_RESULTS+=("plane:success")
    elif echo "$RESULT" | grep -q "skipped"; then
        echo -e "${YELLOW}plane.so sync skipped (not configured)${NC}"
        SYNC_RESULTS+=("plane:skipped")
    else
        echo -e "${RED}✗ plane.so sync failed${NC}"
        SYNC_RESULTS+=("plane:failed")
        OVERALL_STATUS=1
    fi
else
    echo -e "${YELLOW}plane.so sync skipped (no config)${NC}"
    SYNC_RESULTS+=("plane:skipped")
fi

# Summary
echo -e "\n${BLUE}=== Institutional Cloud Sync Summary ===${NC}"
SUCCESS_COUNT=0
FAILED_COUNT=0
SKIPPED_COUNT=0

for result in "${SYNC_RESULTS[@]}"; do
    if echo "$result" | grep -q "success"; then
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        echo -e "${GREEN}✓ $result${NC}"
    elif echo "$result" | grep -q "failed"; then
        FAILED_COUNT=$((FAILED_COUNT + 1))
        echo -e "${RED}✗ $result${NC}"
    else
        SKIPPED_COUNT=$((SKIPPED_COUNT + 1))
        echo -e "${YELLOW}○ $result${NC}"
    fi
done

echo -e "\n${BLUE}Total: $SUCCESS_COUNT successful, $FAILED_COUNT failed, $SKIPPED_COUNT skipped${NC}"

if [ $OVERALL_STATUS -eq 0 ]; then
    echo -e "${GREEN}✓ Institutional cloud sync completed successfully${NC}"
    exit 0
else
    echo -e "${RED}✗ Institutional cloud sync completed with errors${NC}"
    exit 1
fi
