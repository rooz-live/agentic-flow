#!/usr/bin/env bash
#
# restore-environment-enhanced.sh
#
# ENHANCED VERSION: Comprehensive environment snapshot and restoration system
# Addresses critical gaps in original script for complete infrastructure preservation
#
# Usage: ./scripts/restore-environment-enhanced.sh [--snapshot <name>] [--clean] [--validate]
#

set -euo pipefail

# Enhanced Configuration
SNAPSHOT_DIR=".snapshots"
DEFAULT_SNAPSHOT="baseline"
CLEAN_MODE=false
SNAPSHOT_NAME=""
VALIDATE_MODE=false

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
        --validate)
            VALIDATE_MODE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--snapshot <name>] [--clean] [--validate]"
            echo "  --snapshot <name>  Specify snapshot name"
            echo "  --clean           Clean restore mode (removes current state)"
            echo "  --validate        Validate snapshot integrity after creation"
            exit 1
            ;;
    esac
done

SNAPSHOT_NAME="${SNAPSHOT_NAME:-$DEFAULT_SNAPSHOT}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🔄 Enhanced Environment Restoration"
echo "==============================="
echo "Snapshot: $SNAPSHOT_NAME"
echo "Clean mode: $CLEAN_MODE"
echo "Validate mode: $VALIDATE_MODE"
echo ""

# Create snapshot directory if it doesn't exist
mkdir -p "$SNAPSHOT_DIR"

# Function: Validate snapshot integrity
validate_snapshot() {
    local name="$1"
    local snapshot_path="$SNAPSHOT_DIR/$name"
    
    echo "🔍 Validating snapshot: $name"
    
    if [ ! -d "$snapshot_path" ]; then
        echo -e "${RED}✗ Snapshot directory not found: $snapshot_path${NC}"
        return 1
    fi
    
    local validation_errors=0
    
    # Check critical components
    echo "  Checking critical components..."
    
    if [ ! -f "$snapshot_path/metadata.json" ]; then
        echo -e "    ${RED}✗ Missing metadata.json${NC}"
        ((validation_errors++))
    else
        echo -e "    ${GREEN}✓ metadata.json present${NC}"
    fi
    
    if [ ! -f "$snapshot_path/agentdb.sqlite" ] && [ ! -f "$snapshot_path/agentdb.sqlite.gz" ]; then
        echo -e "    ${RED}✗ Missing AgentDB database${NC}"
        ((validation_errors++))
    else
        echo -e "    ${GREEN}✓ AgentDB database present${NC}"
    fi
    
    if [ ! -d "$snapshot_path/goalie" ]; then
        echo -e "    ${RED}✗ Missing .goalie directory${NC}"
        ((validation_errors++))
    else
        echo -e "    ${GREEN}✓ .goalie directory present${NC}"
    fi
    
    if [ ! -d "$snapshot_path/claude" ]; then
        echo -e "    ${RED}✗ Missing .claude directory${NC}"
        ((validation_errors++))
    else
        echo -e "    ${GREEN}✓ .claude directory present${NC}"
    fi
    
    if [ ! -f "$snapshot_path/logs.tar.gz" ]; then
        echo -e "    ${RED}✗ Missing logs archive${NC}"
        ((validation_errors++))
    else
        echo -e "    ${GREEN}✓ Logs archive present${NC}"
    fi
    
    if [ $validation_errors -gt 0 ]; then
        echo -e "${RED}✗ Snapshot validation failed with $validation_errors errors${NC}"
        return 1
    else
        echo -e "${GREEN}✓ Snapshot validation passed${NC}"
        return 0
    fi
}

