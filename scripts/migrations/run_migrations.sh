#!/bin/bash
# Migration Runner for Affiliate System
# Usage: ./scripts/migrations/run_migrations.sh [database_path]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DB_PATH="${1:-$PROJECT_ROOT/logs/device_state_tracking.db}"
MIGRATIONS_DIR="$SCRIPT_DIR"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           Affiliate System Database Migration                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Database: $DB_PATH"
echo "Migrations: $MIGRATIONS_DIR"
echo ""

# Ensure logs directory exists
mkdir -p "$(dirname "$DB_PATH")"

# Create migrations tracking table if not exists
sqlite3 "$DB_PATH" <<EOF
CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOF

# Get list of applied migrations
applied_migrations=$(sqlite3 "$DB_PATH" "SELECT filename FROM _migrations;")

# Run each migration file in order
migration_count=0
for migration in "$MIGRATIONS_DIR"/*.sql; do
    if [[ -f "$migration" ]]; then
        filename=$(basename "$migration")
        
        # Skip if already applied
        if echo "$applied_migrations" | grep -q "^${filename}$"; then
            echo "⏭️  Skipping (already applied): $filename"
            continue
        fi
        
        echo "📦 Applying migration: $filename"
        
        # Apply migration
        if sqlite3 "$DB_PATH" < "$migration"; then
            # Record migration as applied
            sqlite3 "$DB_PATH" "INSERT INTO _migrations (filename) VALUES ('$filename');"
            echo "✅ Applied: $filename"
            ((migration_count++))
        else
            echo "❌ Failed: $filename"
            exit 1
        fi
    fi
done

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "Migration Summary:"
echo "  Applied: $migration_count migration(s)"
echo ""

# Verify tables
echo "Verifying tables..."
tables=$(sqlite3 "$DB_PATH" ".tables")
echo "Tables: $tables"
echo ""

# Show table counts
echo "Table Statistics:"
for table in affiliate_states affiliate_activities affiliate_risks affiliate_affinities; do
    if sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='$table';" | grep -q "$table"; then
        count=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM $table;")
        echo "  $table: $count rows"
    else
        echo "  $table: ❌ NOT CREATED"
    fi
done

echo ""
echo "✅ Migration complete!"

