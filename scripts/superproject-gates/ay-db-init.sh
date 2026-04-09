#!/bin/bash
set -e

# ============================================================================
# AgentDB Initialization & Integrity Check
# ============================================================================
# Ensures single canonical database location with proper schema
# ============================================================================

# Canonical database location
export AGENTDB_PATH="${AGENTDB_PATH:-$HOME/Documents/code/investing/agentic-flow/agentdb.db}"
SCHEMA_PATH="$HOME/Documents/code/.agentic-qe/node_modules/agentdb/dist/schemas/schema.sql"
EXTENSIONS_PATH="$HOME/Documents/code/agentic-flow-core/db/schema-extensions.sql"

echo "🔍 AgentDB Initialization"
echo "   Location: $AGENTDB_PATH"

# Create directory if it doesn't exist
mkdir -p "$(dirname "$AGENTDB_PATH")"

# Check if database exists
if [ ! -f "$AGENTDB_PATH" ]; then
  echo "📦 Creating new AgentDB..."
  
  # Initialize with base schema
  if [ -f "$SCHEMA_PATH" ]; then
    sqlite3 "$AGENTDB_PATH" < "$SCHEMA_PATH"
    echo "   ✓ Base schema applied"
  else
    echo "   ⚠️  Base schema not found at $SCHEMA_PATH"
    echo "   Creating minimal schema..."
    sqlite3 "$AGENTDB_PATH" "PRAGMA foreign_keys = ON;"
  fi
  
  # Apply extensions
  if [ -f "$EXTENSIONS_PATH" ]; then
    sqlite3 "$AGENTDB_PATH" < "$EXTENSIONS_PATH"
    echo "   ✓ Schema extensions applied"
  fi
  
  echo "   ✅ AgentDB created at $AGENTDB_PATH"
else
  echo "   ✓ AgentDB exists"
fi

# Verify database integrity
echo "🔍 Checking database integrity..."
INTEGRITY_CHECK=$(sqlite3 "$AGENTDB_PATH" "PRAGMA integrity_check;" 2>&1 || echo "ERROR")

if echo "$INTEGRITY_CHECK" | grep -qi "ok"; then
  echo "   ✅ Database integrity: OK"
elif echo "$INTEGRITY_CHECK" | grep -qi "malformed\|corrupt"; then
  echo "   ❌ Database corruption detected!"
  echo "   $INTEGRITY_CHECK"
  
  # Backup corrupted database
  BACKUP_PATH="$AGENTDB_PATH.corrupted-$(date +%Y%m%d-%H%M%S)"
  echo "   📦 Backing up to: $BACKUP_PATH"
  cp "$AGENTDB_PATH" "$BACKUP_PATH"
  
  # Attempt recovery
  echo "   🔧 Attempting recovery..."
  RECOVERY_PATH="${AGENTDB_PATH}.recovery"
  
  if sqlite3 "$AGENTDB_PATH" ".recover" | sqlite3 "$RECOVERY_PATH" 2>/dev/null; then
    # Verify recovered database
    RECOVERY_CHECK=$(sqlite3 "$RECOVERY_PATH" "PRAGMA integrity_check;" 2>&1 || echo "ERROR")
    
    if echo "$RECOVERY_CHECK" | grep -qi "ok"; then
      echo "   ✅ Recovery successful!"
      mv "$RECOVERY_PATH" "$AGENTDB_PATH"
    else
      echo "   ❌ Recovery failed"
      echo "   Creating fresh database..."
      rm -f "$AGENTDB_PATH"
      
      # Reinitialize
      sqlite3 "$AGENTDB_PATH" < "$SCHEMA_PATH"
      if [ -f "$EXTENSIONS_PATH" ]; then
        sqlite3 "$AGENTDB_PATH" < "$EXTENSIONS_PATH"
      fi
      
      echo "   ✅ Fresh database created"
      echo "   ⚠️  Previous data lost (backup: $BACKUP_PATH)"
    fi
  else
    echo "   ❌ Recovery command failed"
    rm -f "$RECOVERY_PATH"
    exit 1
  fi
else
  echo "   ⚠️  Unexpected integrity check result:"
  echo "   $INTEGRITY_CHECK"
  exit 1
fi

# Apply extensions if not already present
if [ -f "$EXTENSIONS_PATH" ]; then
  echo "🔧 Checking schema extensions..."
  
  # Check if schema_version table exists
  HAS_VERSION=$(sqlite3 "$AGENTDB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version';" 2>/dev/null || echo "")
  
  if [ -z "$HAS_VERSION" ]; then
    echo "   📦 Applying schema extensions..."
    sqlite3 "$AGENTDB_PATH" < "$EXTENSIONS_PATH"
    echo "   ✅ Extensions applied"
  else
    # Check version
    CURRENT_VERSION=$(sqlite3 "$AGENTDB_PATH" "SELECT version FROM schema_version ORDER BY applied_at DESC LIMIT 1;" 2>/dev/null || echo "")
    echo "   ✓ Schema version: ${CURRENT_VERSION:-1.0.0}"
  fi
fi

# Display statistics
echo ""
echo "📊 Database Statistics:"
EPISODES=$(sqlite3 "$AGENTDB_PATH" "SELECT COUNT(*) FROM episodes;" 2>/dev/null || echo "0")
SKILLS=$(sqlite3 "$AGENTDB_PATH" "SELECT COUNT(*) FROM skills;" 2>/dev/null || echo "0")
INSIGHTS=$(sqlite3 "$AGENTDB_PATH" "SELECT COUNT(*) FROM retro_insights;" 2>/dev/null || echo "0")
RISKS=$(sqlite3 "$AGENTDB_PATH" "SELECT COUNT(*) FROM risk_tracking;" 2>/dev/null || echo "0")

echo "   Episodes: $EPISODES"
echo "   Skills: $SKILLS"
echo "   Retro Insights: $INSIGHTS"
echo "   Risks: $RISKS"

echo ""
echo "✅ AgentDB ready at $AGENTDB_PATH"

# Export for other scripts
export AGENTDB_PATH
