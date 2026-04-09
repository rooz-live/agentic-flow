#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_DIR="$PROJECT_ROOT/.db"
DB_PATH="$DB_DIR/risk-traceability.db"
SCHEMA_PATH="$SCRIPT_DIR/init-risk-db.sql"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗄️  Initializing Risk Traceability Database"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create .db directory if it doesn't exist
mkdir -p "$DB_DIR"

# Check if sqlite3 is available
if ! command -v sqlite3 &> /dev/null; then
    echo "❌ Error: sqlite3 not found"
    echo "   Install: brew install sqlite (macOS) or apt-get install sqlite3 (Linux)"
    exit 1
fi

# Initialize database
echo "📁 Database path: $DB_PATH"

if [ -f "$DB_PATH" ]; then
    echo "⚠️  Database already exists"
    read -p "   Reinitialize? This will RESET all data (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "   Skipping initialization"
        exit 0
    fi
    rm "$DB_PATH"
    echo "   ✓ Deleted existing database"
fi

# Create database with schema
echo "🔨 Creating database schema..."
sqlite3 "$DB_PATH" < "$SCHEMA_PATH"

# Verify tables created
TABLE_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';")
echo "   ✓ Created $TABLE_COUNT tables"

# Show table summary
echo ""
echo "📊 Database Summary:"
echo "   • risks"
echo "   • obstacles (with ownership)"
echo "   • assumptions (with validation tracking)"
echo "   • mitigation_strategies"
echo "   • risk_episodes (traceability)"
echo "   • obstacle_episodes (traceability)"
echo "   • assumption_episodes (Build-Measure-Learn)"
echo "   • dor_dod_checks (DoR/DoD validation)"
echo "   • ceremony_schedules (cron automation)"
echo "   • circle_proficiency (skill tracking)"

# Show default schedules
echo ""
echo "📅 Default Ceremony Schedules (disabled):"
sqlite3 -header -column "$DB_PATH" "SELECT circle, ceremony, cron_expression FROM ceremony_schedules;"

echo ""
echo "✅ Risk traceability database initialized successfully!"
echo ""
echo "Next steps:"
echo "  1. Start API server: npm run start:web"
echo "  2. Enable schedules via Admin Panel"
echo "  3. Track risks: POST /api/risks/track"
echo "  4. Execute ceremonies: POST /api/ceremonies/execute"
echo ""
