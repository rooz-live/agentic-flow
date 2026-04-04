#!/bin/bash
# ============================================================================
# AgentDB Restore Script
# Restores database from backup with safety checks
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_PATH="$PROJECT_ROOT/agentdb.db"
BACKUP_DIR="$PROJECT_ROOT/backups/agentdb"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; exit 1; }
info() { echo -e "${BLUE}ℹ${NC} $1"; }

# Usage
usage() {
    echo "Usage: $0 [BACKUP_FILE|latest]"
    echo ""
    echo "Examples:"
    echo "  $0 latest                           # Restore most recent backup"
    echo "  $0 agentdb_20260108_011112.db       # Restore specific backup"
    echo ""
    exit 1
}

# List available backups
list_backups() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 Available Backups"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    local count=0
    while IFS= read -r backup; do
        [[ -z "$backup" ]] && continue
        ((count++))
        
        local filename=$(basename "$backup")
        local size=$(du -h "$backup" | cut -f1)
        local episodes=$(sqlite3 "$backup" "SELECT COUNT(*) FROM episodes;" 2>/dev/null || echo "?")
        local date=$(echo "$filename" | sed 's/agentdb_\([0-9]\{8\}\)_\([0-9]\{6\}\).db/\1 \2/' | awk '{print substr($1,1,4)"-"substr($1,5,2)"-"substr($1,7,2)" "substr($2,1,2)":"substr($2,3,2)":"substr($2,5,2)}')
        
        echo "  [$count] $filename"
        echo "      Date: $date | Size: $size | Episodes: $episodes"
    done < <(find "$BACKUP_DIR" -name "agentdb_*.db" -type f | sort -r)
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Parse arguments
BACKUP_FILE=""

if [[ $# -eq 0 ]]; then
    list_backups
    usage
fi

if [[ "$1" == "latest" ]]; then
    BACKUP_FILE=$(find "$BACKUP_DIR" -name "agentdb_*.db" -type f | sort -r | head -1)
    if [[ -z "$BACKUP_FILE" ]]; then
        error "No backups found in $BACKUP_DIR"
    fi
    info "Selected latest backup: $(basename "$BACKUP_FILE")"
elif [[ "$1" == "list" ]]; then
    list_backups
    exit 0
else
    # Check if full path or just filename
    if [[ -f "$1" ]]; then
        BACKUP_FILE="$1"
    elif [[ -f "$BACKUP_DIR/$1" ]]; then
        BACKUP_FILE="$BACKUP_DIR/$1"
    else
        error "Backup file not found: $1"
    fi
fi

# Verify backup file
if [[ ! -f "$BACKUP_FILE" ]]; then
    error "Backup file does not exist: $BACKUP_FILE"
fi

# Get backup stats
info "Analyzing backup..."
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
BACKUP_EPISODES=$(sqlite3 "$BACKUP_FILE" "SELECT COUNT(*) FROM episodes;")
BACKUP_SKILLS=$(sqlite3 "$BACKUP_FILE" "SELECT COUNT(*) FROM skills;")

log "Backup size: $BACKUP_SIZE"
log "Episodes: $BACKUP_EPISODES"
log "Skills: $BACKUP_SKILLS"

# Check current database
if [[ -f "$DB_PATH" ]]; then
    warn "Current database exists"
    CURRENT_EPISODES=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes;" 2>/dev/null || echo "0")
    warn "Current episodes: $CURRENT_EPISODES"
    
    # Create safety backup
    SAFETY_BACKUP="$DB_PATH.pre-restore-$(date +%Y%m%d_%H%M%S)"
    info "Creating safety backup: $SAFETY_BACKUP"
    cp "$DB_PATH" "$SAFETY_BACKUP"
    log "Safety backup created"
fi

# Confirm restore
echo ""
echo -e "${RED}⚠️  WARNING: This will replace the current database!${NC}"
echo ""
read -p "Continue with restore? (yes/no): " confirm

if [[ "$confirm" != "yes" ]]; then
    error "Restore cancelled"
fi

# Perform restore
log "Restoring database from backup..."
cp "$BACKUP_FILE" "$DB_PATH"

# Verify restore
RESTORED_EPISODES=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes;")

if [[ "$RESTORED_EPISODES" != "$BACKUP_EPISODES" ]]; then
    error "Restore verification failed: episode count mismatch"
fi

log "Database restored successfully"
log "Verified: $RESTORED_EPISODES episodes"

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Restore Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Database: $DB_PATH"
echo "  Backup: $(basename "$BACKUP_FILE")"
echo "  Episodes: $RESTORED_EPISODES"
echo "  Skills: $BACKUP_SKILLS"
if [[ -n "${SAFETY_BACKUP:-}" ]]; then
    echo ""
    echo "  Safety backup: $SAFETY_BACKUP"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
