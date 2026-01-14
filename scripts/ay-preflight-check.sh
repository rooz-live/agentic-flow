#!/usr/bin/env bash
# Pre-flight checklist for continuous improvement

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_ok() { echo -e "  ${GREEN}✓${NC} $*"; }
log_warn() { echo -e "  ${YELLOW}⚠${NC} $*"; }
log_error() { echo -e "  ${RED}✗${NC} $*"; }
log_info() { echo -e "  ${BLUE}▶${NC} $*"; }

ERRORS=0
WARNINGS=0

echo "🚦 Pre-Flight Checklist for Continuous Improvement"
echo ""

# 1. Check dependencies
echo "▶ 1. Dependencies"
if command -v jq >/dev/null 2>&1; then
  log_ok "jq installed"
else
  log_error "jq MISSING (install: brew install jq)"
  ((ERRORS++))
fi

if command -v sqlite3 >/dev/null 2>&1; then
  log_ok "sqlite3 installed"
else
  log_error "sqlite3 MISSING"
  ((ERRORS++))
fi

if command -v npx >/dev/null 2>&1; then
  log_ok "npx installed"
else
  log_error "npx MISSING (install: npm install -g npm)"
  ((ERRORS++))
fi

# 2. Verify AgentDB
echo ""
echo "▶ 2. AgentDB Health"

if [[ -f "$PROJECT_ROOT/agentdb.db" ]]; then
  log_ok "agentdb.db exists"
  
  # Check skills
  SKILLS=$(sqlite3 "$PROJECT_ROOT/agentdb.db" "SELECT COUNT(*) FROM skills;" 2>/dev/null || echo "0")
  if [[ "$SKILLS" -gt 0 ]]; then
    log_ok "Skills: $SKILLS (learning can function)"
  else
    log_warn "Skills: 0 (learning will use empty baseline)"
    log_info "This is OK for first run - skills will accumulate"
    ((WARNINGS++))
  fi
  
  # Check observations
  OBS=$(sqlite3 "$PROJECT_ROOT/agentdb.db" "SELECT COUNT(*) FROM observations;" 2>/dev/null || echo "0")
  if [[ "$OBS" -ge 30 ]]; then
    log_ok "Observations: $OBS (sufficient for learning)"
  else
    log_warn "Observations: $OBS/30 (need more for causal learning)"
    log_info "Run: scripts/ay-yo-continuous-improvement.sh run 20 quick"
    ((WARNINGS++))
  fi
  
  # Check experiments
  EXP=$(sqlite3 "$PROJECT_ROOT/agentdb.db" "SELECT COUNT(*) FROM experiments;" 2>/dev/null || echo "0")
  log_info "Experiments: $EXP"
  
else
  log_error "agentdb.db MISSING (run: npx agentdb init)"
  ((ERRORS++))
fi

# 3. Check critical scripts
echo ""
echo "▶ 3. Critical Scripts"
for script in ay-yo-integrate.sh ay-yo-continuous-improvement.sh ay-wsjf-runner.sh; do
  if [[ -f "$SCRIPT_DIR/$script" ]]; then
    log_ok "$script exists"
  else
    log_error "$script MISSING"
    ((ERRORS++))
  fi
done

# 4. Verify configuration
echo ""
echo "▶ 4. Configuration"
if [[ -f "$PROJECT_ROOT/config/dor-budgets.json" ]]; then
  if jq empty "$PROJECT_ROOT/config/dor-budgets.json" 2>/dev/null; then
    log_ok "dor-budgets.json valid"
    
    # Check all circles have budgets
    for circle in orchestrator assessor analyst innovator seeker intuitive; do
      if jq -e ".${circle}" "$PROJECT_ROOT/config/dor-budgets.json" >/dev/null 2>&1; then
        log_ok "  Budget for $circle: $(jq -r ".${circle}.dor_minutes" "$PROJECT_ROOT/config/dor-budgets.json") min"
      else
        log_warn "  Missing budget for $circle"
        ((WARNINGS++))
      fi
    done
  else
    log_error "dor-budgets.json INVALID JSON"
    ((ERRORS++))
  fi
else
  log_error "dor-budgets.json MISSING"
  ((ERRORS++))
fi

# 5. Test single ceremony
echo ""
echo "▶ 5. Test Single Ceremony (orchestrator/standup)"
if "$SCRIPT_DIR/ay-yo-integrate.sh" exec orchestrator standup advisory 2>&1 | grep -q "DoD Validation"; then
  log_ok "Test ceremony successful"