# Function: Create comprehensive snapshot
create_snapshot() {
    local name="$1"
    local snapshot_path="$SNAPSHOT_DIR/$name"
    
    echo "📸 Creating comprehensive snapshot: $name"
    mkdir -p "$snapshot_path"
    
    # Backup AgentDB with enhanced coverage
    echo "  Saving AgentDB..."
    if [ -f ".agentdb/agentdb.sqlite" ]; then
        cp .agentdb/agentdb.sqlite "$snapshot_path/agentdb.sqlite"
        # Create compressed backup
        gzip -c .agentdb/agentdb.sqlite > "$snapshot_path/agentdb.sqlite.gz"
    fi
    
    # Include AgentDB backup files
    if [ -f ".agentdb/agentdb.sqlite.backup"* ]; then
        cp .agentdb/agentdb.sqlite.backup* "$snapshot_path/" 2>/dev/null || true
    fi
    
    echo "  Saving AgentDB configuration..."
    cp -r .agentdb/plugins "$snapshot_path/" 2>/dev/null || true
    cp -r .agentdb/hooks "$snapshot_path/" 2>/dev/null || true
    cp .agentdb/init_schema.sql "$snapshot_path/" 2>/dev/null || true
    
    # CRITICAL: Backup entire .goalie directory
    echo "  Saving .goalie governance data..."
    if [ -d ".goalie" ]; then
        cp -r .goalie "$snapshot_path/goalie"
        echo -e "    ${GREEN}✓ Backed up $(find .goalie -type f | wc -l) .goalie files${NC}"
    else
        echo -e "    ${YELLOW}⚠ .goalie directory not found${NC}"
    fi
    
    # CRITICAL: Backup .claude directory
    echo "  Saving Claude configuration..."
    if [ -d ".claude" ]; then
        cp -r .claude "$snapshot_path/claude"
        echo -e "    ${GREEN}✓ Backed up $(find .claude -type f | wc -l) Claude files${NC}"
    else
        echo -e "    ${YELLOW}⚠ .claude directory not found${NC}"
    fi
    
    # Enhanced logs backup
    echo "  Saving comprehensive logs..."
    if [ -d "logs" ]; then
        tar -czf "$snapshot_path/logs.tar.gz" logs/
        echo -e "    ${GREEN}✓ Backed up $(find logs -type f | wc -l) log files${NC}"
    fi
    
    # Git state management
    echo "  Saving git state..."
    git rev-parse HEAD > "$snapshot_path/git-ref.txt"
    git status --porcelain > "$snapshot_path/git-status.txt"
    git diff > "$snapshot_path/git-diff.patch" 2>/dev/null || true
    git branch --show-current > "$snapshot_path/git-branch.txt"
    
    # Environment and configuration
    echo "  Saving environment and config..."
    env | sort > "$snapshot_path/environment.txt"
    
    if [ -d "config" ]; then
        cp -r config "$snapshot_path/"
        echo -e "    ${GREEN}✓ Backed up config directory${NC}"
    fi
    
    if [ -d "metrics" ]; then
        cp -r metrics "$snapshot_path/"
        echo -e "    ${GREEN}✓ Backed up metrics directory${NC}"
    fi
    
    # Package state
    echo "  Saving package state..."
    if [ -f "package.json" ]; then
        cp package.json "$snapshot_path/"
        if [ -f "package-lock.json" ]; then
            cp package-lock.json "$snapshot_path/"
        fi
    fi
    
    # Enhanced metadata
    echo "  Creating enhanced metadata..."
    cat > "$snapshot_path/metadata.json" <<EOF
{
  "name": "$name",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "git_ref": "$(git rev-parse HEAD)",
  "git_branch": "$(git branch --show-current)",
  "node_version": "$(node --version 2>/dev/null || echo 'unknown')",
  "npm_version": "$(npm --version 2>/dev/null || echo 'unknown')",
  "snapshot_version": "enhanced-v1.0",
  "components": {
    "agentdb": $( [ -f "$snapshot_path/agentdb.sqlite" ] && echo "true" || echo "false" ),
    "goalie": $( [ -d "$snapshot_path/goalie" ] && echo "true" || echo "false" ),
    "claude": $( [ -d "$snapshot_path/claude" ] && echo "true" || echo "false" ),
    "logs": $( [ -f "$snapshot_path/logs.tar.gz" ] && echo "true" || echo "false" ),
    "config": $( [ -d "$snapshot_path/config" ] && echo "true" || echo "false" ),
    "metrics": $( [ -d "$snapshot_path/metrics" ] && echo "true" || echo "false" )
  },
  "file_counts": {
    "goalie_files": $( [ -d "$snapshot_path/goalie" ] && find "$snapshot_path/goalie" -type f | wc -l || echo "0" ),
    "claude_files": $( [ -d "$snapshot_path/claude" ] && find "$snapshot_path/claude" -type f | wc -l || echo "0" ),
    "agentdb_files": $( [ -d "$snapshot_path/.agentdb" ] && find "$snapshot_path/.agentdb" -type f | wc -l || echo "0" ),
    "log_files": $( [ -f "$snapshot_path/logs.tar.gz" ] && echo "archived" || echo "0" )
  }
}
EOF
    
    # Calculate snapshot size
    local snapshot_size=$(du -sh "$snapshot_path" | cut -f1)
    echo -e "${GREEN}✓ Comprehensive snapshot created: $snapshot_path ($snapshot_size)${NC}"
    
    # Validate if requested
    if [ "$VALIDATE_MODE" = true ]; then
        validate_snapshot "$name"
    fi
}

