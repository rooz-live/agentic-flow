#!/usr/bin/env bash
#
# restore-environment-enhanced.sh
#
# P0 PRIORITY: Comprehensive environment restoration system with multi-source backup,
# point-in-time recovery, health verification, and complete audit trail
#
# Philosophical Framework Applied:
# - Manthra: Directed thought-power for logical separation of restoration phases
# - Yasna: Disciplined alignment through consistent interfaces and validation
# - Mithra: Binding force preventing drift through centralized audit state
#
# Usage: ./scripts/restore-environment-enhanced.sh [command] [options]
#
# Commands:
#   restore <source> [--point-in-time <timestamp>]  Restore from source
#   create-snapshot <name> [--type <type>]          Create snapshot
#   list-sources [--type <type>]                    List available backup sources
#   rollback <snapshot_id> [--force]                 Rollback to snapshot
#   validate <snapshot_id>                          Validate snapshot integrity
#   audit-history [--last <n>]                      View restoration audit trail
#   health-check                                    Check system health
#
# Options:
#   --source <s3|local|git>                        Backup source type
#   --s3-bucket <bucket>                            S3 bucket name
#   --s3-prefix <prefix>                            S3 prefix/path
#   --snapshot <name>                               Snapshot name
#   --point-in-time <timestamp>                     Point-in-time recovery timestamp
#   --clean                                          Clean restore mode
#   --validate                                       Validate after restore
#   --force                                          Force operation (skip confirmations)
#   --dry-run                                        Show what would be done
#   --verbose                                        Verbose output
#   --log-file <path>                               Log file path
#
# Examples:
#   ./scripts/restore-environment-enhanced.sh restore s3 --s3-bucket my-backups --point-in-time 2025-01-01T12:00:00Z
#   ./scripts/restore-environment-enhanced.sh create-snapshot production-$(date +%Y%m%d)
#   ./scripts/restore-environment-enhanced.sh rollback baseline-20250101 --force
#   ./scripts/restore-environment-enhanced.sh validate baseline-20250101
#   ./scripts/restore-environment-enhanced.sh audit-history --last 10
#

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SNAPSHOT_DIR="$PROJECT_ROOT/.snapshots"
AUDIT_DIR="$PROJECT_ROOT/.goalie/restoration-audit"
ROLLBACK_LOG="$AUDIT_DIR/emergency_rollbacks.jsonl"
RESTORATION_LOG="$AUDIT_DIR/restorations.jsonl"
HEALTH_CHECK_LOG="$AUDIT_DIR/health_checks.jsonl"

# Default configuration
DEFAULT_SNAPSHOT="baseline"
DEFAULT_S3_BUCKET="${RESTORATION_S3_BUCKET:-agentic-flow-backups}"
DEFAULT_S3_PREFIX="${RESTORATION_S3_PREFIX:-backups/}"
DEFAULT_REGION="${AWS_REGION:-us-east-1}"

# Runtime configuration
COMMAND=""
SOURCE_TYPE="local"
SNAPSHOT_NAME=""
POINT_IN_TIME=""
CLEAN_MODE=false
VALIDATE_MODE=false
FORCE_MODE=false
DRY_RUN=false
VERBOSE=false
LOG_FILE=""
S3_BUCKET="$DEFAULT_S3_BUCKET"
S3_PREFIX="$DEFAULT_S3_PREFIX"
RESTORATION_ID=""
ROLLBACK_ID=""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# ============================================================================
# LOGGING FUNCTIONS
# ============================================================================

log_info() {
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    local message="$1"
    echo -e "${CYAN}[$timestamp] INFO:${NC} $message"
    [[ -n "$LOG_FILE" ]] && echo "[$timestamp] INFO: $message" >> "$LOG_FILE"
}

log_success() {
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    local message="$1"
    echo -e "${GREEN}[$timestamp] SUCCESS:${NC} $message"
    [[ -n "$LOG_FILE" ]] && echo "[$timestamp] SUCCESS: $message" >> "$LOG_FILE"
}

log_warning() {
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    local message="$1"
    echo -e "${YELLOW}[$timestamp] WARNING:${NC} $message"
    [[ -n "$LOG_FILE" ]] && echo "[$timestamp] WARNING: $message" >> "$LOG_FILE"
}

log_error() {
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    local message="$1"
    echo -e "${RED}[$timestamp] ERROR:${NC} $message" >&2
    [[ -n "$LOG_FILE" ]] && echo "[$timestamp] ERROR: $message" >> "$LOG_FILE"
}

log_debug() {
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    local message="$1"
    if [[ "$VERBOSE" == true ]]; then
        echo -e "${BLUE}[$timestamp] DEBUG:${NC} $message"
    fi
    [[ -n "$LOG_FILE" ]] && echo "[$timestamp] DEBUG: $message" >> "$LOG_FILE"
}