else
  log_warn "Test ceremony had issues (check logs)"
  ((WARNINGS++))
fi

# 6. Check circle equity
echo ""
echo "▶ 6. Circle Equity Status"
EQUITY_OUTPUT=$("$SCRIPT_DIR/ay-yo-integrate.sh" dashboard 2>/dev/null | grep -A 10 "Circle Equity")

if echo "$EQUITY_OUTPUT" | grep -q "orchestrator"; then
  ORCH_COUNT=$(echo "$EQUITY_OUTPUT" | grep orchestrator | awk '{print $3}')
  
  # Get total ceremonies
  TOTAL=$(sqlite3 "$PROJECT_ROOT/agentdb.db" "SELECT COUNT(*) FROM observations;" 2>/dev/null || echo "77")
  
  if [[ "$TOTAL" -gt 0 ]]; then
    ORCH_PCT=$((ORCH_COUNT * 100 / TOTAL))
    
    if [[ $ORCH_PCT -gt 50 ]]; then
      log_error "Orchestrator overused: ${ORCH_PCT}% (target: <40%)"
      log_info "Run: scripts/ay-wsjf-runner.sh balance 30"
      ((ERRORS++))
    elif [[ $ORCH_PCT -gt 40 ]]; then
      log_warn "Orchestrator high: ${ORCH_PCT}% (target: <40%)"
      ((WARNINGS++))
    else
      log_ok "Circle equity acceptable: orchestrator at ${ORCH_PCT}%"
    fi
  fi
fi

# 7. Resource checks
echo ""
echo "▶ 7. Resource Availability"

# Disk
DISK_PCT=$(df -h "$PROJECT_ROOT" | tail -1 | awk '{print $5}' | tr -d '%')
if [[ $DISK_PCT -ge 90 ]]; then
  log_error "Disk: ${DISK_PCT}% CRITICAL (run: scripts/ay-yo-cleanup.sh)"
  ((ERRORS++))
elif [[ $DISK_PCT -ge 80 ]]; then
  log_warn "Disk: ${DISK_PCT}% HIGH (consider cleanup)"
  ((WARNINGS++))
else
  log_ok "Disk: ${DISK_PCT}% OK"
fi

# Memory (MacOS)
PAGES_FREE=$(vm_stat | grep "Pages free" | awk '{print $3}' | tr -d '.')
MEM_FREE_MB=$((PAGES_FREE * 4096 / 1024 / 1024))
if [[ $MEM_FREE_MB -lt 200 ]]; then
  log_error "Memory: ${MEM_FREE_MB}MB CRITICAL"
  ((ERRORS++))
elif [[ $MEM_FREE_MB -lt 500 ]]; then
  log_warn "Memory: ${MEM_FREE_MB}MB LOW"
  ((WARNINGS++))
else
  log_ok "Memory: ${MEM_FREE_MB}MB OK"
fi

# 8. Check for running daemons
echo ""
echo "▶ 8. Daemon Status"
if pgrep -f "ay-yo-continuous-improvement.sh daemon" >/dev/null 2>&1; then
  PID=$(pgrep -f "ay-yo-continuous-improvement.sh daemon" | head -1)
  log_warn "Daemon already running (PID: $PID)"
  log_info "Stop with: kill $PID"
  ((WARNINGS++))
else
  log_ok "No daemon running (safe to start)"
fi

# Summary
echo ""
echo "═══════════════════════════════════════════"
echo "  Pre-Flight Summary"
echo "═══════════════════════════════════════════"
echo ""
echo "  Errors: $ERRORS"
echo "  Warnings: $WARNINGS"
echo ""

if [[ $ERRORS -gt 0 ]]; then
  echo -e "${RED}✗ NOT READY${NC} - Fix $ERRORS error(s) before starting"
  exit 1
elif [[ $WARNINGS -gt 0 ]]; then
  echo -e "${YELLOW}⚠ CAUTION${NC} - $WARNINGS warning(s) detected"
  echo ""
  echo "Safe to proceed, but consider addressing warnings:"
  echo "  • Complete baseline if observations < 30"
  echo "  • Balance circles if orchestrator > 40%"
  echo "  • Clean up resources if disk/memory high"
  exit 2
else
  echo -e "${GREEN}✅ READY${NC} - Safe to start continuous improvement"
  echo ""
  echo "Start with:"
  echo "  scripts/ay-wsjf-runner.sh production"
  echo ""
  echo "Or manual:"
  echo "  scripts/ay-yo-continuous-improvement.sh daemon 1800 3"
  exit 0
fi
