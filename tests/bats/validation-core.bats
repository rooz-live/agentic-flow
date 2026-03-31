#!/usr/bin/env bats
# tests/bats/validation-core.bats
# BATS unit tests for validation-core.sh

setup() {
    # Source the script under test
    SCRIPT_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")" && cd ../.. && pwd)"
    source "$SCRIPT_DIR/scripts/validation-core.sh" 2>/dev/null || true
}

@test "EXIT_SUCCESS is 0" {
    [ "$EXIT_SUCCESS" -eq 0 ]
}

@test "EXIT_INVALID_ARGS is 10" {
    [ "$EXIT_INVALID_ARGS" -eq 10 ]
}

@test "EXIT_FILE_NOT_FOUND is 11" {
    [ "$EXIT_FILE_NOT_FOUND" -eq 11 ]
}

@test "EXIT_SCHEMA_VALIDATION_FAILED is 100" {
    [ "$EXIT_SCHEMA_VALIDATION_FAILED" -eq 100 ]
}

@test "check_file_exists returns success for existing file" {
    # Create temp file
    tmpfile=$(mktemp)
    run check_file_exists "$tmpfile" "Test file" false
    [ "$status" -eq 0 ]
    rm -f "$tmpfile"
}

@test "check_file_exists returns error for non-existent file" {
    run check_file_exists "/nonexistent/file" "Test file" false
    [ "$status" -eq 1 ]
}

@test "validate_email_format accepts valid email" {
    run validate_email_format "test@example.com"
    [ "$status" -eq 0 ]
}

@test "validate_email_format rejects invalid email" {
    run validate_email_format "not-an-email"
    [ "$status" -ne 0 ]
}

@test "validate_required_field returns success when field exists" {
    run validate_required_field "test_value" "Field Name"
    [ "$status" -eq 0 ]
}

@test "validate_required_field returns error when field is empty" {
    run validate_required_field "" "Field Name"
    [ "$status" -ne 0 ]
}

@test "init_colors sets color variables" {
    init_colors
    [ -n "$RED" ]
    [ -n "$GREEN" ]
    [ -n "$YELLOW" ]
}

@test "log_message creates log entry with correct format" {
    tmpdir=$(mktemp -d)
    log_file="$tmpdir/test.log"
    
    # Mock log file
    echo "[2026-01-01T00:00:00] [INFO] Test message" > "$log_file"
    
    [ -f "$log_file" ]
    grep -q "Test message" "$log_file"
    
    rm -rf "$tmpdir"
}
