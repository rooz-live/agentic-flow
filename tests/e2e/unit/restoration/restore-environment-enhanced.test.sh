#!/usr/bin/env bash
#
# restore-environment-enhanced.test.sh
#
# Comprehensive test suite for enhanced restoration script
# Tests all restoration scenarios, rollback capabilities, and audit trail functionality
#
# Usage: ./tests/restoration/restore-environment-enhanced.test.sh [--verbose] [--keep-artifacts]
#

set -euo pipefail

# ============================================================================
# TEST CONFIGURATION
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RESTORE_SCRIPT="$PROJECT_ROOT/scripts/restore-environment-enhanced.sh"
TEST_DIR="$PROJECT_ROOT/tests/restoration/test-artifacts"
TEST_SNAPSHOT_DIR="$TEST_DIR/snapshots"
TEST_AUDIT_DIR="$TEST_DIR/audit"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Options
VERBOSE=false
KEEP_ARTIFACTS=false

# ============================================================================
# TEST FRAMEWORK
# ============================================================================

log_test() {
    local message="$1"
    echo -e "${BLUE}[TEST]${NC} $message"
}

log_pass() {
    local message="$1"
    echo -e "${GREEN}[PASS]${NC} $message"
    ((TESTS_PASSED++))
}

log_fail() {
    local message="$1"
    echo -e "${RED}[FAIL]${NC} $message"
    ((TESTS_FAILED++))
}

log_skip() {
    local message="$1"
    echo -e "${YELLOW}[SKIP]${NC} $message"
    ((TESTS_SKIPPED++))
}

log_info() {
    local message="$1"
    if [[ "$VERBOSE" == true ]]; then
        echo -e "  [INFO] $message"
    fi
}

# Setup test environment
setup_test_env() {
    log_test "Setting up test environment..."
    
    # Create test directories
    mkdir -p "$TEST_DIR"
    mkdir -p "$TEST_SNAPSHOT_DIR"
    mkdir -p "$TEST_AUDIT_DIR"
    mkdir -p "$TEST_DIR/fake-project/.agentdb"
    mkdir -p "$TEST_DIR/fake-project/.goalie"
    mkdir -p "$TEST_DIR/fake-project/.claude"
    mkdir -p "$TEST_DIR/fake-project/config"
    mkdir -p "$TEST_DIR/fake-project/logs"
    
    # Create fake project files
    echo '{"name": "test-project", "version": "1.0.0"}' > "$TEST_DIR/fake-project/package.json"
    echo '{"test": "config"}' > "$TEST_DIR/fake-project/config/test.json"
    echo '{"test": "goalie"}' > "$TEST_DIR/fake-project/.goalie/test.json"
    echo '{"test": "claude"}' > "$TEST_DIR/fake-project/.claude/test.json"
    echo "test log" > "$TEST_DIR/fake-project/logs/test.log"
    
    # Create fake SQLite database
    sqlite3 "$TEST_DIR/fake-project/.agentdb/agentdb.sqlite" <<EOF
CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY, name TEXT);
INSERT INTO test_table (name) VALUES ('test1');
INSERT INTO test_table (name) VALUES ('test2');
EOF
    
    log_info "Test environment created"
}

# Cleanup test environment
cleanup_test_env() {
    if [[ "$KEEP_ARTIFACTS" != true ]]; then
        log_test "Cleaning up test environment..."
        rm -rf "$TEST_DIR"
        log_info "Test environment cleaned"
    else
        log_test "Keeping test artifacts at: $TEST_DIR"
    fi
}

# Run a test
run_test() {
    local test_name="$1"
    local test_function="$2"
    
    ((TESTS_RUN++))
    log_test "Running: $test_name"
    
    if $test_function; then
        log_pass "$test_name"
        return 0
    else
        log_fail "$test_name"
        return 1
    fi
}

# ============================================================================
# TEST: SCRIPT EXECUTABILITY
# ============================================================================

