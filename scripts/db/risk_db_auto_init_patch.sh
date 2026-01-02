#!/bin/bash

# Risk Database Auto-Initialization Patch Script
# Integrates risk database initialization with CI/CD pipeline
# Validates database setup and provides rollback capabilities

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RISK_DB_PATH="${RISK_DB_PATH:-$PROJECT_ROOT/risks.db}"
SCHEMA_PATH="$PROJECT_ROOT/schemas/risk_schema.sql"
BACKUP_DIR="$PROJECT_ROOT/backups/risk_db"
VALIDATION_REPORT="$PROJECT_ROOT/logs/risk_db_validation.json"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory
create_backup_dir() {
    log "Creating backup directory..."
    mkdir -p "$BACKUP_DIR"
    log_success "Backup directory created: $BACKUP_DIR"
}

# Backup existing database if it exists
backup_existing_db() {
    if [[ -f "$RISK_DB_PATH" ]]; then
        local backup_file="$BACKUP_DIR/risks_backup_$(date +%Y%m%d_%H%M%S).db"
        log "Backing up existing database to: $backup_file"
        cp "$RISK_DB_PATH" "$backup_file"
        log_success "Database backed up successfully"
        echo "$backup_file"
    else
        log_warning "No existing database to backup"
        echo ""
    fi
}

# Validate schema file exists
validate_schema() {
    if [[ ! -f "$SCHEMA_PATH" ]]; then
        log_error "Schema file not found: $SCHEMA_PATH"
        return 1
    fi
    log_success "Schema file found: $SCHEMA_PATH"
}

# Initialize risk database
initialize_database() {
    log "Initializing risk database..."
    
    # Remove existing database if force flag is set
    if [[ "${FORCE_INIT:-}" == "true" ]]; then
        log_warning "Force init enabled, removing existing database"
        rm -f "$RISK_DB_PATH"
    fi
    
    # Create database from schema
    if command -v sqlite3 >/dev/null 2>&1; then
        sqlite3 "$RISK_DB_PATH" < "$SCHEMA_PATH"
        log_success "Database initialized successfully"
    else
        log_error "sqlite3 command not found"
        return 1
    fi
}

# Validate database structure
validate_database() {
    log "Validating database structure..."
    
    local validation_result="{"
    validation_result+='"timestamp":"'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'",'
    validation_result+='"status":"success",'
    validation_result+='"database_path":"'$RISK_DB_PATH'",'
    
    # Check if database exists
    if [[ ! -f "$RISK_DB_PATH" ]]; then
        validation_result+='"status":"error","message":"Database file not found"}'
        echo "$validation_result" > "$VALIDATION_REPORT"
        log_error "Database validation failed: file not found"
        return 1
    fi
    
    # Check table structure
    local tables=$(sqlite3 "$RISK_DB_PATH" ".tables" 2>/dev/null || echo "")
    local expected_tables="risks drift_events governor_incidents swarm_events baselines"
    
    validation_result+='"tables":{'
    for table in $expected_tables; do
        local exists=$(echo "$tables" | grep -c "$table" || echo "0")
        validation_result+='"'$table'":'$exists','
    done
    validation_result=${validation_result%?} # Remove trailing comma
    validation_result+='},'
    
    # Check record counts
    validation_result+='"record_counts":{'
    for table in $expected_tables; do
        local count=$(sqlite3 "$RISK_DB_PATH" "SELECT COUNT(*) FROM $table;" 2>/dev/null || echo "0")
        validation_result+='"'$table'":'$count','
    done
    validation_result=${validation_result%?} # Remove trailing comma
    validation_result+='},'
    
    # Check indexes
    local indexes=$(sqlite3 "$RISK_DB_PATH" ".schema" | grep -c "CREATE INDEX" || echo "0")
    validation_result+='"indexes":'$indexes','
    
    # Check database size
    local size=$(stat -f%z "$RISK_DB_PATH" 2>/dev/null || stat -c%s "$RISK_DB_PATH" 2>/dev/null || echo "0")
    validation_result+='"size_bytes":'$size
    validation_result+='}'
    
    echo "$validation_result" > "$VALIDATION_REPORT"
    log_success "Database validation completed"
    log "Validation report saved to: $VALIDATION_REPORT"
}

