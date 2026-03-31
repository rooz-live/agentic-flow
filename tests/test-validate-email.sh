#!/bin/bash
# tests/test-validate-email.sh
# @business-context WSJF-1: Email validation critically due at least 10d before arbitration

set -euo pipefail

# Harness exercises exit codes (0/2/110/111/120), not production send; same bypass as validate-email.sh documents for CI.
export SKIP_ARBITRATION_WINDOW="${SKIP_ARBITRATION_WINDOW:-1}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

export EMAIL_HASH_LOG="$(mktemp)"
export LEGAL_ROOT="$(mktemp -d)"

run_test() {
    local name="$1"
    local expected="$2"
    local result="$3"
    
    if [[ "$result" == "$expected" ]]; then
        echo "✅ PASS: $name"
        return 0
    else
        echo "❌ FAIL: $name (Expected $expected, got $result)"
        return 1
    fi
}

TEST_FILE=$(mktemp)

# Test 1: Valid email
echo "From: me@gmail.com" > "$TEST_FILE"
echo "To: test@gmail.com" >> "$TEST_FILE"
echo "Subject: Valid test" >> "$TEST_FILE"
echo "Body of email" >> "$TEST_FILE"

res=0
"$BASE_DIR/_SYSTEM/_AUTOMATION/validate-email.sh" "$TEST_FILE" > /dev/null || res=$?
# 0 or 2 are ok because MX lookup might fail in tests returning warning 2
if [[ "$res" == "0" ]] || [[ "$res" == "2" ]]; then
    run_test "Valid email check" "0" "0"
else
    run_test "Valid email check" "0" "$res"
fi

# Test 2: Placeholder failure (Code 111)
echo "{{PLACEHOLDER}}" >> "$TEST_FILE"
res=0
"$BASE_DIR/_SYSTEM/_AUTOMATION/validate-email.sh" "$TEST_FILE" > /dev/null || res=$?
run_test "Placeholder rejection" "111" "$res"

# Test 3: Past Date failure (Code 110)
# Rewrite file
echo "From: me@gmail.com" > "$TEST_FILE"
echo "To: test@gmail.com" >> "$TEST_FILE"
echo "Subject: Date logic" >> "$TEST_FILE"
echo "We must vacate by March 1, 2026." >> "$TEST_FILE"
res=0
"$BASE_DIR/_SYSTEM/_AUTOMATION/validate-email.sh" "$TEST_FILE" > /dev/null || res=$?
run_test "Past date rejection" "110" "$res"

# Test 4: Duplicate SHA256 detection (Code 120)
echo "From: me@gmail.com" > "$TEST_FILE"
echo "To: test@gmail.com" >> "$TEST_FILE"
echo "Subject: Duplicate logic" >> "$TEST_FILE"
echo "Body" >> "$TEST_FILE"

# First time passing
"$BASE_DIR/_SYSTEM/_AUTOMATION/validate-email.sh" "$TEST_FILE" > /dev/null || res=$?

# Second time should fail
res=0
"$BASE_DIR/_SYSTEM/_AUTOMATION/validate-email.sh" "$TEST_FILE" > /dev/null || res=$?
run_test "SHA256 duplicate detection" "120" "$res"

rm -rf "$TEST_FILE" "$EMAIL_HASH_LOG" "$LEGAL_ROOT"
echo "validate-email.sh tested completely."
exit 0