# Function: Restore comprehensive snapshot
restore_snapshot() {
    local name="$1"
    local snapshot_path="$SNAPSHOT_DIR/$name"
    
    if [ ! -d "$snapshot_path" ]; then
        echo -e "${RED}✗ Snapshot not found: $name${NC}"
        echo "Available snapshots:"
        ls -1 "$SNAPSHOT_DIR" 2>/dev/null || echo "  (none)"
        exit 1
    fi
    
    echo "🔄 Restoring comprehensive snapshot: $name"
    
    # Show enhanced metadata
    if [ -f "$snapshot_path/metadata.json" ]; then
        echo ""
        echo "Snapshot metadata:"
        cat "$snapshot_path/metadata.json" | jq . 2>/dev/null || cat "$snapshot_path/metadata.json"
        echo ""
    else
        echo -e "${YELLOW}⚠ No metadata found - basic snapshot${NC}"
    fi
    
    # Confirm restoration
    read -p "Continue with comprehensive restoration? (y/N) " -n 1 -r
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
    
    # Restore AgentDB with enhanced coverage
    if [ -f "$snapshot_path/agentdb.sqlite" ] || [ -f "$snapshot_path/agentdb.sqlite.gz" ]; then
        echo "  Restoring AgentDB..."
        mkdir -p .agentdb
        
        if [ -f "$snapshot_path/agentdb.sqlite.gz" ]; then
            gunzip -c "$snapshot_path/agentdb.sqlite.gz" > .agentdb/agentdb.sqlite
        elif [ -f "$snapshot_path/agentdb.sqlite" ]; then
            cp "$snapshot_path/agentdb.sqlite" .agentdb/agentdb.sqlite
        fi
        
        # Restore AgentDB configuration
        if [ -d "$snapshot_path/hooks" ]; then
            cp -r "$snapshot_path/hooks" .agentdb/ 2>/dev/null || true
        fi
        if [ -d "$snapshot_path/plugins" ]; then
            cp -r "$snapshot_path/plugins" .agentdb/ 2>/dev/null || true
        fi
        if [ -f "$snapshot_path/init_schema.sql" ]; then
            cp "$snapshot_path/init_schema.sql" .agentdb/ 2>/dev/null || true
        fi
        
        # Restore backup files
        cp "$snapshot_path"/agentdb.sqlite.backup* .agentdb/ 2>/dev/null || true
        
        echo -e "    ${GREEN}✓ AgentDB restored${NC}"
    else
        echo -e "    ${YELLOW}⚠ No AgentDB found in snapshot${NC}"
    fi
    
    # CRITICAL: Restore .goalie directory
    if [ -d "$snapshot_path/goalie" ]; then
        echo "  Restoring .goalie governance data..."
        if [ -d ".goalie" ]; then
            # Backup existing .goalie before overwrite
            mv .goalie .goalie.backup.$(date +%Y%m%d_%H%M%S)
        fi
        cp -r "$snapshot_path/goalie" .goalie
        echo -e "    ${GREEN}✓ .goalie directory restored ($(find .goalie -type f | wc -l) files)${NC}"
    else
        echo -e "    ${YELLOW}⚠ No .goalie data found in snapshot${NC}"
    fi
    
    # CRITICAL: Restore .claude directory
    if [ -d "$snapshot_path/claude" ]; then
        echo "  Restoring Claude configuration..."
        if [ -d ".claude" ]; then
            # Backup existing .claude before overwrite
            mv .claude .claude.backup.$(date +%Y%m%d_%H%M%S)
        fi
        cp -r "$snapshot_path/claude" .claude
        echo -e "    ${GREEN}✓ Claude configuration restored ($(find .claude -type f | wc -l) files)${NC}"
    else
        echo -e "    ${YELLOW}⚠ No Claude configuration found in snapshot${NC}"
    fi
    
    # Restore logs
    if [ -f "$snapshot_path/logs.tar.gz" ]; then
        echo "  Restoring comprehensive logs..."
        if [ "$CLEAN_MODE" = true ]; then
            rm -rf logs/
            tar -xzf "$snapshot_path/logs.tar.gz"
            echo -e "    ${GREEN}✓ Logs restored ($(find logs -type f | wc -l) files)${NC}"
        else
            echo -e "    ${YELLOW}⚠ Logs not restored (use --clean mode)${NC}"
        fi
    fi
    
    # Restore git state
    if [ -f "$snapshot_path/git-ref.txt" ]; then
        echo "  Restoring git state..."
        local git_ref=$(cat "$snapshot_path/git-ref.txt")
        if git checkout "$git_ref" 2>/dev/null; then
            echo -e "    ${GREEN}✓ Git checkout successful${NC}"
        else
            echo -e "    ${YELLOW}⚠ Could not checkout git ref: $git_ref${NC}"
        fi
        
        if [ -f "$snapshot_path/git-diff.patch" ]; then
            if git apply "$snapshot_path/git-diff.patch" 2>/dev/null; then
                echo -e "    ${GREEN}✓ Git diff applied${NC}"
            else
                echo -e "    ${YELLOW}⚠ Could not apply git diff${NC}"
            fi
        fi
    fi
    
    # Restore config and metrics
    if [ -d "$snapshot_path/config" ]; then
        echo "  Restoring configuration..."
        if [ "$CLEAN_MODE" = true ]; then
            rm -rf config/
        fi
        cp -r "$snapshot_path/config" ./
        echo -e "    ${GREEN}✓ Configuration restored${NC}"
    fi
    
    if [ -d "$snapshot_path/metrics" ]; then
        echo "  Restoring metrics..."
        if [ "$CLEAN_MODE" = true ]; then
            rm -rf metrics/
        fi
        cp -r "$snapshot_path/metrics" ./
        echo -e "    ${GREEN}✓ Metrics restored${NC}"
    fi
    
    # Restore packages
    if [ -f "$snapshot_path/package.json" ]; then
        echo "  Restoring packages..."
        cp "$snapshot_path/package.json" .
        if [ -f "$snapshot_path/package-lock.json" ]; then
            cp "$snapshot_path/package-lock.json" .
        fi
        if [ "$CLEAN_MODE" = true ]; then
            echo "  Running npm install..."
            npm install --silent 2>&1 | tail -5
        fi
        echo -e "    ${GREEN}✓ Package state restored${NC}"
    fi
    
    echo -e "${GREEN}✅ Comprehensive environment restored from snapshot: $name${NC}"
    
    # Post-restore validation
    if [ "$VALIDATE_MODE" = true ]; then
        echo ""
        echo "🔍 Post-restore validation..."
        ./scripts/restore-environment-diagnostic.sh
    fi
}

