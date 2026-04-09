#!/bin/bash

# Sync Personal Documentation
# Backs up knowledge to personal documentation location

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

echo -e "${BLUE}=== Personal Documentation Sync ===${NC}"
echo -e "${BLUE}Backing up knowledge to personal documentation${NC}"

# Navigate to agentic-flow-core
if [ -d "agentic-flow-core" ]; then
    cd agentic-flow-core
fi

# Build if needed
if [ ! -d "dist" ]; then
    echo -e "${YELLOW}Building TypeScript...${NC}"
    npm run build
fi

# Read backup location from config
BACKUP_LOCATION="~/Documents/knowledge-backup"
if [ -f "config/knowledge-redundancy.config.json" ]; then
    BACKUP_LOCATION=$(node -e "console.log(require('./config/knowledge-redundancy.config.json').layers.find(l => l.name === 'personal_documentation').location)" 2>/dev/null || echo "$BACKUP_LOCATION")
fi

# Expand ~ to home directory
BACKUP_LOCATION="${BACKUP_LOCATION/#\~/$HOME}"

echo -e "${YELLOW}Backup location: $BACKUP_LOCATION${NC}"

# Create backup directory if it doesn't exist
if [ ! -d "$BACKUP_LOCATION" ]; then
    echo -e "${YELLOW}Creating backup directory...${NC}"
    mkdir -p "$BACKUP_LOCATION"
fi

# Track overall status
OVERALL_STATUS=0
SYNC_RESULTS=()

# Sync documentation files
echo -e "\n${YELLOW}=== Syncing Documentation Files ===${NC}"

# Find all markdown and text files
DOC_FILES=$(find . -type f \( -name "*.md" -o -name "*.txt" -o -name "*.rst" \) ! -path "./node_modules/*" ! -path "./dist/*" ! -path "./coverage/*" ! -path "./.git/*")

if [ -z "$DOC_FILES" ]; then
    echo -e "${YELLOW}No documentation files found${NC}"
    SYNC_RESULTS+=("docs:skipped")
else
    DOC_COUNT=$(echo "$DOC_FILES" | wc -l)
    echo -e "${BLUE}Found $DOC_COUNT documentation files${NC}"
    
    # Copy files to backup location
    for file in $DOC_FILES; do
        REL_PATH="${file#./}"
        DEST="$BACKUP_LOCATION/$REL_PATH"
        
        # Create destination directory if needed
        mkdir -p "$(dirname "$DEST")"
        
        # Copy file
        if cp "$file" "$DEST" 2>/dev/null; then
            echo -e "${GREEN}✓ $REL_PATH${NC}"
        else
            echo -e "${RED}✗ $REL_PATH${NC}"
            SYNC_RESULTS+=("docs:failed")
            OVERALL_STATUS=1
        fi
    done
    
    if [ $OVERALL_STATUS -eq 0 ]; then
        SYNC_RESULTS+=("docs:success")
    fi
fi

# Sync configuration files
echo -e "\n${YELLOW}=== Syncing Configuration Files ===${NC}"

CONFIG_FILES=$(find . -type f -name "*.json" -o -name "*.yaml" -o -name "*.yml" -o -name "*.toml" | grep -v node_modules | grep -v dist | grep -v coverage | grep -v .git)

if [ -z "$CONFIG_FILES" ]; then
    echo -e "${YELLOW}No configuration files found${NC}"
    SYNC_RESULTS+=("config:skipped")
else
    CONFIG_COUNT=$(echo "$CONFIG_FILES" | wc -l)
    echo -e "${BLUE}Found $CONFIG_COUNT configuration files${NC}"
    
    # Copy files to backup location
    for file in $CONFIG_FILES; do
        REL_PATH="${file#./}"
        DEST="$BACKUP_LOCATION/$REL_PATH"
        
        # Create destination directory if needed
        mkdir -p "$(dirname "$DEST")"
        
        # Copy file
        if cp "$file" "$DEST" 2>/dev/null; then
            echo -e "${GREEN}✓ $REL_PATH${NC}"
        else
            echo -e "${RED}✗ $REL_PATH${NC}"
            SYNC_RESULTS+=("config:failed")
            OVERALL_STATUS=1
        fi
    done
    
    if [ $OVERALL_STATUS -eq 0 ]; then
        SYNC_RESULTS+=("config:success")
    fi
fi

# Create sync manifest
echo -e "\n${YELLOW}=== Creating Sync Manifest ===${NC}"

MANIFEST_FILE="$BACKUP_LOCATION/sync-manifest.json"
cat > "$MANIFEST_FILE" << EOF
{
  "syncTimestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "sourceLocation": "$REPO_ROOT",
  "backupLocation": "$BACKUP_LOCATION",
  "filesBackedUp": $(find "$BACKUP_LOCATION" -type f | wc -l),
  "totalSizeBytes": $(du -sb "$BACKUP_LOCATION" | cut -f1)
}
EOF

echo -e "${GREEN}✓ Sync manifest created${NC}"
SYNC_RESULTS+=("manifest:success")

# Run knowledge redundancy system sync
echo -e "\n${YELLOW}=== Running Knowledge Redundancy Sync ===${NC}"

if [ -f "dist/governance/knowledge-redundancy.js" ]; then
    RESULT=$(node -e "
        const { KnowledgeRedundancySystem } = require('./dist/governance/knowledge-redundancy.js');
        const system = new KnowledgeRedundancySystem();
        
        system.syncLayer('personal_documentation').then(results => {
            if (results.length > 0) {
                const result = results[0];
                console.log(result.success ? 'success' : 'failed');
                console.log(result.itemsSynced);
                console.log(result.itemsFailed);
            } else {
                console.log('skipped');
            }
        }).catch(err => {
            console.error('error:', err.message);
            process.exit(1);
        });
    " 2>&1)
    
    if echo "$RESULT" | grep -q "success"; then
        ITEMS_SYNCED=$(echo "$RESULT" | sed -n '2p')
        echo -e "${GREEN}✓ Knowledge redundancy sync successful ($ITEMS_SYNCED items)${NC}"
        SYNC_RESULTS+=("redundancy:success")
    elif echo "$RESULT" | grep -q "skipped"; then
        echo -e "${YELLOW}Knowledge redundancy sync skipped${NC}"
        SYNC_RESULTS+=("redundancy:skipped")
    else
        echo -e "${RED}✗ Knowledge redundancy sync failed${NC}"
        SYNC_RESULTS+=("redundancy:failed")
        OVERALL_STATUS=1
    fi
else
    echo -e "${YELLOW}Knowledge redundancy sync skipped (dist not built)${NC}"
    SYNC_RESULTS+=("redundancy:skipped")
fi

# Summary
echo -e "\n${BLUE}=== Personal Documentation Sync Summary ===${NC}"
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
    echo -e "${GREEN}✓ Personal documentation sync completed successfully${NC}"
    exit 0
else
    echo -e "${RED}✗ Personal documentation sync completed with errors${NC}"
    exit 1
fi