test_script_executable() {
    if [[ -x "$RESTORE_SCRIPT" ]]; then
        log_info "Script is executable"
        return 0
    else
        log_info "Script is not executable"
        return 1
    fi
}

# ============================================================================
# TEST: HELP COMMAND
# ============================================================================

test_help_command() {
    if "$RESTORE_SCRIPT" --help >/dev/null 2>&1; then
        log_info "Help command works"
        return 0
    else
        log_info "Help command failed"
        return 1
    fi
}

# ============================================================================
# TEST: SNAPSHOT CREATION
# ============================================================================

test_snapshot_creation() {
    cd "$TEST_DIR/fake-project"
    
    # Create a test snapshot
    if "$RESTORE_SCRIPT" create-snapshot test-snapshot >/dev/null 2>&1; then
        log_info "Snapshot created successfully"
        
        # Check if snapshot directory exists
        if [[ -d ".snapshots/test-snapshot" ]]; then
            log_info "Snapshot directory exists"
            
            # Check for critical files
            if [[ -f ".snapshots/test-snapshot/metadata.json" ]]; then
                log_info "Metadata file exists"
                return 0
            fi
        fi
    fi
    
    return 1
}

test_snapshot_metadata() {
    cd "$TEST_DIR/fake-project"
    
    local metadata_file=".snapshots/test-snapshot/metadata.json"
    
    if [[ -f "$metadata_file" ]]; then
        # Validate JSON structure
        if jq empty "$metadata_file" 2>/dev/null; then
            log_info "Metadata is valid JSON"
            
            # Check for required fields
            local name=$(jq -r '.name' "$metadata_file" 2>/dev/null)
            local timestamp=$(jq -r '.timestamp' "$metadata_file" 2>/dev/null)
            local version=$(jq -r '.snapshot_version' "$metadata_file" 2>/dev/null)
            
            if [[ "$name" == "test-snapshot" ]] && [[ -n "$timestamp" ]] && [[ -n "$version" ]]; then
                log_info "Metadata has required fields"
                return 0
            fi
        fi
    fi
    
    return 1
}

# ============================================================================
# TEST: SNAPSHOT VALIDATION
# ============================================================================

test_snapshot_validation() {
    cd "$TEST_DIR/fake-project"
    
    # Validate the snapshot
    if "$RESTORE_SCRIPT" validate test-snapshot >/dev/null 2>&1; then
        log_info "Snapshot validation passed"
        return 0
    else
        log_info "Snapshot validation failed"
        return 1
    fi
}

test_snapshot_validation_missing_metadata() {
    cd "$TEST_DIR/fake-project"
    
    # Create snapshot without metadata
    mkdir -p ".snapshots/invalid-snapshot"
    echo "test" > ".snapshots/invalid-snapshot/test.txt"
    
    # Validate should fail
    if ! "$RESTORE_SCRIPT" validate invalid-snapshot >/dev/null 2>&1; then
        log_info "Validation correctly failed for missing metadata"
        return 0
    fi
    
    return 1
}

# ============================================================================
# TEST: DATABASE RESTORATION
# ============================================================================

test_database_restoration() {
    cd "$TEST_DIR/fake-project"
    
    # Backup original database
    cp ".agentdb/agentdb.sqlite" ".agentdb/agentdb.sqlite.original"
    
    # Modify database
    sqlite3 ".agentdb/agentdb.sqlite" "INSERT INTO test_table (name) VALUES ('modified');"
    
    # Restore from snapshot
    if "$RESTORE_SCRIPT" restore local --snapshot test-snapshot --clean --force >/dev/null 2>&1; then
        log_info "Database restoration completed"
        
        # Check if database was restored
        local count=$(sqlite3 ".agentdb/agentdb.sqlite" "SELECT COUNT(*) FROM test_table;" 2>/dev/null || echo "0")
        
        if [[ "$count" == "2" ]]; then
            log_info "Database correctly restored (2 rows)"
            return 0
        fi
    fi
    
    return 1
}

