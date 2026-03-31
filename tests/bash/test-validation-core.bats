#!/usr/bin/env bats
# =============================================================================
# BATS Unit Tests for validation-core.sh
# =============================================================================
# 
# Tests the robust exit code system and core validation functions
# Run with: bats tests/bash/test-validation-core.bats
# =============================================================================

setup() {
    # Load the validation-core.sh script
    load "../../scripts/validation-core.sh"
    
    # Create temporary test directory
    TEST_TEMP_DIR="$(mktemp -d)"
    export TEST_TEMP_DIR
}

teardown() {
    # Clean up temporary files
    if [[ -n "$TEST_TEMP_DIR" && -d "$TEST_TEMP_DIR" ]]; then
        rm -rf "$TEST_TEMP_DIR"
    fi
}

@test "validation-core.sh defines robust exit codes" {
    # Test that all required exit codes are defined
    [[ -n "$EXIT_SUCCESS" ]]
    [[ -n "$EXIT_INVALID_ARGS" ]]
    [[ -n "$EXIT_FILE_NOT_FOUND" ]]
    [[ -n "$EXIT_SCHEMA_FAIL" ]]
    [[ -n "$EXIT_DATA_CORRUPTION" ]]
    
    # Test that exit codes are in correct semantic zones
    [[ "$EXIT_SUCCESS" -eq 0 ]]
    [[ "$EXIT_INVALID_ARGS" -ge 10 && "$EXIT_INVALID_ARGS" -le 19 ]]
    [[ "$EXIT_FILE_NOT_FOUND" -ge 10 && "$EXIT_FILE_NOT_FOUND" -le 19 ]]
    [[ "$EXIT_SCHEMA_FAIL" -ge 100 && "$EXIT_SCHEMA_FAIL" -le 109 ]]
    [[ "$EXIT_DATA_CORRUPTION" -ge 250 && "$EXIT_DATA_CORRUPTION" -le 255 ]]
}

@test "core_check_file_exists function works correctly" {
    # Test with existing file
    echo "test content" > "$TEST_TEMP_DIR/existing_file.txt"
    run core_check_file_exists "$TEST_TEMP_DIR/existing_file.txt"
    [[ "$status" -eq 0 ]]
    
    # Test with non-existing file
    run core_check_file_exists "$TEST_TEMP_DIR/nonexistent_file.txt"
    [[ "$status" -eq "$EXIT_FILE_NOT_FOUND" ]]
}

@test "core_check_file_not_empty function works correctly" {
    # Test with non-empty file
    echo "test content" > "$TEST_TEMP_DIR/nonempty_file.txt"
    run core_check_file_not_empty "$TEST_TEMP_DIR/nonempty_file.txt"
    [[ "$status" -eq 0 ]]
    
    # Test with empty file
    touch "$TEST_TEMP_DIR/empty_file.txt"
    run core_check_file_not_empty "$TEST_TEMP_DIR/empty_file.txt"
    [[ "$status" -eq "$EXIT_DATA_CORRUPTION" ]]
    
    # Test with non-existing file
    run core_check_file_not_empty "$TEST_TEMP_DIR/nonexistent_file.txt"
    [[ "$status" -eq "$EXIT_FILE_NOT_FOUND" ]]
}

@test "core_validate_args function works correctly" {
    # Test with correct number of arguments
    run core_validate_args 2 "arg1" "arg2"
    [[ "$status" -eq 0 ]]
    
    # Test with incorrect number of arguments
    run core_validate_args 2 "arg1"
    [[ "$status" -eq "$EXIT_INVALID_ARGS" ]]
    
    # Test with too many arguments
    run core_validate_args 2 "arg1" "arg2" "arg3"
    [[ "$status" -eq "$EXIT_INVALID_ARGS" ]]
}

@test "core_log function creates log entries" {
    local test_log="$TEST_TEMP_DIR/test.log"
    
    # Test logging functionality
    core_log "Test message" "$test_log"
    
    # Check that log file was created and contains the message
    [[ -f "$test_log" ]]
    grep -q "Test message" "$test_log"
    
    # Check timestamp format
    grep -q "^\[20[0-9][0-9]-[0-9][0-9]-[0-9][0-9] [0-9][0-9]:[0-9][0-9]:[0-9][0-9]\]" "$test_log"
}

@test "exit codes are within valid range (0-255)" {
    # Test all defined exit codes are within valid bash range
    local exit_codes=(
        "$EXIT_SUCCESS"
        "$EXIT_INVALID_ARGS"
        "$EXIT_FILE_NOT_FOUND"
        "$EXIT_SCHEMA_FAIL"
        "$EXIT_DATA_CORRUPTION"
        "$EXIT_WSJF_LOW"
        "$EXIT_ADR_MISSING"
        "$EXIT_DATE_PAST"
    )
    
    for code in "${exit_codes[@]}"; do
        [[ "$code" -ge 0 && "$code" -le 255 ]]
    done
}

@test "semantic zones are properly separated" {
    # Test that exit codes don't overlap between semantic zones
    # Zone 1: Success (0)
    [[ "$EXIT_SUCCESS" -eq 0 ]]
    
    # Zone 2: Input/Args (10-19)
    [[ "$EXIT_INVALID_ARGS" -ge 10 && "$EXIT_INVALID_ARGS" -le 19 ]]
    [[ "$EXIT_FILE_NOT_FOUND" -ge 10 && "$EXIT_FILE_NOT_FOUND" -le 19 ]]
    
    # Zone 3: Validation (100-109)
    [[ "$EXIT_SCHEMA_FAIL" -ge 100 && "$EXIT_SCHEMA_FAIL" -le 109 ]]
    
    # Zone 4: Critical (250-255)
    [[ "$EXIT_DATA_CORRUPTION" -ge 250 && "$EXIT_DATA_CORRUPTION" -le 255 ]]
}
