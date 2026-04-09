#!/bin/bash
# Migration Script: Consolidate old .env files into new structure
# This script analyzes existing .env files and organizes them

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
NEW_ENV_DIR="$SCRIPT_DIR"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Environment Configuration Migration${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Find all .env files in project root
OLD_ENV_FILES=$(find "$PROJECT_ROOT" -maxdepth 1 -name ".env*" -type f 2>/dev/null || true)

if [[ -z "$OLD_ENV_FILES" ]]; then
    echo -e "${YELLOW}No .env files found in project root${NC}"
    echo -e "${GREEN}✓${NC} New configuration structure is ready to use"
    echo ""
    echo "Next steps:"
    echo "  1. Copy config/env/.env.local.template to config/env/.env.local"
    echo "  2. Fill in your secrets in .env.local"
    echo "  3. Test: source config/env/load-env.sh"
    exit 0
fi

echo -e "${BLUE}Found .env files to migrate:${NC}"
echo "$OLD_ENV_FILES" | while read -r file; do
    echo -e "  • $(basename "$file")"
done
echo ""

# Create backup directory
BACKUP_DIR="$PROJECT_ROOT/.env.backup.$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}[BACKUP]${NC} Creating backup in $BACKUP_DIR..."

# Copy old files to backup
echo "$OLD_ENV_FILES" | while read -r file; do
    if [[ -f "$file" ]]; then
        cp "$file" "$BACKUP_DIR/"
        echo -e "  ${GREEN}✓${NC} Backed up $(basename "$file")"
    fi
done
echo ""

# Categorize variables
echo -e "${YELLOW}[ANALYSIS]${NC} Analyzing variables..."

# Create temporary local env file
LOCAL_ENV_TEMP="$NEW_ENV_DIR/.env.local.new"
echo "# Migrated Environment Variables" > "$LOCAL_ENV_TEMP"
echo "# Generated: $(date)" >> "$LOCAL_ENV_TEMP"
echo "" >> "$LOCAL_ENV_TEMP"

# Process each old env file
echo "$OLD_ENV_FILES" | while read -r file; do
    if [[ -f "$file" ]]; then
        filename=$(basename "$file")
        echo -e "${BLUE}Processing${NC} $filename..."
        
        # Read variables and categorize
        while IFS= read -r line; do
            # Skip comments and empty lines
            [[ "$line" =~ ^[[:space:]]*# ]] && continue
            [[ -z "$line" ]] && continue
            
            # Extract variable name
            var_name=$(echo "$line" | cut -d= -f1 | xargs)
            
            # Categorize by prefix
            case "$var_name" in
                AWS_*|S3_*|EC2_*|RDS_*)
                    echo "  → AWS: $var_name"
                    ;;
                YOLIFE_*|CPANEL_*)
                    echo "  → cPanel: $var_name"
                    ;;
                STX_*|OS_*)
                    echo "  → StarlingX: $var_name"
                    ;;
                CLAUDE_*|MCP_*|QUEEN_*|SPECIALIST_*|MEMORY_*|EXECUTION_*)
                    echo "  → Claude Flow/MCP: $var_name"
                    ;;
                *_KEY|*_SECRET|*_TOKEN|*_PASSWORD|*API_KEY*)
                    echo "  → Secret: $var_name"
                    echo "$line" >> "$LOCAL_ENV_TEMP"
                    ;;
                *)
                    echo "  → Base/Other: $var_name"
                    ;;
            esac
        done < "$file"
        echo ""
    fi
done

# Check if .env.local already exists
if [[ -f "$NEW_ENV_DIR/.env.local" ]]; then
    echo -e "${YELLOW}⚠${NC} .env.local already exists"
    echo -e "${YELLOW}→${NC} Review and merge: $LOCAL_ENV_TEMP"
    echo ""
else
    mv "$LOCAL_ENV_TEMP" "$NEW_ENV_DIR/.env.local"
    echo -e "${GREEN}✓${NC} Created .env.local with secrets"
    echo ""
fi

# Summary
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Migration Complete${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "What happened:"
echo -e "  ${GREEN}✓${NC} Backed up old .env files to: $BACKUP_DIR"
echo -e "  ${GREEN}✓${NC} Analyzed and categorized variables"
echo -e "  ${GREEN}✓${NC} Created/updated .env.local with secrets"
echo ""
echo "Next steps:"
echo "  1. Review config/env/.env.local"
echo "  2. Update infrastructure/*.env files with non-secret values"
echo "  3. Test: source config/env/load-env.sh"
echo "  4. Update scripts to use new loader"
echo "  5. Delete old .env files when satisfied"
echo ""
echo "Rollback:"
echo "  cp $BACKUP_DIR/.env* $PROJECT_ROOT/"
echo ""