test_database_integrity_check() {
    cd "$TEST_DIR/fake-project"
    
    # Create a valid database
    sqlite3 ".agentdb/test-valid.sqlite" <<EOF
CREATE TABLE test (id INTEGER PRIMARY KEY);
INSERT INTO test VALUES (1);
EOF
    
    # Create an invalid database
    echo "invalid" > ".agentdb/test-invalid.sqlite"
    
    # Test valid database
    if sqlite3 ".agentdb/test-valid.sqlite" "PRAGMA integrity_check;" >/dev/null 2>&1; then
        log_info "Valid database passes integrity check"
    else
        return 1
    fi
    
    # Test invalid database
    if ! sqlite3 ".agentdb/test-invalid.sqlite" "PRAGMA integrity_check;" >/dev/null 2>&1; then
        log_info "Invalid database fails integrity check"
        return 0
    fi
    
    return 1
}

# ============================================================================
# TEST: CONFIGURATION RESTORATION
# ============================================================================

test_configuration_restoration() {
    cd "$TEST_DIR/fake-project"
    
    # Modify configuration
    echo '{"test": "modified"}' > "config/test.json"
    
    # Restore from snapshot
    if "$RESTORE_SCRIPT" restore local --snapshot test-snapshot --clean --force >/dev/null 2>&1; then
        log_info "Configuration restoration completed"
        
        # Check if configuration was restored
        local content=$(cat "config/test.json")
        
        if [[ "$content" == '{"test": "config"}' ]]; then
            log_info "Configuration correctly restored"
            return 0
        fi
    fi
    
    return 1
}

test_configuration_validation() {
    cd "$TEST_DIR/fake-project"
    
    # Create valid JSON config
    echo '{"valid": true}' > "config/valid.json"
    
    # Create invalid JSON config
    echo '{invalid json}' > "config/invalid.json"
    
    # Test valid JSON
    if jq empty "config/valid.json" >/dev/null 2>&1; then
        log_info "Valid JSON passes validation"
    else
        return 1
    fi
    
    # Test invalid JSON
    if ! jq empty "config/invalid.json" >/dev/null 2>&1; then
        log_info "Invalid JSON fails validation"
        return 0
    fi
    
    return 1
}

# ============================================================================
# TEST: ENVIRONMENT VARIABLE RESTORATION
# ============================================================================

test_environment_variable_restoration() {
    cd "$TEST_DIR/fake-project"
    
    # Create snapshot with environment variables
    export TEST_VAR_1="value1"
    export TEST_VAR_2="value2"
    
    "$RESTORE_SCRIPT" create-snapshot test-env-snapshot >/dev/null 2>&1
    
    # Modify environment
    export TEST_VAR_1="modified"
    
    # Restore from snapshot
    if "$RESTORE_SCRIPT" restore local --snapshot test-env-snapshot --force >/dev/null 2>&1; then
        log_info "Environment variable restoration completed"
        
        # Check if environment file was created
        if [[ -f ".env.restored" ]]; then
            log_info "Environment file created"
            return 0
        fi
    fi
    
    return 1
}

# ============================================================================
# TEST: SERVICE RESTORATION
# ============================================================================

test_service_configuration_restoration() {
    cd "$TEST_DIR/fake-project"
    
    # Create service configuration
    mkdir -p "services"
    echo '{"service": "config"}' > "services/service.json"
    
    # Create snapshot
    "$RESTORE_SCRIPT" create-snapshot test-service-snapshot >/dev/null 2>&1
    
    # Modify service configuration
    echo '{"service": "modified"}' > "services/service.json"
    
    # Restore from snapshot
    if "$RESTORE_SCRIPT" restore local --snapshot test-service-snapshot --clean --force >/dev/null 2>&1; then
        log_info "Service configuration restoration completed"
        
        # Check if service configuration was restored
        local content=$(cat "services/service.json" 2>/dev/null || echo "")
        
        if [[ "$content" == '{"service": "config"}' ]]; then
            log_info "Service configuration correctly restored"
            return 0
        fi
    fi
    
    return 1
}