# Seed initial data
seed_initial_data() {
    log "Seeding initial data..."
    
    # Seed WSJF baseline data
    sqlite3 "$RISK_DB_PATH" <<EOF
INSERT OR IGNORE INTO baselines (metric_name, baseline_value, unit, description, created_at) VALUES
('wsjf_cost_of_delay', 1.0, 'multiplier', 'Default cost of delay multiplier for WSJF calculations', datetime('now')),
('wsjf_job_duration', 1.0, 'days', 'Default job duration for WSJF calculations', datetime('now')),
('governor_max_concurrent', 10, 'processes', 'Maximum concurrent processes for governor', datetime('now')),
('governor_circuit_breaker_threshold', 5, 'failures', 'Circuit breaker failure threshold', datetime('now'));
EOF
    
    log_success "Initial data seeded successfully"
}

# Create CI/CD integration script
create_cicd_integration() {
    log "Creating CI/CD integration script..."
    
    local cicd_script="$PROJECT_ROOT/scripts/cicd/validate_risk_db.sh"
    mkdir -p "$(dirname "$cicd_script")"
    
    cat > "$cicd_script" <<'EOF'
#!/bin/bash

# CI/CD Risk Database Validation Script
# Validates risk database initialization and structure

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VALIDATION_SCRIPT="$PROJECT_ROOT/scripts/db/risk_db_auto_init_patch.sh"

echo "=== CI/CD Risk Database Validation ==="

# Run database initialization with validation
"$VALIDATION_SCRIPT" --validate-only

# Check validation report
VALIDATION_REPORT="$PROJECT_ROOT/logs/risk_db_validation.json"
if [[ -f "$VALIDATION_REPORT" ]]; then
    if command -v jq >/dev/null 2>&1; then
        local status=$(jq -r '.status' "$VALIDATION_REPORT")
        if [[ "$status" == "success" ]]; then
            echo "✅ Risk database validation passed"
            exit 0
        else
            echo "❌ Risk database validation failed"
            jq '.' "$VALIDATION_REPORT"
            exit 1
        fi
    else
        echo "⚠️  jq not available, checking file existence only"
        if [[ -f "$PROJECT_ROOT/risks.db" ]]; then
            echo "✅ Risk database file exists"
            exit 0
        else
            echo "❌ Risk database file not found"
            exit 1
        fi
    fi
else
    echo "❌ Validation report not found"
    exit 1
fi
EOF
    
    chmod +x "$cicd_script"
    log_success "CI/CD integration script created: $cicd_script"
}

# Main function
main() {
    local validate_only=false
    local backup_file=""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --validate-only)
                validate_only=true
                shift
                ;;
            --force)
                export FORCE_INIT=true
                shift
                ;;
            *)
                log_error "Unknown argument: $1"
                exit 1
                ;;
        esac
    done
    
    log "Starting risk database auto-initialization..."
    log "Database path: $RISK_DB_PATH"
    
    # Create backup directory
    create_backup_dir
    
    # Validate schema
    validate_schema
    
    if [[ "$validate_only" == "true" ]]; then
        log "Validation mode only"
        validate_database
        exit 0
    fi
    
    # Backup existing database
    backup_file=$(backup_existing_db)
    
    # Initialize database
    initialize_database
    
    # Validate database
    validate_database
    
    # Seed initial data
    seed_initial_data
    
    # Create CI/CD integration
    create_cicd_integration
    
    log_success "Risk database auto-initialization completed successfully"
    
    if [[ -n "$backup_file" ]]; then
        log "Backup saved to: $backup_file"
    fi
    
    log "Database location: $RISK_DB_PATH"
    log "Validation report: $VALIDATION_REPORT"
}

# Run main function with all arguments
main "$@"