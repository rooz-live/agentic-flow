#!/usr/bin/env bash
# Unit tests for break-glass destructive operation detection

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Load test helpers
source "$SCRIPT_DIR/../helpers/assertions.sh"
source "$SCRIPT_DIR/../helpers/mocks.sh"

# Mock break-glass functions for testing
# TODO: Move to scripts/lib/break_glass.sh once implemented
is_destructive() {
  local command="$1"
  case "$command" in
    *"install"*|*"restart"*|*"rm -rf"*|*"disable"*|*"stop"*)
      return 0  # Destructive
      ;;
    *)
      return 1  # Safe
      ;;
  esac
}

# Test: Detects package installation as destructive
test_detects_package_install() {
  echo "Testing: Detects package install as destructive"
  
  is_destructive "apt-get install redis"
  assert_exit_code 0
  
  is_destructive "yum install docker"
  assert_exit_code 0
  
  is_destructive "pip install numpy"
  assert_exit_code 0
}

# Test: Detects service restart as destructive
test_detects_service_restart() {
  echo "Testing: Detects service restart as destructive"
  
  is_destructive "systemctl restart docker"
  assert_exit_code 0
  
  is_destructive "service nginx stop"
  assert_exit_code 0
}

# Test: Detects file deletion as destructive
test_detects_file_deletion() {
  echo "Testing: Detects file deletion as destructive"
  
  is_destructive "rm -rf /var/lib/docker"
  assert_exit_code 0
}

# Test: Allows safe read operations
test_allows_safe_operations() {
  echo "Testing: Allows safe read operations"
  
  is_destructive "kubectl get pods"
  assert_exit_code 1
  
  is_destructive "docker ps"
  assert_exit_code 1
  
  is_destructive "cat /etc/hosts"
  assert_exit_code 1
}

# Test: Detects service disable as destructive
test_detects_service_disable() {
  echo "Testing: Detects service disable as destructive"
  
  is_destructive "systemctl disable docker"
  assert_exit_code 0
}

# Run all tests
main() {
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Unit Tests: Break-Glass Detection"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  setup_test_env
  
  test_detects_package_install
  test_detects_service_restart
  test_detects_file_deletion
  test_allows_safe_operations
  test_detects_service_disable
  
  teardown_test_env
  
  print_test_summary
}

main "$@"