# ============================================================================
# TEST: ROLLBACK CAPABILITY
# ============================================================================

test_rollback_to_snapshot() {
    cd "$TEST_DIR/fake-project"
    
    # Create baseline snapshot
    "$RESTORE_SCRIPT" create-snapshot baseline-snapshot >/dev/null 2>&1
    
    # Modify state
    echo '{"test": "modified"}' > "config/test.json"
    
    # Rollback to baseline
    if "$RESTORE_SCRIPT" rollback baseline-snapshot --force >/dev/null 2>&1; then
        log_info "Rollback completed"
        
        # Check if state was restored
        local content=$(cat "config/test.json")
        
        if [[ "$content" == '{"test": "config"}' ]]; then
            log_info "State correctly rolled back"
            return 0
        fi
    fi
    
    return 1
}

test_rollback_creates_backup() {
    cd "$TEST_DIR/fake-project"
    
    # Create baseline snapshot
    "$RESTORE_SCRIPT" create-snapshot rollback-backup-snapshot >/dev/null 2>&1
    
    # Get snapshot count before rollback
    local before_count=$(ls -1 .snapshots/ 2>/dev/null | wc -l)
    
    # Modify state and rollback
    echo '{"test": "modified"}' > "config/test.json"
    "$RESTORE_SCRIPT" rollback rollback-backup-snapshot --force >/dev/null 2>&1
    
    # Get snapshot count after rollback
    local after_count=$(ls -1 .snapshots/ 2>/dev/null | wc -l)
    
    if [[ $after_count -gt $before_count ]]; then
        log_info "Rollback created backup snapshot"
        return 0
    fi
    
    return 1
}

# ============================================================================
# TEST: AUDIT TRAIL
# ============================================================================

test_audit_trail_creation() {
    cd "$TEST_DIR/fake-project"
    
    # Clear existing audit logs
    rm -rf ".goalie/restoration-audit"
    
    # Create a snapshot
    "$RESTORE_SCRIPT" create-snapshot audit-test-snapshot >/dev/null 2>&1
    
    # Check if audit log was created
    if [[ -f ".goalie/restoration-audit/restorations.jsonl" ]]; then
        log_info "Audit log created"
        
        # Check if log has entries
        local entry_count=$(wc -l < ".goalie/restoration-audit/restorations.jsonl" 2>/dev/null || echo "0")
        
        if [[ $entry_count -gt 0 ]]; then
            log_info "Audit log has $entry_count entries"
            return 0
        fi
    fi
    
    return 1
}

test_audit_trail_content() {
    cd "$TEST_DIR/fake-project"
    
    local audit_file=".goalie/restoration-audit/restorations.jsonl"
    
    if [[ -f "$audit_file" ]]; then
        # Check for required fields in audit entry
        local first_entry=$(head -1 "$audit_file")
        
        if echo "$first_entry" | jq -e '.timestamp' >/dev/null 2>&1 && \
           echo "$first_entry" | jq -e '.event_type' >/dev/null 2>&1 && \
           echo "$first_entry" | jq -e '.restoration_id' >/dev/null 2>&1; then
            log_info "Audit entry has required fields"
            return 0
        fi
    fi
    
    return 1
}

test_audit_history_command() {
    cd "$TEST_DIR/fake-project"
    
    # Create some audit entries
    "$RESTORE_SCRIPT" create-snapshot history-test-1 >/dev/null 2>&1
    "$RESTORE_SCRIPT" create-snapshot history-test-2 >/dev/null 2>&1
    
    # Get audit history
    if "$RESTORE_SCRIPT" audit-history --last 5 >/dev/null 2>&1; then
        log_info "Audit history command works"
        return 0
    fi
    
    return 1
}

# ============================================================================
# TEST: HEALTH CHECK
# ============================================================================

