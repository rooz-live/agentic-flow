#!/usr/bin/env bash
# dod-gate.sh — Definition of Done enforcement gate
# Run BEFORE any commit claim. Breaks the CVT cycle.
# Usage: ./scripts/dod-gate.sh [--pre-task|--post-task|--full]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
# Delegate read-only perception to canonical tooling gate
if [[ "${1:-}" == "--perceive" && -x "$PROJECT_ROOT/code/tooling/scripts/dod-gate.sh" ]]; then
  exec "$PROJECT_ROOT/code/tooling/scripts/dod-gate.sh" "$@"
fi

MODE="${1:---full}"
EXIT_CODE=0

red()   { printf "\033[31m%s\033[0m\n" "$1"; }
green() { printf "\033[32m%s\033[0m\n" "$1"; }
yellow(){ printf "\033[33m%s\033[0m\n" "$1"; }

dor_script() {
  if [[ -x "$PROJECT_ROOT/code/tooling/scripts/agent_session_dor.sh" ]]; then
    echo "$PROJECT_ROOT/code/tooling/scripts/agent_session_dor.sh"
  elif [[ -x "$SCRIPT_DIR/agent_session_dor.sh" ]]; then
    echo "$SCRIPT_DIR/agent_session_dor.sh"
  fi
}

echo "=== DoD Gate ($MODE) ==="
echo "Project: $PROJECT_ROOT"
echo ""

if [[ "$MODE" == "--pre-task" || "$MODE" == "--full" ]]; then
  echo "--- PRE-TASK: Index Perception Check ---"
  TRACKED_SRC=$(git -C "$PROJECT_ROOT" ls-files src/ 2>/dev/null | wc -l | tr -d ' ')
  TRACKED_TESTS=$(git -C "$PROJECT_ROOT" ls-files tests/ 2>/dev/null | wc -l | tr -d ' ')
  TRACKED_DOMAIN=$(git -C "$PROJECT_ROOT" ls-files domain/ 2>/dev/null | wc -l | tr -d ' ')
  echo "  Tracked src/ files: $TRACKED_SRC"
  echo "  Tracked tests/ files: $TRACKED_TESTS"
  echo "  Tracked domain/ files: $TRACKED_DOMAIN"
  if [[ $TRACKED_SRC -gt 0 ]]; then
    green "  Index is NOT stale — $TRACKED_SRC src files visible"
  else
    red "  FAIL: Index appears empty — check git status"
    EXIT_CODE=1
  fi
  MPP_FILES="src/methods/mpp_core.py src/patterns/pattern_catalog.py src/protocols/mcp_registry.py"
  MPP_PRESENT=0
  for f in $MPP_FILES; do
    if git -C "$PROJECT_ROOT" ls-files --error-unmatch "$f" &>/dev/null; then
      MPP_PRESENT=$((MPP_PRESENT + 1))
    fi
  done
  echo "  MPP layer tracked: $MPP_PRESENT/3 core files"
  DOR="$(dor_script || true)"
  if [[ -n "$DOR" ]]; then
    echo -n "  Untracked capability gate: "
    if "$DOR" >/tmp/agent_session_dor.out 2>&1; then
      green "  pass"
    else
      red "  FAIL — see /tmp/agent_session_dor.out"
      head -20 /tmp/agent_session_dor.out >&2 || true
      EXIT_CODE=1
    fi
  else
    yellow "  SKIP: agent_session_dor.sh not installed"
  fi
  if [[ -x "$SCRIPT_DIR/perceive-trust-artifact.sh" ]]; then
    echo -n "  Trust artifact perception: "
    if "$SCRIPT_DIR/perceive-trust-artifact.sh" --check >/tmp/perceive_trust.out 2>&1; then
      green "  pass (read-only, no trust-path rerun)"
    else
      yellow "  WARN — stale/missing artifact (see /tmp/perceive_trust.out)"
      cat /tmp/perceive_trust.out | head -5
    fi
    if [[ -f "$PROJECT_ROOT/.goalie/evidence/perception_snapshot.json" ]]; then
      echo "  Snapshot: .goalie/evidence/perception_snapshot.json"
    fi
  fi
  echo ""
fi

if [[ "$MODE" == "--post-task" || "$MODE" == "--full" ]]; then
  echo "--- POST-TASK: Green Baseline Verification ---"
  echo -n "  pytest: "
  PYTEST_RESULT=$(cd "$PROJECT_ROOT" && PYTHONPATH="/usr/local/lib/python3.14/site-packages" python3 -m pytest tests/billing/ tests/pytest/ -q --tb=line 2>&1 | tail -1)
  if echo "$PYTEST_RESULT" | grep -qE "[0-9]+ passed" && ! echo "$PYTEST_RESULT" | grep -qE "[1-9][0-9]* failed"; then
    green "  $PYTEST_RESULT"
  else
    red "  FAIL: $PYTEST_RESULT"
    EXIT_CODE=1
  fi
  echo -n "  Playwright: "
  PW_TOTAL=$(cd "$PROJECT_ROOT" && PLAYWRIGHT_TLD_ONLY=1 npx playwright test --list tests/billing-platform-integration.e2e.spec.ts 2>/dev/null | grep "Total:" | grep -oE "[0-9]+" | head -1 || echo "0")
  if [[ -n "$PW_TOTAL" && "$PW_TOTAL" -gt 0 ]]; then
    green "  $PW_TOTAL tests discoverable"
  else
    red "  FAIL: Playwright list returned 0 tests"
    EXIT_CODE=1
  fi
  echo -n "  Staged: "
  if git -C "$PROJECT_ROOT" diff --cached --stat 2>/dev/null | grep -q "."; then
    STAGED=$(git -C "$PROJECT_ROOT" diff --cached --stat 2>/dev/null | tail -1)
    green "  $STAGED"
  else
    if [[ "$MODE" == "--post-task" ]]; then
      red "  FAIL: No staged changes (CVT gate — nothing to commit)"
      EXIT_CODE=1
    else
      yellow "  No staged changes (nothing to commit)"
    fi
  fi
  echo ""
fi

if [[ "$MODE" == "--full" ]]; then
  echo "--- DoD Checklist (PI / deploy — not required for every commit) ---"
  echo "  [ ] public_synthetic_check.sh exit 0 on billing.bhopti.com"
  echo "  [ ] trust-path artifact: .goalie/evidence/last_gate_one_pass.json"
  echo ""
fi

if [[ $EXIT_CODE -eq 0 ]]; then
  green "=== DoD Gate PASSED ==="
else
  red "=== DoD Gate FAILED ==="
fi
exit $EXIT_CODE
