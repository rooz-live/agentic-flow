#!/usr/bin/env bash
# value_stream_test.sh
#
# Forward/Backward Testing Strategies for Value Stream Delivery
#
# Forward Testing: Validate upcoming changes meet acceptance criteria
# Backward Testing: Ensure past patterns still work after changes
#
# Usage: ./scripts/testing/value_stream_test.sh [forward|backward|both] [--circle <circle>]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

# Configuration
TEST_MODE="${1:-both}"
CIRCLE="${2:-}"
RUN_ID="test-$(date +%s)"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

export AF_RUN_ID="$RUN_ID"

echo -e "${BOLD}=== Value Stream Testing ===${NC}"
echo -e "Mode: ${BLUE}$TEST_MODE${NC}"
echo -e "Circle: ${BLUE}${CIRCLE:-all}${NC}"
echo -e "Run ID: ${RUN_ID}"
echo

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Record test result
record_test() {
  local name="$1"
  local status="$2"  # pass|fail|skip
  local details="${3:-}"
  
  case "$status" in
    pass)
      ((TESTS_PASSED++))
      echo -e "${GREEN}✓${NC} $name"
      ;;
    fail)
      ((TESTS_FAILED++))
      echo -e "${RED}✗${NC} $name"
      [ -n "$details" ] && echo -e "  ${RED}$details${NC}"
      ;;
    skip)
      ((TESTS_SKIPPED++))
      echo -e "${YELLOW}○${NC} $name (skipped)"
      ;;
  esac
}

# Forward Testing: Validate upcoming changes
forward_test_suite() {
  echo -e "${BOLD}--- Forward Testing ---${NC}"
  echo "Validating upcoming changes meet acceptance criteria"
  echo
  
  # Test 1: WSJF Calculation
  echo "Test 1: WSJF Auto-Calculation"
  if [ -f "scripts/circles/wsjf_interactive.sh" ]; then
    record_test "WSJF Interactive Script Exists" "pass"
  else
    record_test "WSJF Interactive Script Exists" "fail" "File not found"
  fi
  
  # Test 2: ProcessGovernor Bridge
  echo
  echo "Test 2: ProcessGovernor Bridge Compilation"
  if [ -f "src/runtime/processGovernorBridge.ts" ]; then
    if npx tsc src/runtime/processGovernorBridge.ts --noEmit --skipLibCheck 2>/dev/null; then
      record_test "ProcessGovernor Bridge Compiles" "pass"
    else
      record_test "ProcessGovernor Bridge Compiles" "fail" "TypeScript errors"
    fi
  else
    record_test "ProcessGovernor Bridge Compiles" "skip" "Bridge not created yet"
  fi
  
  # Test 3: Pattern Metrics Schema
  echo
  echo "Test 3: Pattern Metrics Schema Validation"
  if [ -f ".goalie/pattern_metrics.jsonl" ]; then
    if jq -e '.pattern and .behavior and .circle and .gate' .goalie/pattern_metrics.jsonl >/dev/null 2>&1; then
      record_test "Pattern Metrics Schema Valid" "pass"
    else
      record_test "Pattern Metrics Schema Valid" "fail" "Invalid schema"
    fi
  else
    record_test "Pattern Metrics Schema Valid" "skip" "No metrics captured yet"
  fi
  
  # Test 4: Circle Backlogs Exist
  echo
  echo "Test 4: Circle Backlog Files"
  CIRCLES=("orchestrator" "analyst" "assessor" "innovator" "intuitive" "seeker")
  for circle in "${CIRCLES[@]}"; do
    if find circles/ -name "backlog.md" -path "*/$circle/*" 2>/dev/null | grep -q .; then
      record_test "Backlog for $circle" "pass"
    else
      record_test "Backlog for $circle" "fail" "Backlog not found"
    fi
  done
  
  # Test 5: Dashboard Accessibility
  echo
  echo "Test 5: Dashboard Files"
  if [ -f "tools/dashboard/value_stream_dashboard.html" ]; then
    record_test "Value Stream Dashboard" "pass"
  else
    record_test "Value Stream Dashboard" "fail" "Dashboard not created"
  fi
  
  # Test 6: Validation Scripts
  echo
  echo "Test 6: Validation Scripts"
  REQUIRED_SCRIPTS=(
    "scripts/validate-bridge-integration.sh"
    "scripts/circles/replenish_circle.sh"
  )
  
  for script in "${REQUIRED_SCRIPTS[@]}"; do
    if [ -f "$script" ] && [ -x "$script" ]; then
      record_test "$(basename "$script")" "pass"
    else
      record_test "$(basename "$script")" "fail" "Script missing or not executable"
    fi
  done
}

