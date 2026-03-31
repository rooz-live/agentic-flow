#!/usr/bin/env bash
# Test assertion helpers for bash tests

# Colors for test output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Assert exit code equals expected
assert_exit_code() {
  local actual=$?
  local expected=$1
  TESTS_RUN=$((TESTS_RUN + 1))
  
  if [[ $actual -eq $expected ]]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "${GREEN}✓${NC} Exit code: $actual (expected: $expected)"
    return 0
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "${RED}✗${NC} Exit code: $actual (expected: $expected)"
    return 1
  fi
}

# Assert file exists
assert_file_exists() {
  local file="$1"
  TESTS_RUN=$((TESTS_RUN + 1))
  
  if [[ -f "$file" ]]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "${GREEN}✓${NC} File exists: $file"
    return 0
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "${RED}✗${NC} File not found: $file"
    return 1
  fi
}

# Assert file contains string
assert_file_contains() {
  local file="$1"
  local pattern="$2"
  TESTS_RUN=$((TESTS_RUN + 1))
  
  if grep -q "$pattern" "$file" 2>/dev/null; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "${GREEN}✓${NC} File contains: '$pattern'"
    return 0
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "${RED}✗${NC} File missing pattern: '$pattern'"
    return 1
  fi
}

# Assert string equals
assert_equals() {
  local expected="$1"
  local actual="$2"
  local message="${3:-Assertion}"
  TESTS_RUN=$((TESTS_RUN + 1))
  
  if [[ "$actual" == "$expected" ]]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "${GREEN}✓${NC} $message"
    return 0
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "${RED}✗${NC} $message"
    echo -e "  Expected: $expected"
    echo -e "  Actual:   $actual"
    return 1
  fi
}

# Assert string contains substring
assert_contains() {
  local haystack="$1"
  local needle="$2"
  local message="${3:-String contains}"
  TESTS_RUN=$((TESTS_RUN + 1))
  
  if [[ "$haystack" == *"$needle"* ]]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "${GREEN}✓${NC} $message"
    return 0
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "${RED}✗${NC} $message"
    echo -e "  Looking for: $needle"
    echo -e "  In string:   $haystack"
    return 1
  fi
}

# Assert directory exists
assert_dir_exists() {
  local dir="$1"
  TESTS_RUN=$((TESTS_RUN + 1))
  
  if [[ -d "$dir" ]]; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "${GREEN}✓${NC} Directory exists: $dir"
    return 0
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "${RED}✗${NC} Directory not found: $dir"
    return 1
  fi
}

# Assert JSON is valid
assert_valid_json() {
  local file="$1"
  TESTS_RUN=$((TESTS_RUN + 1))
  
  if command -v jq >/dev/null 2>&1; then
    if jq empty "$file" 2>/dev/null; then
      TESTS_PASSED=$((TESTS_PASSED + 1))
      echo -e "${GREEN}✓${NC} Valid JSON: $file"
      return 0
    else
      TESTS_FAILED=$((TESTS_FAILED + 1))
      echo -e "${RED}✗${NC} Invalid JSON: $file"
      return 1
    fi
  else
    echo -e "${YELLOW}⚠${NC} jq not installed, skipping JSON validation"
    return 0
  fi
}

# Print test summary
print_test_summary() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Test Summary"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Total:  $TESTS_RUN"
  echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
  echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
  
  if [[ $TESTS_FAILED -eq 0 ]]; then
    echo -e "\n${GREEN}✓ All tests passed!${NC}"
    return 0
  else
    echo -e "\n${RED}✗ Some tests failed${NC}"
    return 1
  fi
}