test_health_check_command() {
    cd "$TEST_DIR/fake-project"
    
    # Run health check
    if "$RESTORE_SCRIPT" health-check >/dev/null 2>&1; then
        log_info "Health check command works"
        return 0
    fi
    
    return 1
}

test_health_check_detects_issues() {
    cd "$TEST_DIR/fake-project"
    
    # Remove critical directory
    rm -rf ".goalie"
    
    # Run health check - should detect missing directory
    if ! "$RESTORE_SCRIPT" health-check >/dev/null 2>&1; then
        log_info "Health check detected missing directory"
        
        # Restore directory
        mkdir -p ".goalie"
        echo '{"test": "goalie"}' > ".goalie/test.json"
        
        return 0
    fi
    
    return 1
}

# ============================================================================
# TEST: DRY RUN MODE
# ============================================================================

test_dry_run_mode() {
    cd "$TEST_DIR/fake-project"
    
    # Run restore in dry-run mode
    local output=$("$RESTORE_SCRIPT" restore local --snapshot test-snapshot --dry-run 2>&1)
    
    # Check if dry-run indicator is present
    if echo "$output" | grep -q "DRY RUN"; then
        log_info "Dry-run mode works"
        return 0
    fi
    
    return 1
}

# ============================================================================
# TEST: LIST SOURCES
# ============================================================================

test_list_sources_command() {
    cd "$TEST_DIR/fake-project"
    
    # List sources
    if "$RESTORE_SCRIPT" list-sources --type local >/dev/null 2>&1; then
        log_info "List sources command works"
        return 0
    fi
    
    return 1
}

# ============================================================================
# TEST: ERROR HANDLING
# ============================================================================

test_invalid_snapshot_error() {
    cd "$TEST_DIR/fake-project"
    
    # Try to restore non-existent snapshot
    if ! "$RESTORE_SCRIPT" restore local --snapshot non-existent-snapshot >/dev/null 2>&1; then
        log_info "Correctly failed for non-existent snapshot"
        return 0
    fi
    
    return 1
}

test_invalid_command_error() {
    if ! "$RESTORE_SCRIPT" invalid-command >/dev/null 2>&1; then
        log_info "Correctly failed for invalid command"
        return 0
    fi
    
    return 1
}

# ============================================================================
# TEST: CONCURRENT OPERATIONS
# ============================================================================

test_concurrent_snapshot_creation() {
    cd "$TEST_DIR/fake-project"
    
    # Create multiple snapshots concurrently
    local pids=()
    
    for i in {1..3}; do
        "$RESTORE_SCRIPT" create-snapshot "concurrent-$i" >/dev/null 2>&1 &
        pids+=($!)
    done
    
    # Wait for all to complete
    for pid in "${pids[@]}"; do
        wait $pid
    done
    
    # Check if all snapshots were created
    local created_count=0
    for i in {1..3}; do
        if [[ -d ".snapshots/concurrent-$i" ]]; then
            ((created_count++))
        fi
    done
    
    if [[ $created_count -eq 3 ]]; then
        log_info "All concurrent snapshots created"
        return 0
    fi
    
    return 1
}

# ============================================================================
# TEST: LARGE FILE HANDLING
# ============================================================================

test_large_file_restoration() {
    cd "$TEST_DIR/fake-project"
    
    # Create a large file
    dd if=/dev/zero of="config/large-file.bin" bs=1M count=10 2>/dev/null
    
    # Create snapshot
    if "$RESTORE_SCRIPT" create-snapshot large-file-snapshot >/dev/null 2>&1; then
        log_info "Large file snapshot created"
        
        # Modify file
        dd if=/dev/zero of="config/large-file.bin" bs=1M count=5 2>/dev/null
        
        # Restore
        if "$RESTORE_SCRIPT" restore local --snapshot large-file-snapshot --clean --force >/dev/null 2>&1; then
            log_info "Large file restored"
            
            # Check file size
            local size=$(stat -f%z "config/large-file.bin" 2>/dev/null || stat -c%s "config/large-file.bin" 2>/dev/null || echo "0")
            
            if [[ $size -eq 10485760 ]]; then
                log_info "Large file size correct (10MB)"
                return 0
            fi
        fi
    fi
    
    return 1
}

