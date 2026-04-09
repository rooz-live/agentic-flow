#!/bin/bash
# ============================================================================
# AgentDB Backup Script
# Creates timestamped backups with retention policy
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_PATH="$PROJECT_ROOT/agentdb.db"
BACKUP_DIR="$PROJECT_ROOT/backups/agentdb"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/agentdb_${TIMESTAMP}.db"

# Retention settings
KEEP_HOURLY=24    # Keep last 24 hourly backups
KEEP_DAILY=7      # Keep last 7 daily backups
KEEP_WEEKLY=4     # Keep last 4 weekly backups

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; exit 1; }

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check if database exists
if [[ ! -f "$DB_PATH" ]]; then
    error "Database not found: $DB_PATH"
fi

# Get database stats before backup
log "Analyzing database..."
DB_SIZE=$(du -h "$DB_PATH" | cut -f1)
EPISODE_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM episodes;")
COMPLETION_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM completion_episodes;")
SKILL_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM skills;")
TABLE_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';")

log "Database size: $DB_SIZE"
log "Episodes: $EPISODE_COUNT"
log "Completion episodes: $COMPLETION_COUNT"
log "Skills: $SKILL_COUNT"
log "Total tables: $TABLE_COUNT"

# Create backup using SQLite's backup command
log "Creating backup: $BACKUP_FILE"
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

# Verify backup
if [[ ! -f "$BACKUP_FILE" ]]; then
    error "Backup file was not created"
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
BACKUP_EPISODES=$(sqlite3 "$BACKUP_FILE" "SELECT COUNT(*) FROM episodes;")

if [[ "$BACKUP_EPISODES" != "$EPISODE_COUNT" ]]; then
    error "Backup verification failed: episode count mismatch"
fi

log "Backup created: $BACKUP_SIZE"
log "Backup verified: $BACKUP_EPISODES episodes"

# Cleanup old backups (retention policy)
log "Applying retention policy..."

# Find all backups sorted by date (newest first) - macOS compatible
KEPT=0
DELETED=0

# Current time boundaries
NOW=$(date +%s)

HOURLY_KEPT=0
DAILY_KEPT=0
WEEKLY_KEPT=0

# Get list of backups (macOS compatible)
while IFS= read -r backup; do
    [[ -z "$backup" ]] && continue
    
    # Get file modification time (macOS stat)
    BACKUP_TIME=$(stat -f %m "$backup" 2>/dev/null)
    AGE=$((NOW - BACKUP_TIME))
    
    KEEP=false
    
    # Hourly: Keep if within last 24 hours and haven't kept too many
    if [[ $AGE -lt 86400 ]] && [[ $HOURLY_KEPT -lt $KEEP_HOURLY ]]; then
        KEEP=true
        ((HOURLY_KEPT++))
    # Daily: Keep if within last 7 days and haven't kept too many
    elif [[ $AGE -lt 604800 ]] && [[ $DAILY_KEPT -lt $KEEP_DAILY ]]; then
        KEEP=true
        ((DAILY_KEPT++))
    # Weekly: Keep if within last 4 weeks and haven't kept too many
    elif [[ $AGE -lt 2419200 ]] && [[ $WEEKLY_KEPT -lt $KEEP_WEEKLY ]]; then
        KEEP=true
        ((WEEKLY_KEPT++))
    fi
    
    if [[ "$KEEP" == "true" ]]; then
        ((KEPT++))
    else
        rm -f "$backup"
        ((DELETED++))
    fi
done < <(find "$BACKUP_DIR" -name "agentdb_*.db" -type f | sort -r)

log "Kept $KEPT backups, deleted $DELETED old backups"
log "Backup complete: $BACKUP_FILE"

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Backup Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Database: $DB_PATH"
echo "  Backup: $BACKUP_FILE"
echo "  Size: $DB_SIZE → $BACKUP_SIZE"
echo "  Episodes: $EPISODE_COUNT"
echo "  Completion: $COMPLETION_COUNT"
echo "  Skills: $SKILL_COUNT"
echo ""
echo "  Backups kept:"
echo "    Hourly (24h): $HOURLY_KEPT"
echo "    Daily (7d): $DAILY_KEPT"
echo "    Weekly (4w): $WEEKLY_KEPT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
