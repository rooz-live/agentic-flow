#!/usr/bin/env bash
#
# restore-environment.sh
#
# Rapidly restores development environment to known-good state
# for Build-Measure-Learn cycles and experimental validation
#
# Usage: ./scripts/restore-environment.sh [--snapshot <name>] [--clean]

set -euo pipefail

# Configuration
SNAPSHOT_DIR=".snapshots"
DEFAULT_SNAPSHOT="baseline"
CLEAN_MODE=false
SNAPSHOT_NAME=""

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
            exit 1
            ;;
    esac
done

SNAPSHOT_NAME="${SNAPSHOT_NAME:-$DEFAULT_SNAPSHOT}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🔄 Environment Restoration"
echo "=========================="
echo "Snapshot: $SNAPSHOT_NAME"
echo "Clean mode: $CLEAN_MODE"
echo ""

# Create snapshot directory if it doesn't exist
mkdir -p "$SNAPSHOT_DIR"

# Function: Create snapshot
create_snapshot() {
    local name="$1"
    local snapshot_path="$SNAPSHOT_DIR/$name"
    
    echo "📸 Creating snapshot: $name"
    mkdir -p "$snapshot_path"
    
    # Save critical state
    echo "  Saving AgentDB..."
    if [ -f ".agentdb/agentdb.sqlite" ]; then
        cp .agentdb/agentdb.sqlite "$snapshot_path/agentdb.sqlite"
    fi
    
    echo "  Saving configuration..."
    cp -r .agentdb/plugins "$snapshot_path/" 2>/dev/null || true
    cp -r .agentdb/hooks "$snapshot_path/" 2>/dev/null || true
    
    echo "  Saving logs baseline..."
    tar -czf "$snapshot_path/logs.tar.gz" logs/ 2>/dev/null || true
    
    echo "  Saving git state..."
    git rev-parse HEAD > "$snapshot_path/git-ref.txt"
    git status --porcelain > "$snapshot_path/git-status.txt"
    git diff > "$snapshot_path/git-diff.patch" 2>/dev/null || true
    
    echo "  Saving environment..."
    env | sort > "$snapshot_path/environment.txt"
    
    echo "  Saving package state..."
    if [ -f "package.json" ]; then
        cp package.json "$snapshot_path/"
        if [ -f "package-lock.json" ]; then
            cp package-lock.json "$snapshot_path/"
        fi
    fi
    
    # Save metrics baseline
    if [ -f "logs/governor_incidents.jsonl" ]; then
        cp logs/governor_incidents.jsonl "$snapshot_path/governor_incidents.jsonl"
    fi
    
    # Snapshot metadata
    cat > "$snapshot_path/metadata.json" <<EOF
{
  "name": "$name",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "git_ref": "$(git rev-parse HEAD)",
  "git_branch": "$(git branch --show-current)",
  "node_version": "$(node --version 2>/dev/null || echo 'unknown')",
  "npm_version": "$(npm --version 2>/dev/null || echo 'unknown')"
}
EOF
    
    echo -e "${GREEN}✓ Snapshot created: $snapshot_path${NC}"
}

# Function: Restore snapshot
restore_snapshot() {
    local name="$1"
    local snapshot_path="$SNAPSHOT_DIR/$name"
    
    if [ ! -d "$snapshot_path" ]; then
        echo -e "${RED}✗ Snapshot not found: $name${NC}"
        echo "Available snapshots:"
        ls -1 "$SNAPSHOT_DIR" 2>/dev/null || echo "  (none)"
        exit 1
    fi
    
    echo "🔄 Restoring snapshot: $name"
    
    # Show metadata
    if [ -f "$snapshot_path/metadata.json" ]; then
        echo ""
        echo "Snapshot metadata:"
        cat "$snapshot_path/metadata.json" | jq . 2>/dev/null || cat "$snapshot_path/metadata.json"
        echo ""
    fi
    
    # Confirm restoration
    read -p "Continue with restoration? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Restoration cancelled"
        exit 0
    fi
    
    # Restore AgentDB
    if [ -f "$snapshot_path/agentdb.sqlite" ]; then
        echo "  Restoring AgentDB..."
        mkdir -p .agentdb
        cp "$snapshot_path/agentdb.sqlite" .agentdb/agentdb.sqlite
    fi
    
    # Restore configuration
    echo "  Restoring configuration..."
    if [ -d "$snapshot_path/plugins" ]; then
        cp -r "$snapshot_path/plugins" .agentdb/ 2>/dev/null || true
    fi
    if [ -d "$snapshot_path/hooks" ]; then
        cp -r "$snapshot_path/hooks" .agentdb/ 2>/dev/null || true
    fi
    
    # Restore logs (optional)
    if [ -f "$snapshot_path/logs.tar.gz" ] && [ "$CLEAN_MODE" = true ]; then
        echo "  Restoring logs..."
        rm -rf logs/
        tar -xzf "$snapshot_path/logs.tar.gz"
    fi
    
    # Restore git state
    if [ -f "$snapshot_path/git-ref.txt" ]; then
        echo "  Checking out git ref..."
        local git_ref=$(cat "$snapshot_path/git-ref.txt")
        git checkout "$git_ref" 2>/dev/null || echo -e "${YELLOW}⚠ Could not checkout git ref${NC}"
    fi
    
    # Restore packages
    if [ -f "$snapshot_path/package.json" ]; then
        echo "  Restoring packages..."
        cp "$snapshot_path/package.json" .
        if [ -f "$snapshot_path/package-lock.json" ]; then
            cp "$snapshot_path/package-lock.json" .
        fi
        npm install --silent 2>&1 | tail -5
    fi
    
    echo -e "${GREEN}✓ Environment restored from snapshot: $name${NC}"
}

# Function: List snapshots
list_snapshots() {
    echo "📋 Available snapshots:"
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
                echo "  - $name"
                echo "    Created: $timestamp"
                echo "    Branch: $branch"
                echo ""
            else
                echo "  - $name (no metadata)"
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
echo "✅ Environment restoration complete!"
echo ""
echo "Next steps:"
echo "  1. Run: npm run build"
echo "  2. Run: npm test"
echo "  3. Run: ./scripts/baseline-metrics.sh"
