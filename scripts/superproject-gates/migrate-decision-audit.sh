#!/usr/bin/env bash
set -euo pipefail

# Migration script for decision_audit table
# Migrates from old schema to new schema with decision_id support

DB_PATH="${1:-agentdb.db}"

echo "[MIGRATE] Checking current schema..."
if sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='decision_audit';" | grep -q decision_audit; then
  echo "[MIGRATE] decision_audit table exists, checking if migration needed..."
  
  # Check if decision_id column exists
  if sqlite3 "$DB_PATH" "PRAGMA table_info(decision_audit);" | grep -q decision_id; then
    echo "[MIGRATE] decision_id column already exists, no migration needed"
    exit 0
  fi
  
  echo "[MIGRATE] decision_id column missing, migrating..."
  
  # Create migration SQL file
  cat > /tmp/migrate_decision_audit.sql <<'EOF'
BEGIN TRANSACTION;

-- Rename old table
ALTER TABLE decision_audit RENAME TO decision_audit_old;

-- Create new table with correct schema
CREATE TABLE decision_audit (
  id TEXT PRIMARY KEY NOT NULL,
  timestamp TEXT NOT NULL,
  decision_id TEXT NOT NULL,
  circle_role TEXT NOT NULL,
  decision_type TEXT NOT NULL,
  context_json TEXT NOT NULL,
  outcome TEXT NOT NULL,
  rationale TEXT NOT NULL,
  alternatives_json TEXT NOT NULL,
  evidence_chain_json TEXT NOT NULL,
  preservation_stored INTEGER NOT NULL,
  preservation_location TEXT NOT NULL,
  preservation_key TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_decision_audit_decision_id ON decision_audit(decision_id);
CREATE INDEX IF NOT EXISTS idx_decision_audit_timestamp ON decision_audit(timestamp);
CREATE INDEX IF NOT EXISTS idx_decision_audit_circle_role ON decision_audit(circle_role);
CREATE INDEX IF NOT EXISTS idx_decision_audit_decision_type ON decision_audit(decision_type);
CREATE INDEX IF NOT EXISTS idx_decision_audit_outcome ON decision_audit(outcome);

-- Migrate old data (with defaults for new fields)
INSERT INTO decision_audit (
  id, timestamp, decision_id, circle_role, decision_type,
  context_json, outcome, rationale, alternatives_json,
  evidence_chain_json, preservation_stored, preservation_location, preservation_key
)
SELECT 
  id,
  datetime(timestamp, 'unixepoch'),
  'migrated-' || id,
  'orchestrator',
  COALESCE(decision_type, 'governance'),
  COALESCE(context, '{}'),
  COALESCE(outcome, 'CONTINUE'),
  rationale,
  COALESCE(alternatives, '[]'),
  COALESCE(evidence_chain, '[]'),
  1,
  'agentdb.db',
  'migrated-' || id
FROM decision_audit_old;

-- Drop old table
DROP TABLE decision_audit_old;

COMMIT;
EOF

  sqlite3 "$DB_PATH" < /tmp/migrate_decision_audit.sql
  rm /tmp/migrate_decision_audit.sql
  
  echo "[MIGRATE] Migration complete"
else
  echo "[MIGRATE] decision_audit table does not exist, will be created on first use"
fi

echo "[MIGRATE] Done"
