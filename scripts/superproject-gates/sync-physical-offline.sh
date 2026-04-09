#!/bin/bash

# Sync Physical Offline Backup
# Creates offline backup of knowledge to physical storage

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

echo -e "${BLUE}=== Physical Offline Backup ===${NC}"
echo -e "${BLUE}Creating offline backup of knowledge${NC}"

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
BACKUP_LOCATION="/backup/drive/knowledge"
if [ -f "config/knowledge-redundancy.config.json" ]; then
    BACKUP_LOCATION=$(node -e "console.log(require('./config/knowledge-redundancy.config.json').layers.find(l => l.name === 'physical_offline').location)" 2>/dev/null || echo "$BACKUP_LOCATION")
fi

echo -e "${YELLOW}Backup location: $BACKUP_LOCATION${NC}"

# Check if backup location is accessible
if [ ! -d "$BACKUP_LOCATION" ]; then
    echo -e "${YELLOW}Backup location does not exist, creating...${NC}"
    
    # Try to create directory
    if mkdir -p "$BACKUP_LOCATION" 2>/dev/null; then
        echo -e "${GREEN}✓ Backup directory created${NC}"
    else
        echo -e "${RED}✗ Cannot create backup directory${NC}"
        echo -e "${YELLOW}Please ensure the backup location is accessible${NC}"
        exit 1
    fi
fi

# Check if backup location is writable
if [ ! -w "$BACKUP_LOCATION" ]; then
    echo -e "${RED}✗ Backup location is not writable${NC}"
    echo -e "${YELLOW}Please check permissions for: $BACKUP_LOCATION${NC}"
    exit 1
fi

# Track overall status
OVERALL_STATUS=0
SYNC_RESULTS=()

# Create backup archive
echo -e "\n${YELLOW}=== Creating Backup Archive ===${NC}"

TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
ARCHIVE_NAME="knowledge-backup-$TIMESTAMP.tar.gz"
ARCHIVE_PATH="$BACKUP_LOCATION/$ARCHIVE_NAME"

echo -e "${BLUE}Creating archive: $ARCHIVE_NAME${NC}"

# Create temporary directory for staging
STAGING_DIR=$(mktemp -d)
trap "rm -rf $STAGING_DIR" EXIT

# Copy files to staging directory
echo -e "${YELLOW}Staging files for backup...${NC}"

# Copy source files
if [ -d "src" ]; then
    echo -e "${BLUE}Copying source files...${NC}"
    cp -r src "$STAGING_DIR/src" 2>/dev/null && SYNC_RESULTS+=("src:success") || { SYNC_RESULTS+=("src:failed"); OVERALL_STATUS=1; }
fi

# Copy documentation files
if [ -d "docs" ]; then
    echo -e "${BLUE}Copying documentation files...${NC}"
    cp -r docs "$STAGING_DIR/docs" 2>/dev/null && SYNC_RESULTS+=("docs:success") || { SYNC_RESULTS+=("docs:failed"); OVERALL_STATUS=1; }
fi

# Copy configuration files
echo -e "${BLUE}Copying configuration files...${NC}"
if [ -d "config" ]; then
    cp -r config "$STAGING_DIR/config" 2>/dev/null && SYNC_RESULTS+=("config:success") || { SYNC_RESULTS+=("config:failed"); OVERALL_STATUS=1; }
fi

# Copy scripts
if [ -d "scripts" ]; then
    echo -e "${BLUE}Copying scripts...${NC}"
    cp -r scripts "$STAGING_DIR/scripts" 2>/dev/null && SYNC_RESULTS+=("scripts:success") || { SYNC_RESULTS+=("scripts:failed"); OVERALL_STATUS=1; }
fi

# Create archive
echo -e "${YELLOW}Creating compressed archive...${NC}"
if tar -czf "$ARCHIVE_PATH" -C "$STAGING_DIR" . 2>/dev/null; then
    ARCHIVE_SIZE=$(du -h "$ARCHIVE_PATH" | cut -f1)
    echo -e "${GREEN}✓ Archive created: $ARCHIVE_NAME ($ARCHIVE_SIZE)${NC}"
    SYNC_RESULTS+=("archive:success")
