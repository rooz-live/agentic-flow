#!/usr/bin/env bash
# Unit tests for ay yo prod-cycle command

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Load test helpers
source "$SCRIPT_DIR/../helpers/assertions.sh"
source "$SCRIPT_DIR/../helpers/mocks.sh"

# Test: prod-cycle command exists in help
test_prod_cycle_command_exists() {
  echo "Testing: prod-cycle command exists"
  
  "$ROOT_DIR/scripts/ay-yo" --help | grep -q "prod-cycle"
  assert_exit_code 0
}

# Test: prod-cycle accepts help flag
test_prod_cycle_help() {
  echo "Testing: prod-cycle --help"
  
  "$ROOT_DIR/scripts/ay-yo" prod-cycle --help > /dev/null 2>&1
  assert_exit_code 0
}

# Test: prod-cycle validates arguments
test_prod_cycle_validates_args() {
  echo "Testing: prod-cycle validates invalid arguments"
  
  # Capture output and exit code
  local output
  output=$("$ROOT_DIR/scripts/ay-yo" prod-cycle --invalid-flag 2>&1 || true)
  
  # Check for error message (strip ANSI codes)
  if echo "$output" | sed 's/\x1b\[[0-9;]*m//g' | grep -q "Unknown option"; then
    echo "✓ Invalid flag rejected correctly"
  else
    echo "✗ Failed to reject invalid flag"
    echo "Output: $output"
    return 1
  fi
}

# Test: prod-cycle accepts circle argument
test_prod_cycle_circle_arg() {
  echo "Testing: prod-cycle --circles option"
  
  "$ROOT_DIR/scripts/ay-yo" prod-cycle --help 2>&1 | grep -q -- "--circles"
  assert_exit_code 0
}

# Run all tests
main() {
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Unit Tests: ay yo prod-cycle CLI"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  setup_test_env
  
  test_prod_cycle_command_exists
  test_prod_cycle_help
  test_prod_cycle_validates_args
  test_prod_cycle_circle_arg
  
  teardown_test_env
  
  print_test_summary
}

main "$@"
