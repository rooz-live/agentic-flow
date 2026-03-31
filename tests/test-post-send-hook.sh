#!/bin/bash
# tests/test-post-send-hook.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

source "$BASE_DIR/scripts/post-send-hook.sh"

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

execute_post_send "$TEST_FILE" >/dev/null || res=$?
run_test "execute_post_send" "0" "${res:-0}"

archive_email "$TEST_FILE" >/dev/null || res=$?
run_test "archive_email" "0" "${res:-0}"

update_ledger "$TEST_FILE" >/dev/null || res=$?
run_test "update_ledger" "0" "${res:-0}"

rm -f "$TEST_FILE"
echo "post-send-hook.sh tested completely."
exit 0