# Backward Testing: Ensure existing patterns still work
backward_test_suite() {
  echo
  echo -e "${BOLD}--- Backward Testing ---${NC}"
  echo "Validating existing patterns still function correctly"
  echo
  
  # Test 1: ProcessGovernor Core Functions
  echo "Test 1: ProcessGovernor Core (Regression)"
  if [ -f "src/runtime/processGovernor.ts" ]; then
    if grep -q "export function runBatched" src/runtime/processGovernor.ts; then
      record_test "ProcessGovernor API Intact" "pass"
    else
      record_test "ProcessGovernor API Intact" "fail" "Core API modified"
    fi
  else
    record_test "ProcessGovernor API Intact" "fail" "File missing"
  fi
  
  # Test 2: Existing Circle Structure
  echo
  echo "Test 2: Circle Structure Integrity"
  if [ -d "circles" ] || [ -d "investing/agentic-flow/circles" ]; then
    record_test "Circle Directory Structure" "pass"
  else
    record_test "Circle Directory Structure" "fail" "Circle structure broken"
  fi
  
  # Test 3: AF Command Availability
  echo
  echo "Test 3: AF Command Regression"
  if [ -f "scripts/af" ]; then
    if grep -q "full-cycle" scripts/af; then
      record_test "AF Full-Cycle Command" "pass"
    else
      record_test "AF Full-Cycle Command" "fail" "Command removed"
    fi
    
    if grep -q "pattern-coverage" scripts/af; then
      record_test "AF Pattern-Coverage Command" "pass"
    else
      record_test "AF Pattern-Coverage Command" "fail" "Command removed"
    fi
  else
    record_test "AF Command Script" "fail" "scripts/af missing"
  fi
  
  # Test 4: Configuration Files
  echo
  echo "Test 4: Configuration Integrity"
  if [ -f "package.json" ]; then
    if jq -e '.scripts' package.json >/dev/null 2>&1; then
      record_test "package.json Structure" "pass"
    else
      record_test "package.json Structure" "fail" "Invalid JSON"
    fi
  else
    record_test "package.json Structure" "skip" "Not a Node project"
  fi
  
  # Test 5: Git Branch Safety
  echo
  echo "Test 5: Git Branch Safety"
  CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "detached")
  if [[ "$CURRENT_BRANCH" == poc/* ]] || [[ "$CURRENT_BRANCH" == "detached" ]]; then
    record_test "Working on POC Branch" "pass"
  else
    record_test "Working on POC Branch" "fail" "On non-POC branch: $CURRENT_BRANCH"
  fi
  
  # Test 6: No Accidental Doc Creation
  echo
  echo "Test 6: Documentation Discipline"
  NEW_MDS=$(git diff --name-only --cached | grep -c '\.md$' || echo 0)
  if [ "$NEW_MDS" -eq 0 ]; then
    record_test "No New Markdown Files Staged" "pass"
  else
    record_test "No New Markdown Files Staged" "fail" "$NEW_MDS new .md files staged"
  fi
}

# Integration Testing: End-to-End Flow
integration_test() {
  echo
  echo -e "${BOLD}--- Integration Testing ---${NC}"
  echo "Testing full value stream flow"
  echo
  
  # Test: Pattern Metrics End-to-End
  echo "Test: Pattern Metrics End-to-End Flow"
  
  # Clean slate
  rm -f .goalie/pattern_metrics_test.jsonl
  
  # Simulate pattern logging
  export AF_PATTERN_METRICS_PATH=".goalie/pattern_metrics_test.jsonl"
  
  if [ -f "dist/processGovernor.js" ]; then
    # Run minimal ProcessGovernor test
    node -e "
      const pg = require('./dist/processGovernor.js');
      (async () => {
        const tasks = [1, 2, 3].map(i => ({
          work: async () => i
        }));
        await pg.runBatched(tasks, t => t.work());
        await pg.drain();
      })().catch(err => {
        console.error(err);
        process.exit(1);
      });
    " >/dev/null 2>&1
    
    sleep 1
    
    if [ -f "$AF_PATTERN_METRICS_PATH" ]; then
      record_test "Pattern Metrics E2E" "pass"
    else
      record_test "Pattern Metrics E2E" "fail" "No metrics written"
    fi
  else
    record_test "Pattern Metrics E2E" "skip" "ProcessGovernor not compiled"
  fi
}

# Execute test suites based on mode
case "$TEST_MODE" in
  forward)
    forward_test_suite
    ;;
  backward)
    backward_test_suite
    ;;
  both)
    forward_test_suite
    backward_test_suite
    integration_test
    ;;
  *)
    echo -e "${RED}Invalid mode: $TEST_MODE${NC}"
    echo "Usage: $0 [forward|backward|both] [--circle <circle>]"
    exit 1
    ;;
esac

# Summary
echo
echo -e "${BOLD}=== Test Summary ===${NC}"
TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED + TESTS_SKIPPED))
echo "Total: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo -e "${YELLOW}Skipped: $TESTS_SKIPPED${NC}"

# Calculate success rate
if [ "$TOTAL_TESTS" -gt 0 ]; then
  SUCCESS_RATE=$((TESTS_PASSED * 100 / TOTAL_TESTS))
  echo
  echo -e "Success Rate: ${BOLD}$SUCCESS_RATE%${NC}"
  
  if [ "$SUCCESS_RATE" -ge 90 ]; then
    echo -e "${GREEN}✓ Excellent!${NC}"
  elif [ "$SUCCESS_RATE" -ge 75 ]; then
    echo -e "${YELLOW}⚠ Good, but improvements needed${NC}"
  else
    echo -e "${RED}✗ Critical issues detected${NC}"
  fi
fi

# Exit code based on results
if [ "$TESTS_FAILED" -gt 0 ]; then
  exit 1
else
  exit 0
fi