# ============================================================================
# TEST SUITE EXECUTION
# ============================================================================

run_test_suite() {
    echo ""
    echo "=========================================="
    echo "Enhanced Restoration Script Test Suite"
    echo "=========================================="
    echo ""
    
    # Setup
    setup_test_env
    
    # Core functionality tests
    echo "--- Core Functionality Tests ---"
    run_test "Script is executable" test_script_executable
    run_test "Help command works" test_help_command
    
    # Snapshot tests
    echo ""
    echo "--- Snapshot Tests ---"
    run_test "Snapshot creation" test_snapshot_creation
    run_test "Snapshot metadata" test_snapshot_metadata
    run_test "Snapshot validation" test_snapshot_validation
    run_test "Snapshot validation with missing metadata" test_snapshot_validation_missing_metadata
    
    # Database tests
    echo ""
    echo "--- Database Tests ---"
    run_test "Database restoration" test_database_restoration
    run_test "Database integrity check" test_database_integrity_check
    
    # Configuration tests
    echo ""
    echo "--- Configuration Tests ---"
    run_test "Configuration restoration" test_configuration_restoration
    run_test "Configuration validation" test_configuration_validation
    
    # Environment variable tests
    echo ""
    echo "--- Environment Variable Tests ---"
    run_test "Environment variable restoration" test_environment_variable_restoration
    
    # Service tests
    echo ""
    echo "--- Service Tests ---"
    run_test "Service configuration restoration" test_service_configuration_restoration
    
    # Rollback tests
    echo ""
    echo "--- Rollback Tests ---"
    run_test "Rollback to snapshot" test_rollback_to_snapshot
    run_test "Rollback creates backup" test_rollback_creates_backup
    
    # Audit trail tests
    echo ""
    echo "--- Audit Trail Tests ---"
    run_test "Audit trail creation" test_audit_trail_creation
    run_test "Audit trail content" test_audit_trail_content
    run_test "Audit history command" test_audit_history_command
    
    # Health check tests
    echo ""
    echo "--- Health Check Tests ---"
    run_test "Health check command" test_health_check_command
    run_test "Health check detects issues" test_health_check_detects_issues
    
    # Feature tests
    echo ""
    echo "--- Feature Tests ---"
    run_test "Dry run mode" test_dry_run_mode
    run_test "List sources command" test_list_sources_command
    
    # Error handling tests
    echo ""
    echo "--- Error Handling Tests ---"
    run_test "Invalid snapshot error" test_invalid_snapshot_error
    run_test "Invalid command error" test_invalid_command_error
    
    # Advanced tests
    echo ""
    echo "--- Advanced Tests ---"
    run_test "Concurrent snapshot creation" test_concurrent_snapshot_creation
    run_test "Large file handling" test_large_file_restoration
    
    # Cleanup
    cleanup_test_env
    
    # Summary
    echo ""
    echo "=========================================="
    echo "Test Summary"
    echo "=========================================="
    echo "Tests Run:    $TESTS_RUN"
    echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
    echo -e "Tests Skipped: ${YELLOW}$TESTS_SKIPPED${NC}"
    echo ""
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        echo -e "${GREEN}All tests passed!${NC}"
        return 0
    else
        echo -e "${RED}Some tests failed!${NC}"
        return 1
    fi
}

# ============================================================================
# MAIN
# ============================================================================

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --keep-artifacts|-k)
            KEEP_ARTIFACTS=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [--verbose] [--keep-artifacts]"
            echo "  --verbose       Show verbose output"
            echo "  --keep-artifacts Keep test artifacts"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run test suite
run_test_suite

exit $?