# Function: List snapshots with enhanced information
list_snapshots() {
    echo "📋 Available Snapshots:"
    echo ""
    
    if [ ! -d "$SNAPSHOT_DIR" ] || [ -z "$(ls -A "$SNAPSHOT_DIR" 2>/dev/null)" ]; then
        echo "  (no snapshots found)"
        return
    fi
    
    for snapshot in "$SNAPSHOT_DIR"/*; do
        if [ -d "$snapshot" ]; then
            local name=$(basename "$snapshot")
            local metadata="$snapshot/metadata.json"
            
            if [ -f "$metadata" ]; then
                local timestamp=$(jq -r .timestamp "$metadata" 2>/dev/null || echo "unknown")
                local branch=$(jq -r .git_branch "$metadata" 2>/dev/null || echo "unknown")
                local version=$(jq -r .snapshot_version "$metadata" 2>/dev/null || echo "unknown")
                local size=$(du -sh "$snapshot" | cut -f1)
                
                echo "  - $name"
                echo "    Created: $timestamp"
                echo "    Branch: $branch"
                echo "    Version: $version"
                echo "    Size: $size"
                
                # Show component status
                local goalie_status=$(jq -r .components.goalie "$metadata" 2>/dev/null || echo "unknown")
                local claude_status=$(jq -r .components.claude "$metadata" 2>/dev/null || echo "unknown")
                echo "    Components: Goalie=$goalie_status, Claude=$claude_status"
                echo ""
            else
                local size=$(du -sh "$snapshot" | cut -f1)
                echo "  - $name (no metadata, $size)"
                echo ""
            fi
        fi
    done
}

# Main logic
if [ "$SNAPSHOT_NAME" = "list" ]; then
    list_snapshots
    exit 0
fi

if [ "$SNAPSHOT_NAME" = "create" ]; then
    read -p "Enter snapshot name: " new_name
    create_snapshot "$new_name"
    exit 0
fi

# Check if snapshot exists
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
echo "✅ Enhanced environment restoration complete!"
echo ""
echo "Next steps:"
echo "  1. Run: npm run build"
echo "  2. Run: npm test"
echo "  3. Run: ./scripts/baseline-metrics.sh"
echo "  4. Validate: ./scripts/restore-environment-diagnostic.sh"