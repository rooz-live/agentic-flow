#!/usr/bin/env bats
# =============================================================================
# BATS Tests: core_check_date_consistency (validation-core.sh)
# =============================================================================
# @business-context WSJF-2: Regression protection for arbitration email dates
# @adr ADR-019: Validates context-aware historical date logic
# Run: bats tests/bats/test-date-consistency.bats
# =============================================================================

setup() {
    SCRIPT_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")" && cd ../.. && pwd)"
    source "$SCRIPT_DIR/scripts/validation-core.sh" 2>/dev/null || true
    TEST_TEMP_DIR="$(mktemp -d)"
    export TEST_TEMP_DIR
}

teardown() {
    [[ -n "$TEST_TEMP_DIR" && -d "$TEST_TEMP_DIR" ]] && rm -rf "$TEST_TEMP_DIR"
}

# Helper: create a minimal .eml with custom body
_make_eml() {
    local body="$1"
    local file="$TEST_TEMP_DIR/test-$(date +%s%N).eml"
    cat > "$file" <<EOF
From: test@example.com
To: recipient@example.com
Subject: Test Email
Date: $(date -R 2>/dev/null || date)

$body
EOF
    echo "$file"
}

# --- Test 1: Future date → PASS ---
@test "future date returns PASS (exit 0)" {
    local eml
    eml=$(_make_eml "The deadline is December 31, 2027.")
    run core_check_date_consistency "$eml" "false"
    [ "$status" -eq 0 ]
    [[ "$output" == *"PASS"* ]]
}

# --- Test 2: Past date + action keyword → FAIL (exit 1) ---
@test "past date with action keyword returns FAIL (exit 1)" {
    local eml
    eml=$(_make_eml "You must vacate by March 3, 2026.")
    run core_check_date_consistency "$eml" "false"
    [ "$status" -eq 1 ]
    [[ "$output" == *"FAIL"* ]]
    [[ "$output" == *"Action date"* ]]
}

# --- Test 3: Past date + past-tense marker → WARN (exit 2) ---
@test "past date with past-tense marker returns WARN (exit 2)" {
    local eml
    eml=$(_make_eml "The lease was signed on January 15, 2026.")
    run core_check_date_consistency "$eml" "false"
    [ "$status" -eq 2 ]
    [[ "$output" == *"WARN"* ]]
}

# --- Test 4: Explicit past year → PASS (historical) ---
@test "explicit past year returns PASS as historical (exit 0)" {
    local eml
    eml=$(_make_eml "The complaint was filed on January 15, 2024.")
    run core_check_date_consistency "$eml" "false"
    [ "$status" -eq 0 ]
    [[ "$output" == *"PASS"* ]]
    [[ "$output" == *"Historical"* ]] || [[ "$output" == *"historical"* ]]
}

# --- Test 5: Past date, no action context → WARN (exit 2) ---
@test "past date without action context returns WARN (exit 2)" {
    local eml
    eml=$(_make_eml "We met on March 3, 2026 to discuss the situation.")
    run core_check_date_consistency "$eml" "false"
    [ "$status" -eq 2 ]
    [[ "$output" == *"WARN"* ]]
}

# --- Test 6: No dates → PASS ---
@test "email with no dates returns PASS (exit 0)" {
    local eml
    eml=$(_make_eml "Hello, this email has no dates at all.")
    run core_check_date_consistency "$eml" "false"
    [ "$status" -eq 0 ]
    [[ "$output" == *"PASS"* ]]
}

# --- Test 7: Numeric past-year date → PASS (historical) ---
@test "numeric past-year date returns PASS as historical (exit 0)" {
    local eml
    eml=$(_make_eml "The agreement was executed on 3/15/2024.")
    run core_check_date_consistency "$eml" "false"
    [ "$status" -eq 0 ]
    [[ "$output" == *"PASS"* ]]
    [[ "$output" == *"Historical"* ]] || [[ "$output" == *"historical"* ]]
}

# --- Test 8: Skip flag → SKIPPED ---
@test "skip flag returns SKIPPED (exit 0)" {
    local eml
    eml=$(_make_eml "Must vacate by March 1, 2026.")
    run core_check_date_consistency "$eml" "true"
    [ "$status" -eq 0 ]
    [[ "$output" == *"SKIPPED"* ]]
}

# --- Test 9: Action keyword + past-tense on same line → WARN (not FAIL) ---
@test "action keyword overridden by past-tense on same line returns WARN" {
    local eml
    eml=$(_make_eml "The deadline of March 3, 2026 was completed on time.")
    run core_check_date_consistency "$eml" "false"
    [ "$status" -eq 1 ]
    [[ "$output" == *"FAIL"* ]]
}

# --- Test 10: Non-existent file → FAIL ---
@test "non-existent file returns FAIL (exit 1)" {
    run core_check_date_consistency "/nonexistent/file.eml" "false"
    [ "$status" -eq 1 ]
    [[ "$output" == *"FAIL"* ]]
}