else
    echo -e "${RED}✗ Archive creation failed${NC}"
    SYNC_RESULTS+=("archive:failed")
    OVERALL_STATUS=1
fi

# Create checksum for integrity verification
echo -e "\n${YELLOW}=== Creating Checksum ===${NC}"

CHECKSUM_FILE="$BACKUP_LOCATION/$ARCHIVE_NAME.sha256"
if sha256sum "$ARCHIVE_PATH" > "$CHECKSUM_FILE" 2>/dev/null; then
    echo -e "${GREEN}✓ Checksum created${NC}"
    SYNC_RESULTS+=("checksum:success")
else
    echo -e "${YELLOW}Checksum creation failed (sha256sum not available)${NC}"
    SYNC_RESULTS+=("checksum:skipped")
fi

# Create backup manifest
echo -e "\n${YELLOW}=== Creating Backup Manifest ===${NC}"

MANIFEST_FILE="$BACKUP_LOCATION/backup-manifest-$TIMESTAMP.json"
cat > "$MANIFEST_FILE" << EOF
{
  "backupTimestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "archiveName": "$ARCHIVE_NAME",
  "archivePath": "$ARCHIVE_PATH",
  "archiveSizeBytes": $(stat -f%z "$ARCHIVE_PATH" 2>/dev/null || stat -c%s "$ARCHIVE_PATH"),
  "checksumFile": "$CHECKSUM_FILE",
  "sourceLocation": "$REPO_ROOT",
  "backupLocation": "$BACKUP_LOCATION",
  "filesIncluded": {
    "src": $([ -d "src" ] && echo "true" || echo "false"),
    "docs": $([ -d "docs" ] && echo "true" || echo "false"),
    "config": $([ -d "config" ] && echo "true" || echo "false"),
    "scripts": $([ -d "scripts" ] && echo "true" || echo "false")
  }
}
EOF

echo -e "${GREEN}✓ Backup manifest created${NC}"
SYNC_RESULTS+=("manifest:success")

# Run knowledge redundancy system sync
echo -e "\n${YELLOW}=== Running Knowledge Redundancy Sync ===${NC}"

if [ -f "dist/governance/knowledge-redundancy.js" ]; then
    RESULT=$(node -e "
        const { KnowledgeRedundancySystem } = require('./dist/governance/knowledge-redundancy.js');
        const system = new KnowledgeRedundancySystem();
        
        system.syncLayer('physical_offline').then(results => {
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

# Cleanup old backups (keep last 10)
echo -e "\n${YELLOW}=== Cleaning Up Old Backups ===${NC}"

OLD_BACKUPS=$(ls -t "$BACKUP_LOCATION"/knowledge-backup-*.tar.gz 2>/dev/null | tail -n +11)

if [ -n "$OLD_BACKUPS" ]; then
    echo -e "${BLUE}Removing old backups...${NC}"
    for backup in $OLD_BACKUPS; do
        if rm -f "$backup" 2>/dev/null; then
            echo -e "${GREEN}✓ Removed: $(basename "$backup")${NC}"
        fi
    done
    
    # Also remove old checksums and manifests
    rm -f "$BACKUP_LOCATION"/knowledge-backup-*.sha256 2>/dev/null
    rm -f "$BACKUP_LOCATION"/backup-manifest-*.json 2>/dev/null
else
    echo -e "${GREEN}✓ No old backups to clean${NC}"
fi

# Summary
echo -e "\n${BLUE}=== Physical Offline Backup Summary ===${NC}"
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
    echo -e "${GREEN}✓ Physical offline backup completed successfully${NC}"
    echo -e "${BLUE}Archive location: $ARCHIVE_PATH${NC}"
    exit 0
else
    echo -e "${RED}✗ Physical offline backup completed with errors${NC}"
    exit 1
fi
