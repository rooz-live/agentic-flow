#!/usr/bin/env bash
#
# restore-environment.sh - Basic Environment Restoration Script
# Simple environment restoration for compatibility with enhanced version
#
# Usage: ./restore-environment.sh [--snapshot <name>] [--clean]
#

set -euo pipefail

# Configuration
SNAPSHOT_DIR=".snapshots"
DEFAULT_SNAPSHOT="baseline"
CLEAN_MODE=false
SNAPSHOT_NAME=""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --snapshot)
            SNAPSHOT_NAME="$2"
            shift 2
            ;;
        --clean)
            CLEAN_MODE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--snapshot <name>] [--clean]"
            echo "  --snapshot <name>  Specify snapshot name"
            echo "  --clean           Clean restore mode (removes current state)"
            exit 1
            ;;
    esac
done

SNAPSHOT_NAME="${SNAPSHOT_NAME:-$DEFAULT_SNAPSHOT}"

echo "🔄 Basic Environment Restoration"
echo "=========================="
echo "Snapshot: $SNAPSHOT_NAME"
echo "Clean mode: $CLEAN_MODE"
echo ""

# Create snapshot directory if it doesn't exist
mkdir -p "$SNAPSHOT_DIR"

# Function: Create basic snapshot
create_snapshot() {
    local name="$1"
    local snapshot_path="$SNAPSHOT_DIR/$name"
    
    echo "📸 Creating basic snapshot: $name"
    mkdir -p "$snapshot_path"
    
    # Backup AgentDB
    echo "  Saving AgentDB..."
    if [ -f ".agentdb/agentdb.sqlite" ]; then
        cp .agentdb/agentdb.sqlite "$snapshot_path/agentdb.sqlite"
        echo -e "    ${GREEN}✓ AgentDB saved${NC}"
    fi
    
    # Backup .goalie directory
    echo "  Saving .goalie governance data..."
    if [ -d ".goalie" ]; then
        cp -r .goalie "$snapshot_path/goalie"
        echo -e "    ${GREEN}✓ .goalie directory saved${NC}"
    fi
    
    # Backup .claude directory
    echo "  Saving Claude configuration..."
    if [ -d ".claude" ]; then
        cp -r .claude "$snapshot_path/claude"
        echo -e "    ${GREEN}✓ Claude configuration saved${NC}"
    fi
    
    # Create basic metadata
    echo "  Creating metadata..."
    cat > "$snapshot_path/metadata.json" <<EOF
{
  "name": "$name",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "git_ref": "$(git rev-parse HEAD)",
  "git_branch": "$(git branch --show-current)",
  "snapshot_version": "basic-v1.0",
  "components": {
    "agentdb": $( [ -f "$snapshot_path/agentdb.sqlite" ] && echo "true" || echo "false" ),
    "goalie": $( [ -d "$snapshot_path/goalie" ] && echo "true" || echo "false" ),
    "claude": $( [ -d "$snapshot_path/claude" ] && echo "true" || echo "false" )
  }
}
EOF
    
    local snapshot_size=$(du -sh "$snapshot_path" | cut -f1)
    echo -e "${GREEN}✓ Basic snapshot created: $snapshot_path ($snapshot_size)${NC}"
}

# Function: Restore basic snapshot
restore_snapshot() {
    local name="$1"
    local snapshot_path="$SNAPSHOT_DIR/$name"
    
    if [ ! -d "$snapshot_path" ]; then
        echo -e "${RED}✗ Snapshot not found: $name${NC}"
        echo "Available snapshots:"
        ls -1 "$SNAPSHOT_DIR" 2>/dev/null || echo "  (none)"
        exit 1
    fi
    
    echo "🔄 Restoring basic snapshot: $name"
    
    # Show metadata
    if [ -f "$snapshot_path/metadata.json" ]; then
        echo ""
        echo "Snapshot metadata:"
        cat "$snapshot_path/metadata.json"
        echo ""
    fi
    
    # Confirm restoration
    read -p "Continue with restoration? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Restoration cancelled"
        exit 0
    fi
    
    # Create backup of current state before restoration
    if [ "$CLEAN_MODE" = true ]; then
        echo "  Creating backup of current state..."
        local backup_name="pre-restore-$(date +%Y%m%d_%H%M%S)"
        create_snapshot "$backup_name"
        echo -e "    ${GREEN}✓ Current state backed up as: $backup_name${NC}"
    fi
    
    # Restore AgentDB
    if [ -f "$snapshot_path/agentdb.sqlite" ]; then
        echo "  Restoring AgentDB..."
        mkdir -p .agentdb
        cp "$snapshot_path/agentdb.sqlite" .agentdb/agentdb.sqlite
        echo -e "    ${GREEN}✓ AgentDB restored${NC}"
    fi
    
    # Restore .goalie directory
    if [ -d "$snapshot_path/goalie" ]; then
        echo "  Restoring .goalie governance data..."
        if [ -d ".goalie" ]; then
            mv .goalie .goalie.backup.$(date +%Y%m%d_%H%M%S)
        fi
        cp -r "$snapshot_path/goalie" .goalie
        echo -e "    ${GREEN}✓ .goalie directory restored${NC}"
    fi
    
    # Restore .claude directory
    if [ -d "$snapshot_path/claude" ]; then
        echo "  Restoring Claude configuration..."
        if [ -d ".claude" ]; then
            mv .claude .claude.backup.$(date +%Y%m%d_%H%M%S)
        fi
        cp -r "$snapshot_path/claude" .claude
        echo -e "    ${GREEN}✓ Claude configuration restored${NC}"
    fi
    
    echo -e "${GREEN}✅ Basic environment restored from snapshot: $name${NC}"
}

# Main logic
if [ -d "$SNAPSHOT_DIR/$SNAPSHOT_NAME" ]; then
    # Restore existing snapshot
    restore_snapshot "$SNAPSHOT_NAME"
else
    # Create new snapshot if it doesn't exist
    echo -e "${YELLOW}⚠ Snapshot '$SNAPSHOT_NAME' not found${NC}"
    read -p "Create new snapshot with this name? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        create_snapshot "$SNAPSHOT_NAME"
    else
        echo "Operation cancelled"
        exit 1
    fi
fi

echo ""
echo "✅ Basic environment restoration complete!"
echo ""
echo "Next steps:"
echo "  1. Run: npm run build"
echo "  2. Run: npm test"
echo "  3. Validate: ./scripts/restore-environment-enhanced.sh"