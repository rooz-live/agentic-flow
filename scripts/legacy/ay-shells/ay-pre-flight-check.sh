#!/usr/bin/env bash
# ay-pre-flight-check.sh - Pre-flight checklist for continuous improvement
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚦 Pre-Flight Checklist for Continuous Improvement${NC}"
echo ""

PASSED=0
FAILED=0

check_pass() {
    echo -e "  ${GREEN}✓${NC} $1"
    PASSED=$((PASSED + 1))
}

check_fail() {
    echo -e "  ${RED}✗${NC} $1"
    FAILED=$((FAILED + 1))
}

check_warn() {
    echo -e "  ${YELLOW}⚠${NC} $1"
}

# 1. Check dependencies
echo -e "${BLUE}▶ 1. Dependencies${NC}"
command -v jq >/dev/null && check_pass "jq installed" || check_fail "jq MISSING (install: brew install jq)"
command -v sqlite3 >/dev/null && check_pass "sqlite3 installed" || check_fail "sqlite3 MISSING"
command -v npx >/dev/null && check_pass "npx installed" || check_fail "npx MISSING"
command -v python3 >/dev/null && check_pass "python3 installed" || check_fail "python3 MISSING"

# 2. Verify AgentDB
echo ""
echo -e "${BLUE}▶ 2. AgentDB Health${NC}"
if timeout 5 npx agentdb stats &>/dev/null; then
  EPISODES=$(npx agentdb stats 2>/dev/null | grep "Episodes:" | awk '{print $2}')
  SKILLS=$(npx agentdb stats 2>/dev/null | grep "Skills:" | awk '{print $2}')
  
  if [ "$EPISODES" -gt 0 ]; then
    check_pass "Episodes: $EPISODES (database active)"
  else
    check_warn "Episodes: 0 (new database)"
  fi
  
  if [ "$SKILLS" -gt 0 ]; then
    check_pass "Skills: $SKILLS (learning enabled)"
  else
    check_warn "Skills: 0 (learning NOT ENABLED - will use static mapping)"
    echo -e "    ${YELLOW}→ Skills will be learned from episodes over time${NC}"
  fi
else
  check_fail "AgentDB not responding (timeout after 5s)"
fi

# 3. Check critical scripts
echo ""
echo -e "${BLUE}▶ 3. Critical Scripts${NC}"
for script in ay-prod-cycle.sh mcp-health-check.sh export-skills-cache.sh; do
  if [ -f "$SCRIPT_DIR/$script" ]; then
    if [ -x "$SCRIPT_DIR/$script" ]; then
      check_pass "$script (executable)"
    else
      check_warn "$script (not executable - chmod +x needed)"
    fi
  else
    check_fail "$script MISSING"
  fi
done

# 4. Verify cache directory
echo ""
echo -e "${BLUE}▶ 4. Skills Cache${NC}"
if [ -d "$ROOT_DIR/.cache/skills" ]; then
  CACHE_FILES=$(ls -1 "$ROOT_DIR/.cache/skills" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$CACHE_FILES" -gt 0 ]; then
    check_pass "Skills cache: $CACHE_FILES files"
  else
    check_warn "Skills cache empty (run: ./scripts/export-skills-cache.sh)"
  fi
else
  check_fail ".cache/skills directory MISSING"
fi

# 5. Test AgentDB CLI
echo ""
echo -e "${BLUE}▶ 5. AgentDB CLI Test${NC}"
if timeout 3 npx agentdb --version &>/dev/null; then
  VERSION=$(npx agentdb --version 2>&1 | grep -o 'v[0-9.]*' || echo "unknown")
  check_pass "AgentDB CLI: $VERSION"
else
  check_fail "AgentDB CLI not responding"
fi

# 6. Check production cycle script
echo ""
echo -e "${BLUE}▶ 6. Production Cycle Test${NC}"
if timeout 5 "$SCRIPT_DIR/ay-prod-cycle.sh" list-circles &>/dev/null; then
  check_pass "ay-prod-cycle.sh functional"
else
  check_fail "ay-prod-cycle.sh FAILED (check logs)"
fi

# Summary
echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}✅ Pre-flight complete - safe to start continuous mode${NC}"
  echo -e "   Passed: $PASSED checks"
  exit 0
else
  echo -e "${RED}❌ Pre-flight FAILED - fix issues before continuous mode${NC}"
  echo -e "   Passed: $PASSED checks"
  echo -e "   Failed: $FAILED checks"
  exit 1
fi