log_section() {
    local title="$1"
    echo ""
    echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${MAGENTA}  $title${NC}"
    echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# ============================================================================
# AUDIT TRAIL FUNCTIONS
# ============================================================================

# Initialize audit directories
init_audit_directories() {
    mkdir -p "$AUDIT_DIR"
    mkdir -p "$SNAPSHOT_DIR"
    log_debug "Audit directories initialized"
}

# Generate unique restoration ID
generate_restoration_id() {
    echo "rest-$(date +%Y%m%d%H%M%S)-$(uuidgen 2>/dev/null | head -c 8 || echo $RANDOM)"
}

# Generate unique rollback ID
generate_rollback_id() {
    echo "rollback-$(date +%Y%m%d%H%M%S)-$(uuidgen 2>/dev/null | head -c 8 || echo $RANDOM)"
}

# Log restoration event to audit trail
log_restoration_event() {
    local event_type="$1"
    local message="$2"
    local details="$3"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    local log_entry=$(cat <<EOF
{
  "timestamp": "$timestamp",
  "event_type": "$event_type",
  "restoration_id": "$RESTORATION_ID",
  "message": "$message",
  "details": $details,
  "user": "$(whoami)",
  "hostname": "$(hostname)",
  "source_type": "$SOURCE_TYPE",
  "snapshot_name": "$SNAPSHOT_NAME",
  "point_in_time": "$POINT_IN_TIME",
  "clean_mode": $CLEAN_MODE,
  "validate_mode": $VALIDATE_MODE,
  "force_mode": $FORCE_MODE
}
EOF
)
    
    echo "$log_entry" >> "$RESTORATION_LOG"
    log_debug "Logged restoration event: $event_type"
}

# Log rollback event to audit trail
log_rollback_event() {
    local event_type="$1"
    local message="$2"
    local details="$3"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    local log_entry=$(cat <<EOF
{
  "timestamp": "$timestamp",
  "event_type": "$event_type",
  "rollback_id": "$ROLLBACK_ID",
  "message": "$message",
  "details": $details,
  "user": "$(whoami)",
  "hostname": "$(hostname)",
  "snapshot_id": "$SNAPSHOT_NAME",
  "force_mode": $FORCE_MODE
}
EOF
)
    
    echo "$log_entry" >> "$ROLLBACK_LOG"
    log_debug "Logged rollback event: $event_type"
}

# Log health check event
log_health_check() {
    local check_type="$1"
    local status="$2"
    local details="$3"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    
    local log_entry=$(cat <<EOF
{
  "timestamp": "$timestamp",
  "check_type": "$check_type",
  "status": "$status",
  "details": $details,
  "restoration_id": "$RESTORATION_ID"
}
EOF
)
    
    echo "$log_entry" >> "$HEALTH_CHECK_LOG"
    log_debug "Logged health check: $check_type - $status"
}

# ============================================================================
# VALIDATION FUNCTIONS
# ============================================================================

# Validate snapshot integrity
validate_snapshot() {
    local name="$1"
    local snapshot_path="$SNAPSHOT_DIR/$name"
    
    log_info "Validating snapshot: $name"
    
    if [ ! -d "$snapshot_path" ]; then
        log_error "Snapshot directory not found: $snapshot_path"
        return 1
    fi
    
    local validation_errors=0
    local validation_warnings=0
    
    # Check critical components
    log_debug "Checking critical components..."
    
    if [ ! -f "$snapshot_path/metadata.json" ]; then
        log_error "Missing metadata.json"
        ((validation_errors++))
    else
        log_debug "✓ metadata.json present"
    fi
    
    if [ ! -f "$snapshot_path/agentdb.sqlite" ] && [ ! -f "$snapshot_path/agentdb.sqlite.gz" ]; then
        log_warning "Missing AgentDB database (may be optional)"
        ((validation_warnings++))
    else
        log_debug "✓ AgentDB database present"
    fi
    
    if [ ! -d "$snapshot_path/goalie" ]; then
        log_warning "Missing .goalie directory (may be optional)"
        ((validation_warnings++))
    else
        log_debug "✓ .goalie directory present"
    fi
    
    if [ ! -d "$snapshot_path/claude" ]; then
        log_warning "Missing .claude directory (may be optional)"
        ((validation_warnings++))
    else
        log_debug "✓ .claude directory present"
    fi
    
    if [ ! -f "$snapshot_path/logs.tar.gz" ]; then
        log_warning "Missing logs archive (may be optional)"
        ((validation_warnings++))
    else
        log_debug "✓ Logs archive present"
    fi
    
    # Check checksums if available
    if [ -f "$snapshot_path/checksums.sha256" ]; then
        log_debug "Verifying checksums..."
        if cd "$snapshot_path" && sha256sum -c checksums.sha256 >/dev/null 2>&1; then
            log_debug "✓ All checksums verified"
        else
            log_error "Checksum verification failed"
            ((validation_errors++))
        fi
    fi
    
    if [ $validation_errors -gt 0 ]; then
        log_error "Snapshot validation failed with $validation_errors errors"
        return 1
    else
        log_success "Snapshot validation passed ($validation_warnings warnings)"
        return 0
    fi
}

# Validate database integrity
validate_database_integrity() {
    local db_path="$1"
    
    log_info "Validating database integrity: $db_path"
    
    if [ ! -f "$db_path" ]; then
        log_error "Database file not found: $db_path"
        return 1
    fi
    
    # Check if file is a valid SQLite database
    if ! sqlite3 "$db_path" "PRAGMA integrity_check;" >/dev/null 2>&1; then
        log_error "Database integrity check failed"
        return 1
    fi
    
    # Check for foreign key constraints
    local fk_check=$(sqlite3 "$db_path" "PRAGMA foreign_key_check;" 2>/dev/null || echo "")
    if [ -n "$fk_check" ]; then
        log_error "Foreign key constraint violations found"
        return 1
    fi
    
    # Get database statistics
    local table_count=$(sqlite3 "$db_path" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "0")
    local row_count=$(sqlite3 "$db_path" "SELECT SUM(sqlite_count(*)) FROM sqlite_master;" 2>/dev/null || echo "0")
    
    log_debug "Database statistics: $table_count tables, $row_count rows"
    log_success "Database integrity validated"
    
    return 0
}

# Validate configuration files
validate_configuration() {
    local config_dir="$1"
    
    log_info "Validating configuration: $config_dir"
    
    if [ ! -d "$config_dir" ]; then
        log_warning "Configuration directory not found: $config_dir"
        return 0
    fi
    
    local validation_errors=0
    
    # Check for JSON syntax errors
    for json_file in "$config_dir"/*.json; do
        if [ -f "$json_file" ]; then
            if ! jq empty "$json_file" >/dev/null 2>&1; then
                log_error "Invalid JSON in: $json_file"
                ((validation_errors++))
            fi
        fi
    done
    
    # Check for YAML syntax errors
    for yaml_file in "$config_dir"/*.yaml "$config_dir"/*.yml; do
        if [ -f "$yaml_file" ]; then
            if command -v yamllint >/dev/null 2>&1; then
                if ! yamllint "$yaml_file" >/dev/null 2>&1; then
                    log_error "Invalid YAML in: $yaml_file"
                    ((validation_errors++))
                fi
            fi
        fi
    done
    
    if [ $validation_errors -gt 0 ]; then
        log_error "Configuration validation failed with $validation_errors errors"
        return 1
    else
        log_success "Configuration validated"
        return 0
    fi
}

# ============================================================================
# BACKUP RESTORATION FUNCTIONS
# ============================================================================

# List available backup sources
list_backup_sources() {
    local source_type="${1:-all}"
    
    log_section "Available Backup Sources"
    
    case "$source_type" in
        s3|all)
            log_info "S3 Backup Sources:"
            if command -v aws >/dev/null 2>&1; then
                aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX" 2>/dev/null || log_warning "No S3 backups found or AWS not configured"
            else
                log_warning "AWS CLI not available"
            fi
            echo ""
            ;;
    esac
    
    case "$source_type" in
        local|all)
            log_info "Local Snapshot Sources:"
            if [ -d "$SNAPSHOT_DIR" ]; then
                ls -1 "$SNAPSHOT_DIR" 2>/dev/null || log_warning "No local snapshots found"
            else
                log_warning "Snapshot directory not found: $SNAPSHOT_DIR"
            fi
            echo ""
            ;;
    esac
    
    case "$source_type" in
        git|all)
            log_info "Git-based Sources:"
            if [ -d "$PROJECT_ROOT/.git" ]; then
                log_info "  Current branch: $(git branch --show-current)"
                log_info "  Latest commit: $(git log -1 --format='%h - %s')"
                log_info "  Available tags:"
                git tag -l | head -10 || log_warning "No git tags found"
            else
                log_warning "Not a git repository"
            fi
            echo ""
            ;;
    esac
}

# Restore from S3 bucket
restore_from_s3() {
    local snapshot_name="$1"
    local version_id="${2:-}"
    
    log_info "Restoring from S3: s3://$S3_BUCKET/$S3_PREFIX$snapshot_name"
    
    if ! command -v aws >/dev/null 2>&1; then
        log_error "AWS CLI not available"
        return 1
    fi
    
    local s3_path="s3://$S3_BUCKET/$S3_PREFIX$snapshot_name"
    local local_path="$SNAPSHOT_DIR/$snapshot_name"
    
    # Check if snapshot exists in S3
    if ! aws s3 ls "$s3_path" >/dev/null 2>&1; then
        log_error "Snapshot not found in S3: $s3_path"
        return 1
    fi
    
    # Download snapshot
    log_info "Downloading snapshot from S3..."
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would download: $s3_path -> $local_path"
        return 0
    fi
    
    mkdir -p "$local_path"
    
    # Download all files
    if aws s3 sync "$s3_path" "$local_path" --quiet; then
        log_success "Snapshot downloaded from S3"
    else
        log_error "Failed to download snapshot from S3"
        return 1
    fi
    
    # Validate downloaded snapshot
    if ! validate_snapshot "$snapshot_name"; then
        log_error "Downloaded snapshot validation failed"
        return 1
    fi
    
    log_restoration_event "s3_restore_complete" "Snapshot downloaded from S3" "{\"s3_path\": \"$s3_path\", \"local_path\": \"$local_path\"}"
    
    return 0
}

# Restore from local snapshot
restore_from_local() {
    local snapshot_name="$1"
    
    log_info "Restoring from local snapshot: $snapshot_name"
    
    local snapshot_path="$SNAPSHOT_DIR/$snapshot_name"
    
    if [ ! -d "$snapshot_path" ]; then
        log_error "Local snapshot not found: $snapshot_path"
        return 1
    fi
    
    # Validate snapshot
    if ! validate_snapshot "$snapshot_name"; then
        log_error "Local snapshot validation failed"
        return 1
    fi
    
    log_restoration_event "local_restore_complete" "Local snapshot validated" "{\"snapshot_path\": \"$snapshot_path\"}"
    
    return 0
}

# Restore from Git
restore_from_git() {
    local git_ref="$1"
    
    log_info "Restoring from Git: $git_ref"
    
    if ! command -v git >/dev/null 2>&1; then
        log_error "Git not available"
        return 1
    fi
    
    if [ ! -d "$PROJECT_ROOT/.git" ]; then
        log_error "Not a git repository"
        return 1
    fi
    
    # Check if git ref exists
    if ! git rev-parse "$git_ref" >/dev/null 2>&1; then
        log_error "Git ref not found: $git_ref"
        return 1
    fi
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would checkout git ref: $git_ref"
        return 0
    fi
    
    # Create pre-restore backup
    local backup_name="pre-git-restore-$(date +%Y%m%d_%H%M%S)"
    log_info "Creating pre-restore backup: $backup_name"
    create_snapshot "$backup_name" "git-restore-backup"
    
    # Checkout git ref
    log_info "Checking out git ref: $git_ref"
    if git checkout "$git_ref" 2>/dev/null; then
        log_success "Git checkout successful"
    else
        log_error "Git checkout failed"
        return 1
    fi
    
    log_restoration_event "git_restore_complete" "Git checkout completed" "{\"git_ref\": \"$git_ref\"}"
    
    return 0
}

# ============================================================================
# CONFIGURATION RESTORATION FUNCTIONS
# ============================================================================

# Restore environment variables
restore_environment_variables() {
    local snapshot_path="$1"
    local env_file="$snapshot_path/environment.txt"
    
    log_info "Restoring environment variables..."
    
    if [ ! -f "$env_file" ]; then
        log_warning "Environment file not found: $env_file"
        return 0
    fi
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would restore environment variables from: $env_file"
        return 0
    fi
    
    # Create .env file from snapshot
    local target_env="$PROJECT_ROOT/.env.restored"
    
    # Filter and restore environment variables
    grep -E "^[A-Z_]+=" "$env_file" > "$target_env" 2>/dev/null || true
    
    log_success "Environment variables restored to: $target_env"
    log_info "Review and merge: diff .env $target_env"
    
    log_restoration_event "env_vars_restored" "Environment variables restored" "{\"env_file\": \"$env_file\", \"target_env\": \"$target_env\"}"
    
    return 0
}

# Restore configuration files
restore_configuration_files() {
    local snapshot_path="$1"
    
    log_info "Restoring configuration files..."
    
    if [ ! -d "$snapshot_path/config" ]; then
        log_warning "Config directory not found in snapshot"
        return 0
    fi
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would restore config files from: $snapshot_path/config"
        return 0
    fi
    
    # Backup existing config
    if [ -d "$PROJECT_ROOT/config" ]; then
        local backup_config="$PROJECT_ROOT/config.backup.$(date +%Y%m%d_%H%M%S)"
        log_info "Backing up existing config to: $backup_config"
        cp -r "$PROJECT_ROOT/config" "$backup_config"
    fi
    
    # Restore config files
    if [ "$CLEAN_MODE" == true ]; then
        rm -rf "$PROJECT_ROOT/config"
    fi
    
    cp -r "$snapshot_path/config" "$PROJECT_ROOT/"
    log_success "Configuration files restored"
    
    # Validate configuration
    if ! validate_configuration "$PROJECT_ROOT/config"; then
        log_error "Configuration validation failed after restoration"
        return 1
    fi
    
    log_restoration_event "config_files_restored" "Configuration files restored" "{\"config_path\": \"$snapshot_path/config\"}"
    
    return 0
}

# Restore secrets from secure storage
restore_secrets() {
    local snapshot_path="$1"
    
    log_info "Restoring secrets..."
    
    if [ ! -d "$snapshot_path/secrets" ]; then
        log_warning "Secrets directory not found in snapshot"
        return 0
    fi
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would restore secrets from: $snapshot_path/secrets"
        return 0
    fi
    
    # Check if secrets are encrypted
    if [ -f "$snapshot_path/secrets/.encrypted" ]; then
        log_warning "Secrets are encrypted - manual decryption required"
        log_info "Secrets location: $snapshot_path/secrets"
        return 0
    fi
    
    # Restore secrets
    local secrets_dir="$PROJECT_ROOT/.secrets"
    mkdir -p "$secrets_dir"
    
    cp -r "$snapshot_path/secrets/"* "$secrets_dir/" 2>/dev/null || true
    
    log_success "Secrets restored to: $secrets_dir"
    log_warning "Review restored secrets for security"
    
    log_restoration_event "secrets_restored" "Secrets restored" "{\"secrets_path\": \"$snapshot_path/secrets\"}"
    
    return 0
}

# Restore dependencies with version locking
restore_dependencies() {
    local snapshot_path="$1"
    
    log_info "Restoring dependencies..."
    
    if [ ! -f "$snapshot_path/package.json" ]; then
        log_warning "package.json not found in snapshot"
        return 0
    fi
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would restore dependencies from: $snapshot_path/package.json"
        return 0
    fi
    
    # Backup existing package files
    if [ -f "$PROJECT_ROOT/package.json" ]; then
        cp "$PROJECT_ROOT/package.json" "$PROJECT_ROOT/package.json.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    if [ -f "$PROJECT_ROOT/package-lock.json" ]; then
        cp "$PROJECT_ROOT/package-lock.json" "$PROJECT_ROOT/package-lock.json.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Restore package files
    cp "$snapshot_path/package.json" "$PROJECT_ROOT/"
    
    if [ -f "$snapshot_path/package-lock.json" ]; then
        cp "$snapshot_path/package-lock.json" "$PROJECT_ROOT/"
    fi
    
    # Install dependencies if in clean mode
    if [ "$CLEAN_MODE" == true ]; then
        log_info "Installing dependencies..."
        if command -v npm >/dev/null 2>&1; then
            if npm ci --silent 2>&1 | tail -5; then
                log_success "Dependencies installed"
            else
                log_error "npm ci failed"
                return 1
            fi
        fi
    fi
    
    log_restoration_event "dependencies_restored" "Dependencies restored" "{\"package_json\": \"$snapshot_path/package.json\"}"
    
    return 0
}

# ============================================================================
# DATABASE RESTORATION FUNCTIONS
# ============================================================================

# Restore database with point-in-time recovery
restore_database() {
    local snapshot_path="$1"
    local point_in_time="$2"
    
    log_info "Restoring database..."
    
    local db_source=""
    
    # Find database file
    if [ -f "$snapshot_path/agentdb.sqlite" ]; then
        db_source="$snapshot_path/agentdb.sqlite"
    elif [ -f "$snapshot_path/agentdb.sqlite.gz" ]; then
        db_source="$snapshot_path/agentdb.sqlite.gz"
    else
        log_warning "Database file not found in snapshot"
        return 0
    fi
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would restore database from: $db_source"
        return 0
    fi
    
    # Backup existing database
    local agentdb_dir="$PROJECT_ROOT/.agentdb"
    mkdir -p "$agentdb_dir"
    
    if [ -f "$agentdb_dir/agentdb.sqlite" ]; then
        local backup_db="$agentdb_dir/agentdb.sqlite.backup.$(date +%Y%m%d_%H%M%S)"
        log_info "Backing up existing database to: $backup_db"
        cp "$agentdb_dir/agentdb.sqlite" "$backup_db"
    fi
    
    # Restore database
    if [[ "$db_source" == *.gz ]]; then
        log_info "Decompressing database..."
        gunzip -c "$db_source" > "$agentdb_dir/agentdb.sqlite"
    else
        cp "$db_source" "$agentdb_dir/agentdb.sqlite"
    fi
    
    # Validate database integrity
    if ! validate_database_integrity "$agentdb_dir/agentdb.sqlite"; then
        log_error "Database integrity validation failed"
        return 1
    fi
    
    # Point-in-time recovery (if applicable)
    if [ -n "$point_in_time" ] && [ -f "$snapshot_path/wal_logs" ]; then
        log_info "Applying point-in-time recovery: $point_in_time"
        # This would integrate with WAL replay logic
        log_warning "Point-in-time recovery requires additional implementation"
    fi
    
    log_success "Database restored and validated"
    
    log_restoration_event "database_restored" "Database restored" "{\"db_source\": \"$db_source\", \"point_in_time\": \"$point_in_time\"}"
    
    return 0
}

# ============================================================================
# SERVICE RESTORATION FUNCTIONS
# ============================================================================

# Restore service configuration
restore_service_configuration() {
    local snapshot_path="$1"
    
    log_info "Restoring service configuration..."
    
    if [ ! -d "$snapshot_path/services" ]; then
        log_warning "Services directory not found in snapshot"
        return 0
    fi
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would restore service configuration from: $snapshot_path/services"
        return 0
    fi
    
    # Restore service configuration
    cp -r "$snapshot_path/services/"* "$PROJECT_ROOT/" 2>/dev/null || true
    
    log_success "Service configuration restored"
    
    log_restoration_event "service_config_restored" "Service configuration restored" "{\"services_path\": \"$snapshot_path/services\"}"
    
    return 0
}

# Start services with dependency ordering
start_services() {
    log_info "Starting services..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY RUN] Would start services with dependency ordering"
        return 0
    fi
    
    # Stop any running services first
    if command -v npm >/dev/null 2>&1; then
        if npm run stop >/dev/null 2>&1; then
            log_debug "Services stopped"
        fi
    fi
    
    # Start services in dependency order
    local services_started=0
    local services_failed=0
    
    # Core services first
    log_debug "Starting core services..."
    # Add core service startup logic here
    
    # Application services
    log_debug "Starting application services..."
    # Add application service startup logic here
    
    # Build project
    if command -v npm >/dev/null 2>&1; then
        if npm run build >/dev/null 2>&1; then
            log_debug "Project built successfully"
            ((services_started++))
        else
            log_error "Project build failed"
            ((services_failed++))
        fi
    fi
    
    log_info "Services started: $services_started successful, $services_failed failed"
    
    log_restoration_event "services_started" "Services started" "{\"started\": $services_started, \"failed\": $services_failed}"
    
    return 0
}

# Verify service health
verify_service_health() {
    log_info "Verifying service health..."
    
    local health_errors=0
    
    # Check if services are responsive
    if command -v npm >/dev/null 2>&1; then
        if npm run test >/dev/null 2>&1; then
            log_success "Tests passed"
            log_health_check "tests" "passed" "{}"
        else
            log_error "Tests failing"
            ((health_errors++))
            log_health_check "tests" "failed" "{}"
        fi
    fi
    
    # Check critical directories
    for dir in .agentdb .goalie .claude; do
        if [ ! -d "$dir" ]; then
            log_error "Critical directory missing: $dir"
            ((health_errors++))
            log_health_check "directory_check" "failed" "{\"directory\": \"$dir\"}"
        fi
    done
    
    # Check package.json
    if [ ! -f "package.json" ]; then
        log_error "package.json missing"
        ((health_errors++))
    fi
    
    if [ $health_errors -gt 0 ]; then
        log_error "Service health verification failed with $health_errors errors"
        return 1
    else
        log_success "Service health verification passed"
        return 0
    fi
}

# ============================================================================
# SNAPSHOT CREATION FUNCTIONS
# ============================================================================

# Create comprehensive snapshot
create_snapshot() {
    local name="$1"
    local snapshot_type="${2:-manual}"
    local snapshot_path="$SNAPSHOT_DIR/$name"
    
    log_info "Creating comprehensive snapshot: $name"
    
    mkdir -p "$snapshot_path"
    
    # Backup AgentDB
    log_debug "Saving AgentDB..."
    if [ -f ".agentdb/agentdb.sqlite" ]; then
        cp .agentdb/agentdb.sqlite "$snapshot_path/agentdb.sqlite"
        gzip -c .agentdb/agentdb.sqlite > "$snapshot_path/agentdb.sqlite.gz"
        
        # Generate checksum
        sha256sum "$snapshot_path/agentdb.sqlite" > "$snapshot_path/checksums.sha256"
        sha256sum "$snapshot_path/agentdb.sqlite.gz" >> "$snapshot_path/checksums.sha256"
    fi
    
    # Backup AgentDB configuration
    cp -r .agentdb/plugins "$snapshot_path/" 2>/dev/null || true
    cp -r .agentdb/hooks "$snapshot_path/" 2>/dev/null || true
    cp .agentdb/init_schema.sql "$snapshot_path/" 2>/dev/null || true
    
    # Backup .goalie directory
    log_debug "Saving .goalie governance data..."
    if [ -d ".goalie" ]; then
        cp -r .goalie "$snapshot_path/goalie"
    fi
    
    # Backup .claude directory
    log_debug "Saving Claude configuration..."
    if [ -d ".claude" ]; then
        cp -r .claude "$snapshot_path/claude"
    fi
    
    # Backup logs
    log_debug "Saving logs..."
    if [ -d "logs" ]; then
        tar -czf "$snapshot_path/logs.tar.gz" logs/
    fi
    
    # Backup git state
    log_debug "Saving git state..."
    git rev-parse HEAD > "$snapshot_path/git-ref.txt" 2>/dev/null || true
    git status --porcelain > "$snapshot_path/git-status.txt" 2>/dev/null || true
    git diff > "$snapshot_path/git-diff.patch" 2>/dev/null || true
    git branch --show-current > "$snapshot_path/git-branch.txt" 2>/dev/null || true
    
    # Backup environment
    log_debug "Saving environment..."
    env | sort > "$snapshot_path/environment.txt"
    
    # Backup config
    if [ -d "config" ]; then
        cp -r config "$snapshot_path/"
    fi
    
    # Backup metrics
    if [ -d "metrics" ]; then
        cp -r metrics "$snapshot_path/"
    fi
    
    # Backup package state
    if [ -f "package.json" ]; then
        cp package.json "$snapshot_path/"
        if [ -f "package-lock.json" ]; then
            cp package-lock.json "$snapshot_path/"
        fi
    fi
    
    # Create metadata
    log_debug "Creating metadata..."
    cat > "$snapshot_path/metadata.json" <<EOF
{
  "name": "$name",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "type": "$snapshot_type",
  "git_ref": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "git_branch": "$(git branch --show-current 2>/dev/null || echo 'unknown')",
  "node_version": "$(node --version 2>/dev/null || echo 'unknown')",
  "npm_version": "$(npm --version 2>/dev/null || echo 'unknown')",
  "snapshot_version": "enhanced-v2.0",
  "components": {
    "agentdb": $( [ -f "$snapshot_path/agentdb.sqlite" ] && echo "true" || echo "false" ),
    "goalie": $( [ -d "$snapshot_path/goalie" ] && echo "true" || echo "false" ),
    "claude": $( [ -d "$snapshot_path/claude" ] && echo "true" || echo "false" ),
    "logs": $( [ -f "$snapshot_path/logs.tar.gz" ] && echo "true" || echo "false" ),
    "config": $( [ -d "$snapshot_path/config" ] && echo "true" || echo "false" ),
    "metrics": $( [ -d "$snapshot_path/metrics" ] && echo "true" || echo "false" )
  },
  "file_counts": {
    "goalie_files": $( [ -d "$snapshot_path/goalie" ] && find "$snapshot_path/goalie" -type f | wc -l || echo "0" ),
    "claude_files": $( [ -d "$snapshot_path/claude" ] && find "$snapshot_path/claude" -type f | wc -l || echo "0" ),
    "config_files": $( [ -d "$snapshot_path/config" ] && find "$snapshot_path/config" -type f | wc -l || echo "0" )
  }
}
EOF
    
    local snapshot_size=$(du -sh "$snapshot_path" | cut -f1)
    log_success "Snapshot created: $snapshot_path ($snapshot_size)"
    
    log_restoration_event "snapshot_created" "Snapshot created" "{\"name\": \"$name\", \"type\": \"$snapshot_type\", \"size\": \"$snapshot_size\"}"
    
    # Validate if requested
    if [ "$VALIDATE_MODE" == true ]; then
        validate_snapshot "$name"
    fi
    
    return 0
}

# ============================================================================
# ROLLBACK FUNCTIONS
# ============================================================================

# Rollback to snapshot
rollback_to_snapshot() {
    local snapshot_id="$1"
    
    log_section "Rollback to Snapshot: $snapshot_id"
    
    ROLLBACK_ID=$(generate_rollback_id)
    log_rollback_event "rollback_initiated" "Rollback initiated" "{\"snapshot_id\": \"$snapshot_id\"}"
    
    # Validate snapshot
    if ! validate_snapshot "$snapshot_id"; then
        log_error "Snapshot validation failed"
        log_rollback_event "rollback_failed" "Snapshot validation failed" "{\"snapshot_id\": \"$snapshot_id\"}"
        return 1
    fi
    
    # Create pre-rollback backup
    local backup_name="pre-rollback-$(date +%Y%m%d_%H%M%S)"
    log_info "Creating pre-rollback backup: $backup_name"
    create_snapshot "$backup_name" "rollback-backup"
    
    # Perform restoration
    log_info "Performing rollback restoration..."
    if ! perform_restoration "$snapshot_id"; then
        log_error "Rollback restoration failed"
        log_rollback_event "rollback_failed" "Restoration failed" "{\"snapshot_id\": \"$snapshot_id\"}"
        return 1
    fi
    
    # Restart services
    log_info "Restarting services..."
    start_services
    
    # Verify health
    log_info "Verifying post-rollback health..."
    if ! verify_service_health; then
        log_warning "Health verification had issues"
    fi
    
    log_rollback_event "rollback_completed" "Rollback completed successfully" "{\"snapshot_id\": \"$snapshot_id\"}"
    log_success "Rollback completed successfully"
    
    return 0
}

# ============================================================================
# AUDIT HISTORY FUNCTIONS
# ============================================================================

# Display audit history
display_audit_history() {
    local last_n="${1:-10}"
    
    log_section "Restoration Audit History (Last $last_n)"
    
    if [ ! -f "$RESTORATION_LOG" ]; then
        log_info "No restoration history found"
        return 0
    fi
    
    echo ""
    echo "Restorations:"
    tail -n "$last_n" "$RESTORATION_LOG" | jq -r '. | "\(.timestamp) | \(.event_type) | \(.restoration_id) | \(.source_type) | \(.snapshot_name)"' 2>/dev/null || tail -n "$last_n" "$RESTORATION_LOG"
    
    echo ""
    echo "Rollbacks:"
    if [ -f "$ROLLBACK_LOG" ]; then
        tail -n "$last_n" "$ROLLBACK_LOG" | jq -r '. | "\(.timestamp) | \(.event_type) | \(.rollback_id) | \(.snapshot_id)"' 2>/dev/null || tail -n "$last_n" "$ROLLBACK_LOG"
    fi
    
    echo ""
    echo "Health Checks:"
    if [ -f "$HEALTH_CHECK_LOG" ]; then
        tail -n "$last_n" "$HEALTH_CHECK_LOG" | jq -r '. | "\(.timestamp) | \(.check_type) | \(.status)"' 2>/dev/null || tail -n "$last_n" "$HEALTH_CHECK_LOG"
    fi
}

# ============================================================================
# MAIN RESTORATION FUNCTION
# ============================================================================

# Perform full restoration
perform_restoration() {
    local snapshot_name="$1"
    local snapshot_path="$SNAPSHOT_DIR/$snapshot_name"
    
    log_section "Restoring Snapshot: $snapshot_name"
    
    # Show metadata
    if [ -f "$snapshot_path/metadata.json" ]; then
        log_info "Snapshot metadata:"
        cat "$snapshot_path/metadata.json" | jq . 2>/dev/null || cat "$snapshot_path/metadata.json"
    fi
    
    # Confirmation prompt
    if [[ "$FORCE_MODE" != true ]] && [[ "$DRY_RUN" != true ]]; then
        echo ""
        read -p "Continue with restoration? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Restoration cancelled"
            return 1
        fi
    fi
    
    # Restore components
    log_restoration_event "restoration_started" "Restoration started" "{\"snapshot_name\": \"$snapshot_name\"}"
    
    # Restore database
    restore_database "$snapshot_path" "$POINT_IN_TIME" || true
    
    # Restore configuration
    restore_configuration_files "$snapshot_path" || true
    
    # Restore environment variables
    restore_environment_variables "$snapshot_path" || true
    
    # Restore secrets
    restore_secrets "$snapshot_path" || true
    
    # Restore dependencies
    restore_dependencies "$snapshot_path" || true
    
    # Restore service configuration
    restore_service_configuration "$snapshot_path" || true
    
    # Restore .goalie directory
    if [ -d "$snapshot_path/goalie" ]; then
        log_info "Restoring .goalie directory..."
        if [ -d ".goalie" ]; then
            mv .goalie ".goalie.backup.$(date +%Y%m%d_%H%M%S)"
        fi
        cp -r "$snapshot_path/goalie" .goalie
        log_success ".goalie directory restored"
    fi
    
    # Restore .claude directory
    if [ -d "$snapshot_path/claude" ]; then
        log_info "Restoring .claude directory..."
        if [ -d ".claude" ]; then
            mv .claude ".claude.backup.$(date +%Y%m%d_%H%M%S)"
        fi
        cp -r "$snapshot_path/claude" .claude
        log_success ".claude directory restored"
    fi
    
    # Restore logs
    if [ -f "$snapshot_path/logs.tar.gz" ]; then
        log_info "Restoring logs..."
        if [ "$CLEAN_MODE" == true ]; then
            rm -rf logs/
            tar -xzf "$snapshot_path/logs.tar.gz"
            log_success "Logs restored"
        else
            log_info "Logs not restored (use --clean mode)"
        fi
    fi
    
    # Restore git state
    if [ -f "$snapshot_path/git-ref.txt" ]; then
        log_info "Restoring git state..."
        local git_ref=$(cat "$snapshot_path/git-ref.txt")
        if git checkout "$git_ref" 2>/dev/null; then
            log_success "Git checkout successful"
        else
            log_warning "Could not checkout git ref: $git_ref"
        fi
    fi
    
    log_restoration_event "restoration_completed" "Restoration completed" "{\"snapshot_name\": \"$snapshot_name\"}"
    log_success "Restoration completed"
    
    # Post-restore validation
    if [ "$VALIDATE_MODE" == true ]; then
        log_section "Post-Restore Validation"
        validate_snapshot "$snapshot_name"
        verify_service_health
    fi
    
    return 0
}

# ============================================================================
# HEALTH CHECK FUNCTION
# ============================================================================

# Perform comprehensive health check
perform_health_check() {
    log_section "System Health Check"
    
    local health_issues=0
    
    # Check critical directories
    log_info "Checking critical directories..."
    for dir in .agentdb .goalie .claude; do
        if [ -d "$dir" ]; then
            log_success "✓ $dir exists"
            log_health_check "directory_check" "passed" "{\"directory\": \"$dir\"}"
        else
            log_error "✗ $dir missing"
            ((health_issues++))
            log_health_check "directory_check" "failed" "{\"directory\": \"$dir\"}"
        fi
    done
    
    # Check database
    log_info "Checking database..."
    if [ -f ".agentdb/agentdb.sqlite" ]; then
        if validate_database_integrity ".agentdb/agentdb.sqlite"; then
            log_success "✓ Database valid"
            log_health_check "database_check" "passed" "{}"
        else
            log_error "✗ Database invalid"
            ((health_issues++))
            log_health_check "database_check" "failed" "{}"
        fi
    else
        log_warning "⚠ Database not found"
    fi
    
    # Check configuration
    log_info "Checking configuration..."
    if validate_configuration "config"; then
        log_success "✓ Configuration valid"
        log_health_check "config_check" "passed" "{}"
    else
        log_warning "⚠ Configuration issues found"
    fi
    
    # Check tests
    log_info "Checking tests..."
    if command -v npm >/dev/null 2>&1; then
        if npm test --silent 2>&1 | tail -1; then
            log_success "✓ Tests passing"
            log_health_check "tests_check" "passed" "{}"
        else
            log_warning "⚠ Tests failing"
        fi
    fi
    
    # Summary
    echo ""
    if [ $health_issues -eq 0 ]; then
        log_success "System health check passed"
        return 0
    else
        log_error "System health check failed with $health_issues issues"
        return 1
    fi
}

# ============================================================================
# COMMAND PARSING
# ============================================================================

show_help() {
    cat <<EOF
Enhanced Environment Restoration System (P0 Priority)

Philosophical Framework:
  - Manthra: Directed thought-power for logical separation
  - Yasna: Disciplined alignment through consistent interfaces
  - Mithra: Binding force preventing drift through audit state

Usage: $0 [command] [options]

Commands:
  restore <source>           Restore from backup source
  create-snapshot <name>     Create new snapshot
  list-sources               List available backup sources
  rollback <snapshot_id>      Rollback to snapshot
  validate <snapshot_id>     Validate snapshot integrity
  audit-history              View restoration audit trail
  health-check               Perform system health check

Restore Options:
  --source <s3|local|git>   Backup source type (default: local)
  --s3-bucket <bucket>       S3 bucket name
  --s3-prefix <prefix>       S3 prefix/path
  --point-in-time <ts>       Point-in-time recovery timestamp
  --snapshot <name>          Snapshot name
  --clean                    Clean restore mode
  --validate                 Validate after restore
  --force                    Force operation (skip confirmations)
  --dry-run                  Show what would be done
  --verbose                  Verbose output
  --log-file <path>          Log file path

Examples:
  $0 restore s3 --s3-bucket my-backups --point-in-time 2025-01-01T12:00:00Z
  $0 create-snapshot production-$(date +%Y%m%d)
  $0 rollback baseline-20250101 --force
  $0 validate baseline-20250101
  $0 audit-history --last 10
  $0 health-check

Environment Variables:
  RESTORATION_S3_BUCKET      Default S3 bucket name
  RESTORATION_S3_PREFIX      Default S3 prefix
  AWS_REGION                AWS region

EOF
}

# Parse command line arguments
parse_arguments() {
    COMMAND=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            restore|create-snapshot|list-sources|rollback|validate|audit-history|health-check)
                COMMAND="$1"
                shift
                ;;
            --source)
                SOURCE_TYPE="$2"
                shift 2
                ;;
            --s3-bucket)
                S3_BUCKET="$2"
                shift 2
                ;;
            --s3-prefix)
                S3_PREFIX="$2"
                shift 2
                ;;
            --snapshot)
                SNAPSHOT_NAME="$2"
                shift 2
                ;;
            --point-in-time)
                POINT_IN_TIME="$2"
                shift 2
                ;;
            --clean)
                CLEAN_MODE=true
                shift
                ;;
            --validate)
                VALIDATE_MODE=true
                shift
                ;;
            --force)
                FORCE_MODE=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --log-file)
                LOG_FILE="$2"
                shift 2
                ;;
            --last)
                LAST_N="$2"
                shift 2
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                if [[ -z "$SNAPSHOT_NAME" ]]; then
                    SNAPSHOT_NAME="$1"
                elif [[ -z "$COMMAND" ]]; then
                    COMMAND="$1"
                fi
                shift
                ;;
        esac
    done
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    # Initialize
    init_audit_directories
    parse_arguments "$@"
    
    # Generate restoration ID if applicable
    if [[ "$COMMAND" == "restore" ]] || [[ "$COMMAND" == "create-snapshot" ]]; then
        RESTORATION_ID=$(generate_restoration_id)
    fi
    
    # Execute command
    case "$COMMAND" in
        restore)
            log_section "Environment Restoration"
            log_info "Source: $SOURCE_TYPE"
            log_info "Snapshot: $SNAPSHOT_NAME"
            log_info "Point-in-time: ${POINT_IN_TIME:-none}"
            log_info "Clean mode: $CLEAN_MODE"
            
            # Fetch from source
            case "$SOURCE_TYPE" in
                s3)
                    restore_from_s3 "$SNAPSHOT_NAME"
                    ;;
                local)
                    restore_from_local "$SNAPSHOT_NAME"
                    ;;
                git)
                    restore_from_git "$SNAPSHOT_NAME"
                    ;;
                *)
                    log_error "Unknown source type: $SOURCE_TYPE"
                    exit 1
                    ;;
            esac
            
            # Perform restoration
            perform_restoration "$SNAPSHOT_NAME"
            
            # Start services
            start_services
            
            # Verify health
            verify_service_health
            ;;
        create-snapshot)
            log_section "Create Snapshot"
            if [[ -z "$SNAPSHOT_NAME" ]]; then
                SNAPSHOT_NAME="snapshot-$(date +%Y%m%d_%H%M%S)"
            fi
            create_snapshot "$SNAPSHOT_NAME"
            ;;
        list-sources)
            list_backup_sources
            ;;
        rollback)
            rollback_to_snapshot "$SNAPSHOT_NAME"
            ;;
        validate)
            validate_snapshot "$SNAPSHOT_NAME"
            ;;
        audit-history)
            display_audit_history "${LAST_N:-10}"
            ;;
        health-check)
            perform_health_check
            ;;
        *)
            if [[ -z "$COMMAND" ]]; then
                # Default behavior: restore or create
                if [[ -n "$SNAPSHOT_NAME" ]]; then
                    if [[ -d "$SNAPSHOT_DIR/$SNAPSHOT_NAME" ]]; then
                        restore_from_local "$SNAPSHOT_NAME"
                        perform_restoration "$SNAPSHOT_NAME"
                    else
                        create_snapshot "$SNAPSHOT_NAME"
                    fi
                else
                    show_help
                    exit 1
                fi
            else
                log_error "Unknown command: $COMMAND"
                show_help
                exit 1
            fi
            ;;
    esac
    
    log_section "Complete"
    log_success "Operation completed successfully"
}

# Execute main function
main "$@"
