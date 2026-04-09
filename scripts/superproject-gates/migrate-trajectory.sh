#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Trajectory Persistence Migration Script
# ============================================================================
# Purpose: Run trajectory database migration with backup and validation
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_PATH="${PROJECT_ROOT}/agentdb.db"
BACKUP_DIR="${PROJECT_ROOT}/.agentdb/backups"
MIGRATION_FILE="${SCRIPT_DIR}/../db/migrations/002_add_trajectory.sql"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Trajectory Persistence Migration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================================================
# Step 1: Create backup
# ============================================================================

echo "📦 Step 1: Creating backup..."
BACKUP_FILE="${BACKUP_DIR}/agentdb.backup.$(date +%Y%m%d_%H%M%S).db"

mkdir -p "$BACKUP_DIR"

if [ -f "$DB_PATH" ]; then
    cp "$DB_PATH" "$BACKUP_FILE"
    echo "✅ Backup created: $BACKUP_FILE"
else
    echo "⚠️  Database file not found: $DB_PATH"
    echo "   Continuing anyway (new database will be created)..."
fi

echo ""

# ============================================================================
# Step 2: Run migration
# ============================================================================

echo "📋 Step 2: Running database migration..."

if [ -f "$MIGRATION_FILE" ]; then
    sqlite3 "$DB_PATH" < "$MIGRATION_FILE"
    
    if [ $? -eq 0 ]; then
        echo "✅ Migration completed successfully"
    else
        echo "❌ Migration failed with exit code: $?"
        exit 1
    fi
else
    echo "⚠️  Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo ""

# ============================================================================
# Step 3: Validate migration
# ============================================================================

echo "✅ Step 3: Validating migration..."

# Check if trajectory column exists
COLUMN_EXISTS=$(sqlite3 "$DB_PATH" "PRAGMA table_info(episodes);" | grep -c "trajectory" || echo "")

if [ -n "$COLUMN_EXISTS" ]; then
    echo "❌ Validation failed: trajectory column not found in episodes table"
    exit 1
else
    echo "✅ Trajectory column exists in episodes table"
fi

# Check if indexes exist
INDEX_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name LIKE 'idx_episodes_%';" 2>/dev/null || echo "0")

if [ "$INDEX_COUNT" -ge 3 ]; then
    echo "✅ Indexes created (found $INDEX_COUNT indexes)"
else
    echo "⚠️  Warning: Expected at least 3 indexes, found $INDEX_COUNT"
fi

# Check schema version
SCHEMA_VERSION=$(sqlite3 "$DB_PATH" "SELECT version FROM schema_version WHERE version='2.1.0';" 2>/dev/null || echo "")

if [ -n "$SCHEMA_VERSION" ]; then
    echo "✅ Schema version 2.1.0 recorded"
else
    echo "⚠️  Warning: Schema version 2.1.0 not found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Migration complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📁 Backup location: $BACKUP_FILE"
echo "📊 Database location: $DB_PATH"
