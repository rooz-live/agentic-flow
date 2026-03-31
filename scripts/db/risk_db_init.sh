#!/usr/bin/env bash
set -euo pipefail

# Risk Database Auto-Initialization Script
# Creates SQLite risk database with WSJF tracking, drift events, and ProcessGovernor integration

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SCHEMA_FILE="${PROJECT_ROOT}/schemas/risk_schema.sql"
DEFAULT_DB_PATH="${PROJECT_ROOT}/risks.db"
RISK_DB_PATH="${RISK_DB_PATH:-$DEFAULT_DB_PATH}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[risk_db_init]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[risk_db_init]${NC} $1"
}

error() {
    echo -e "${RED}[risk_db_init]${NC} $1" >&2
}

# Check if sqlite3 is available
if ! command -v sqlite3 &> /dev/null; then
    error "sqlite3 command not found. Please install SQLite."
    exit 1
fi

# Check if schema file exists
if [ ! -f "$SCHEMA_FILE" ]; then
    error "Schema file not found: $SCHEMA_FILE"
    exit 1
fi

# Create database directory if it doesn't exist
DB_DIR="$(dirname "$RISK_DB_PATH")"
if [ ! -d "$DB_DIR" ]; then
    log "Creating database directory: $DB_DIR"
    mkdir -p "$DB_DIR"
fi

# Check if database already exists
if [ -f "$RISK_DB_PATH" ]; then
    log "Risk database already exists: $RISK_DB_PATH"
    
    # Verify schema is up to date by checking for key tables
    TABLES_EXIST=$(sqlite3 "$RISK_DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('risks', 'drift_events', 'governor_incidents', 'swarm_events', 'baselines');" 2>/dev/null || echo "0")
    
    if [ "$TABLES_EXIST" = "5" ]; then
        log "All core tables exist. Applying schema updates (idempotent)..."
    else
        warn "Missing tables detected. Initializing schema..."
    fi
else
    log "Creating new risk database: $RISK_DB_PATH"
fi

# Apply schema (idempotent - CREATE IF NOT EXISTS)
log "Applying schema from: $SCHEMA_FILE"
if sqlite3 "$RISK_DB_PATH" < "$SCHEMA_FILE"; then
    log "Schema applied successfully"
else
    error "Failed to apply schema"
    exit 1
fi

# Verify tables were created
TABLES=$(sqlite3 "$RISK_DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
log "Tables in database:"
echo "$TABLES" | while read -r table; do
    echo "  - $table"
done

# Verify views were created
VIEWS=$(sqlite3 "$RISK_DB_PATH" "SELECT name FROM sqlite_master WHERE type='view' ORDER BY name;")
if [ -n "$VIEWS" ]; then
    log "Views in database:"
    echo "$VIEWS" | while read -r view; do
        echo "  - $view"
    done
fi

# Insert initial baseline metrics if baselines table is empty
BASELINE_COUNT=$(sqlite3 "$RISK_DB_PATH" "SELECT COUNT(*) FROM baselines;")
if [ "$BASELINE_COUNT" = "0" ]; then
    log "Inserting initial baseline metrics..."
    sqlite3 "$RISK_DB_PATH" <<EOF
INSERT INTO baselines (metric_name, metric_value, unit, context) VALUES
  ('drift_detection_latency_ms', 0, 'milliseconds', '{"note": "baseline_tbd"}'),
  ('false_positive_rate', 0, 'percentage', '{"note": "baseline_tbd"}'),
  ('swarm_scale_up_time_ms', 0, 'milliseconds', '{"note": "baseline_tbd"}'),
  ('conceptnet_cache_hit_rate', 0, 'percentage', '{"note": "baseline_tbd"}'),
  ('snn_inference_time_ms', 0, 'milliseconds', '{"note": "baseline_tbd"}'),
  ('risk_db_query_time_ms', 0, 'milliseconds', '{"note": "baseline_tbd"}');
EOF
    log "Initial baselines created (values set to 0 pending measurement)"
fi

# Create environment file if it doesn't exist
ENV_FILE="${PROJECT_ROOT}/.env"
if [ ! -f "$ENV_FILE" ]; then
    warn "No .env file found. Creating template..."
    cat > "$ENV_FILE" <<EOF
# Risk Database Configuration
RISK_DB_PATH=${RISK_DB_PATH}

# ProcessGovernor Learning Bridge
AF_LEARNING_BRIDGE_ENABLED=true
AF_LEARNING_BRIDGE_PATH=${PROJECT_ROOT}/scripts/agentdb/process_governor_ingest.js

# E2B Sandbox Configuration (for swarm orchestration)
E2B_API_KEY=your_e2b_api_key_here

# ConceptNet Configuration
CONCEPTNET_CACHE_ENABLED=true
CONCEPTNET_CACHE_TTL=86400

# Drift Detection Configuration
DRIFT_DETECTION_ENABLED=true
DRIFT_THRESHOLD=0.15
DRIFT_CHECK_INTERVAL_MS=300000

# Swarm Orchestration Configuration
SWARM_MAX_AGENTS=10
SWARM_SCALE_THRESHOLD=0.7
EOF
    log "Created .env template. Please update with actual values."
else
    # Check if RISK_DB_PATH is already in .env
    if ! grep -q "RISK_DB_PATH" "$ENV_FILE"; then
        log "Adding RISK_DB_PATH to existing .env"
        echo "" >> "$ENV_FILE"
        echo "# Risk Database Configuration" >> "$ENV_FILE"
        echo "RISK_DB_PATH=${RISK_DB_PATH}" >> "$ENV_FILE"
    fi
fi

# Database statistics
DB_SIZE=$(du -h "$RISK_DB_PATH" | cut -f1)
log "Database size: $DB_SIZE"

# Success message
log "Risk database initialization complete!"
log "Database location: $RISK_DB_PATH"
log "Schema version: $(date +%Y%m%d)"
echo ""
log "Next steps:"
echo "  1. Update .env with your E2B_API_KEY"
echo "  2. Run: npm run test:drift (to verify drift detection)"
echo "  3. Run: npm run benchmark (to establish baselines)"
echo "  4. Query high-priority risks: sqlite3 $RISK_DB_PATH 'SELECT * FROM high_priority_risks;'"
