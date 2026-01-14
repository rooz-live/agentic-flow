#!/usr/bin/env bash
# Master test runner for all test suites

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Run a test suite
run_test_suite() {
  local test_file="$1"
  local test_name="$(basename "$test_file")"
  
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Running: $test_name${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  
  if [[ "$test_file" == *.py ]]; then
    # Python test
    if python3 "$test_file"; then
      PASSED_TESTS=$((PASSED_TESTS + 1))
      echo -e "${GREEN}✓ PASSED${NC}"
    else
      FAILED_TESTS=$((FAILED_TESTS + 1))
      echo -e "${RED}✗ FAILED${NC}"
    fi
  else
    # Bash test
    if bash "$test_file"; then
      PASSED_TESTS=$((PASSED_TESTS + 1))
      echo -e "${GREEN}✓ PASSED${NC}"
    else
      FAILED_TESTS=$((FAILED_TESTS + 1))
      echo -e "${RED}✗ FAILED${NC}"
    fi
  fi
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# Main execution
main() {
  echo -e "${BLUE}════════════════════════════════════${NC}"
  echo -e "${BLUE}  Agentic Flow Test Suite Runner  ${NC}"
  echo -e "${BLUE}════════════════════════════════════${NC}"
  
  cd "$ROOT_DIR"
  
  # Run unit tests
  echo ""
  echo -e "${YELLOW}▶ Running Unit Tests${NC}"
  for test_file in "$SCRIPT_DIR"/unit/test_*.sh "$SCRIPT_DIR"/unit/test_*.py; do
    if [[ -f "$test_file" ]]; then
      run_test_suite "$test_file"
    fi
  done
  
  # Run integration tests
  echo ""
  echo -e "${YELLOW}▶ Running Integration Tests${NC}"
  for test_file in "$SCRIPT_DIR"/integration/test_*.sh; do
    if [[ -f "$test_file" ]]; then
      run_test_suite "$test_file"
    fi
  done
  
  # Run E2E tests
  echo ""
  echo -e "${YELLOW}▶ Running E2E Tests${NC}"
  for test_file in "$SCRIPT_DIR"/e2e/test_*.sh; do
    if [[ -f "$test_file" ]]; then
      run_test_suite "$test_file"
    fi
  done
  
  # Print final summary
  echo ""
  echo -e "${BLUE}════════════════════════════════════${NC}"
  echo -e "${BLUE}  Final Test Summary  ${NC}"
  echo -e "${BLUE}════════════════════════════════════${NC}"
  echo ""
  echo "Total Suites:  $TOTAL_TESTS"
  echo -e "Passed Suites: ${GREEN}$PASSED_TESTS${NC}"
  echo -e "Failed Suites: ${RED}$FAILED_TESTS${NC}"
  echo ""
  
  if [[ $FAILED_TESTS -eq 0 ]]; then
    echo -e "${GREEN}✓ All test suites passed!${NC}"
    exit 0
  else
    echo -e "${RED}✗ Some test suites failed${NC}"
    exit 1
  fi
}

main "$@"
