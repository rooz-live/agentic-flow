#!/usr/bin/env bash
# dod-gate.sh — Definition of Done enforcement gate
# Run BEFORE any commit claim. Breaks the CVT cycle.
# Usage: ./scripts/dod-gate.sh [--pre-task|--post-task|--full]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MODE="${1:---full}"
EXIT_CODE=0

red()   { printf "\033[31m%s\033[0m\n" "$1"; }
green() { printf "\033[32m%s\033[0m\n" "$1"; }
yellow(){ printf "\033[33m%s\033[0m\n" "$1"; }

echo "=== DoD Gate ($MODE) ==="
echo "Project: $PROJECT_ROOT"
echo ""

# ─── PRE-TASK: Query index before starting work ───
if [[ "$MODE" == "--pre-task" || "$MODE" == "--full" ]]; then
  echo "--- PRE-TASK: Index Perception Check ---"
  
  # Count tracked files in key directories
  TRACKED_SRC=$(git -C "$PROJECT_ROOT" ls-files src/ 2>/dev/null | wc -l | tr -d ' ')
  TRACKED_TESTS=$(git -C "$PROJECT_ROOT" ls-files tests/ 2>/dev/null | wc -l | tr -d ' ')
  TRACKED_DOMAIN=$(git -C "$PROJECT_ROOT" ls-files domain/ 2>/dev/null | wc -l | tr -d ' ')
  
  echo "  Tracked src/ files: $TRACKED_SRC"
  echo "  Tracked tests/ files: $TRACKED_TESTS"
  echo "  Tracked domain/ files: $TRACKED_DOMAIN"
  
  # Check for capability that already exists (anti-reinvention)
  if [[ $TRACKED_SRC -gt 0 ]]; then
    green "  Index is NOT stale — $TRACKED_SRC src files visible"
  else
    red "  WARNING: Index appears empty — check git status"
    EXIT_CODE=1
  fi
  
  # Key MPP layer check
  MPP_FILES="src/methods/mpp_core.py src/patterns/pattern_catalog.py src/protocols/mcp_registry.py"
  MPP_PRESENT=0
  for f in $MPP_FILES; do
    if git -C "$PROJECT_ROOT" ls-files --error-unmatch "$f" &>/dev/null; then
      MPP_PRESENT=$((MPP_PRESENT + 1))
    fi
  done
  echo "  MPP layer tracked: $MPP_PRESENT/3 core files"
  echo ""
fi

# ─── POST-TASK: Verify green baseline ───
if [[ "$MODE" == "--post-task" || "$MODE" == "--full" ]]; then
  echo "--- POST-TASK: Green Baseline Verification ---"
  
  # pytest check
  echo -n "  pytest: "
  PYTEST_RESULT=$(cd "$PROJECT_ROOT" && python3 -m pytest tests/ --rootdir=tests -q --tb=line --ignore=tests/integrations 2>&1 | tail -1)
  if echo "$PYTEST_RESULT" | grep -q "passed"; then
    green "  $PYTEST_RESULT"
  else
    red "  FAIL: $PYTEST_RESULT"
    EXIT_CODE=1
  fi
  
  # Playwright discovery check
  echo -n "  Playwright: "
  PW_COUNT=$(cd "$PROJECT_ROOT" && npx playwright test --list 2>/dev/null | grep -c "test" || echo "0")
  if [[ $PW_COUNT -gt 0 ]]; then
    green "  $PW_COUNT tests discoverable"
  else
    yellow "  WARNING: Playwright list returned 0 tests"
  fi
  
  # Staged files check
  echo -n "  Staged: "
  STAGED=$(git -C "$PROJECT_ROOT" diff --cached --stat 2>/dev/null | tail -1)
  if [[ -n "$STAGED" ]]; then
    green "  $STAGED"
  else
    yellow "  No staged changes (nothing to commit)"
  fi
  echo ""
fi

# ─── DoD CHECKLIST ───
if [[ "$MODE" == "--full" ]]; then
  echo "--- DoD Checklist ---"
  echo "  [ ] Schema Locked: specs in /docs/api/"
  echo "  [ ] Scale Quantified: req/s target defined"
  echo "  [ ] Threat Model: billing tampering prevention"
  echo "  [ ] WSJF Approved: Score > threshold"
  echo "  [ ] Test Coverage: >80% pytest + Playwright E2E"
  echo "  [ ] Load Verified: 150% synthetic load"
  echo "  [ ] Docs Published: /docs/ with sequence diagrams"
  echo "  [ ] Backward Compatible: Schema regression passes"
  echo ""
fi

if [[ $EXIT_CODE -eq 0 ]]; then
  green "=== DoD Gate PASSED ==="
else
  red "=== DoD Gate FAILED ==="
fi

exit $EXIT_CODE
