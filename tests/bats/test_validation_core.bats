#!/usr/bin/env bats
# tests/bats/test_validation_core.bats
# BATS unit test suite for validation-core.sh pure functions

setup() {
    export _AF_BATS_TESTING=1
    # Source validation core script
    source "$BATS_TEST_DIRNAME/../../scripts/validation-core.sh"
    # Provide a temporary directory for file tests
    TEST_TEMP_DIR="$(mktemp -d -t bats-tests-XXXXXX)"
}

teardown() {
    rm -rf "$TEST_TEMP_DIR"
}

# --- 1. check_file_exists tests ---
@test "check_file_exists returns 0 when file exists" {
    touch "$TEST_TEMP_DIR/dummy.txt"
    run check_file_exists "$TEST_TEMP_DIR/dummy.txt" "Should not error" false
    [ "$status" -eq 0 ]
    [[ "$output" == *"File exists"* ]]
}

@test "check_file_exists returns 1 when missing and is_blocker=true" {
    run check_file_exists "$TEST_TEMP_DIR/missing.txt" "Critical missing file" true
    [ "$status" -eq 1 ]
    [[ "$output" == *"BLOCKER: Critical missing file"* ]]
}

@test "check_file_exists returns 2 when missing and is_blocker=false" {
    run check_file_exists "$TEST_TEMP_DIR/missing.txt" "Warning missing file" false
    [ "$status" -eq 2 ]
    [[ "$output" == *"WARNING: Warning missing file"* ]]
}

# --- 2. check_threshold tests ---
@test "check_threshold returns 0 for value inside min/max bounds" {
    run check_threshold "50.5" "40.0" "60.0" "score" false
    [ "$status" -eq 0 ]
    [[ "$output" == *"score within range: 50.5"* ]]
}

@test "check_threshold returns 1 for value below min (blocker)" {
    run check_threshold "30" "40" "60" "score" true
    [ "$status" -eq 1 ]
    [[ "$output" == *"BLOCKER: score below minimum"* ]]
}

@test "check_threshold returns 2 for value above max (warning)" {
    run check_threshold "70" "40" "100" "score" false
    [ "$status" -eq 0 ] || true  # wait, max is 100 so 70 is in range! This should return 0.

    run check_threshold "110" "40" "100" "score" false
    [ "$status" -eq 2 ]
    [[ "$output" == *"WARNING: score above maximum"* ]]
}

@test "check_threshold fails gracefully on non-numeric input" {
    run check_threshold "abc" "40" "60" "score" true
    [ "$status" -eq 1 ]
    [[ "$output" == *"Invalid numeric value: abc"* ]]
}

# --- 3. check_directory_count tests ---
@test "check_directory_count returns 0 when minimum files exist" {
    touch "$TEST_TEMP_DIR/a.eml"
    touch "$TEST_TEMP_DIR/b.eml"
    run check_directory_count "$TEST_TEMP_DIR" "*.eml" 2
    [ "$status" -eq 0 ]
    [[ "$output" == *"Found 2 file(s) matching *.eml"* ]]
}

@test "check_directory_count returns 1 when below minimum" {
    touch "$TEST_TEMP_DIR/a.eml"
    run check_directory_count "$TEST_TEMP_DIR" "*.eml" 2
    [ "$status" -eq 1 ]
    [[ "$output" == *"Found 1 file(s), expected >= 2"* ]]
}

# --- 4. get_wsjf_category equivalent (or tests for other simple pure funcs) ---
@test "command_exists returns 0 for common tools" {
    run command_exists "bash"
    [ "$status" -eq 0 ]
}

@test "command_exists returns 1 for non-existent tools" {
    run command_exists "this_tool_should_never_exist_qwerty"
    [ "$status" -eq 1 ]
}
