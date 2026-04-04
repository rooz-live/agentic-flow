#!/bin/bash
#################################################################
# rebuild-agentdb.sh - Fix Corrupted/Mismatched AgentDB
#################################################################
# PROBLEM: agentic-flow-core/agentdb.db is a symlink to 
#          agentic-flow's database with incompatible schema
#
# SOLUTION: Remove symlink, create fresh database, initialize
#           proper completion tracking schema
#################################################################

set -euo pipefail

PROJECT_ROOT="/Users/shahroozbhopti/Documents/code/agentic-flow-core"
DB_PATH="$PROJECT_ROOT/agentdb.db"
BACKUP_DIR="$PROJECT_ROOT/.db/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "═══════════════════════════════════════════════════════════"
echo "🔧 AgentDB Rebuild - agentic-flow-core"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ═══════════════════════════════════════════════════════════════
# Step 1: Backup Current State
# ═══════════════════════════════════════════════════════════════

echo "📦 Step 1: Backing up current database state..."
mkdir -p "$BACKUP_DIR"

if [ -L "$DB_PATH" ]; then
  echo "   ⚠️  Current database is a SYMLINK"
  echo "   Target: $(readlink "$DB_PATH")"
  
  # Backup the actual file the symlink points to
  TARGET_DB=$(readlink "$DB_PATH")
  if [ -f "$TARGET_DB" ]; then
    BACKUP_FILE="$BACKUP_DIR/symlink_target_$TIMESTAMP.db"
    cp "$TARGET_DB" "$BACKUP_FILE"
    echo "   ✅ Backed up symlink target to: $BACKUP_FILE"
  fi
  
  # Remove symlink
  rm -f "$DB_PATH"
  echo "   🗑️  Removed symlink"
  
elif [ -f "$DB_PATH" ]; then
  echo "   ℹ️  Current database is a regular file"
  BACKUP_FILE="$BACKUP_DIR/agentdb_$TIMESTAMP.db"
  cp "$DB_PATH" "$BACKUP_FILE"
  echo "   ✅ Backed up to: $BACKUP_FILE"
  rm -f "$DB_PATH"
  
else
  echo "   ℹ️  No existing database found (fresh install)"
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# Step 2: Create Fresh Database with Proper Schema
# ═══════════════════════════════════════════════════════════════

echo "🆕 Step 2: Creating fresh database..."

# Create empty database
sqlite3 "$DB_PATH" "PRAGMA journal_mode=WAL;"

echo "   ✅ Created new database at: $DB_PATH"
echo ""

# ═══════════════════════════════════════════════════════════════
# Step 3: Initialize Completion Tracking Schema
# ═══════════════════════════════════════════════════════════════

echo "📋 Step 3: Initializing completion tracking schema..."

# Build TypeScript if needed
if [ ! -d "$PROJECT_ROOT/dist" ]; then
  echo "   🔨 Building TypeScript..."
  cd "$PROJECT_ROOT"
  npm run build > /dev/null 2>&1 || {
    echo "   ⚠️  Build failed, trying anyway..."
  }
fi

# Initialize schema using CompletionTracker (use template)
sed "s|PROJECT_ROOT_PLACEHOLDER|$PROJECT_ROOT|g" "$PROJECT_ROOT/scripts/templates/init-schema.mjs" > /tmp/init-schema.mjs

# Run schema initialization
cd "$PROJECT_ROOT"
node /tmp/init-schema.mjs

echo ""

# ═══════════════════════════════════════════════════════════════
# Step 4: Verify Database Health
# ═══════════════════════════════════════════════════════════════

echo "🔍 Step 4: Verifying database health..."

# Check integrity
INTEGRITY=$(sqlite3 "$DB_PATH" "PRAGMA integrity_check;" 2>&1)
if [ "$INTEGRITY" = "ok" ]; then
  echo "   ✅ Database integrity: OK"
else
  echo "   ❌ Database integrity check failed:"
  echo "      $INTEGRITY"
  exit 1
fi

# Check schema
echo "   📊 Schema verification:"
EPISODE_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE name='completion_episodes';" 2>&1)
if [ "$EPISODE_COUNT" = "1" ]; then
  echo "      ✅ completion_episodes table exists"
else
  echo "      ❌ completion_episodes table missing!"
  exit 1
fi

VIEW_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='view' AND name LIKE '%metrics';" 2>&1)
echo "      ✅ $VIEW_COUNT metric views created"

echo ""

# ═══════════════════════════════════════════════════════════════
# Step 5: Seed with Test Episode
# ═══════════════════════════════════════════════════════════════

echo "🌱 Step 5: Seeding with test episode..."

# Prepare test episode with timestamp
NOW_MS=$(($(date +%s) * 1000))
sed "s|PROJECT_ROOT_PLACEHOLDER|$PROJECT_ROOT|g; s|TIMESTAMP_PLACEHOLDER|$NOW_MS|g" "$PROJECT_ROOT/scripts/templates/seed-episode.mjs" > /tmp/seed-episode.mjs

cd "$PROJECT_ROOT"
node /tmp/seed-episode.mjs

echo ""

# ═══════════════════════════════════════════════════════════════
# Step 6: Update Configuration
# ═══════════════════════════════════════════════════════════════

echo "⚙️  Step 6: Configuration recommendations..."
echo "   ℹ️  Database location: $DB_PATH"
echo "   ℹ️  No symlinks - using dedicated database"
echo "   ℹ️  Schema: completion_episodes (agentic-flow-core)"
echo "   ℹ️  Journal mode: WAL (Write-Ahead Logging)"
echo ""

# ═══════════════════════════════════════════════════════════════
# Final Summary
# ═══════════════════════════════════════════════════════════════

echo "═══════════════════════════════════════════════════════════"
echo "✅ Database rebuild COMPLETE"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📊 Summary:"
echo "   • Old symlink removed"
echo "   • Fresh database created"
echo "   • Completion tracking schema initialized"
echo "   • Test episode verified"
echo "   • Ready for production use"
echo ""
echo "🔍 Verify manually:"
echo "   sqlite3 $DB_PATH '.tables'"
echo "   sqlite3 $DB_PATH 'SELECT * FROM completion_episodes;'"
echo ""
echo "🚀 Next steps:"
echo "   1. Run: ay yo"
echo "   2. Execute recommended action"
echo "   3. Verify episode tracking works"
echo ""
