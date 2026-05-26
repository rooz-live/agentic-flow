#!/usr/bin/env bash
# agent_session_dor.sh — Pre-task Definition of Ready gate
# Hard-fail if untracked capability files exist in canonical dirs without tests/contracts.
# Enforces: "perceive prior work before creating duplicates" (anti-CVT)
# Usage: ./scripts/agent_session_dor.sh
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

red()   { printf "\033[31m%s\033[0m\n" "$1"; }
green() { printf "\033[32m%s\033[0m\n" "$1"; }
yellow(){ printf "\033[33m%s\033[0m\n" "$1"; }

echo "=== Agent Session DoR (Definition of Ready) ==="
echo ""
EXIT_CODE=0

# ─── 1. Index Perception: What does the committed index contain? ───
echo "--- Committed Index Perception ---"
TRACKED_SRC=$(git ls-files src/ 2>/dev/null | wc -l | tr -d ' ')
TRACKED_TESTS=$(git ls-files tests/ 2>/dev/null | wc -l | tr -d ' ')
TRACKED_SCRIPTS=$(git ls-files scripts/ 2>/dev/null | wc -l | tr -d ' ')
TRACKED_DEPLOY=$(git ls-files deploy/ 2>/dev/null | wc -l | tr -d ' ')

echo "  src/ tracked: $TRACKED_SRC"
echo "  tests/ tracked: $TRACKED_TESTS"
echo "  scripts/ tracked: $TRACKED_SCRIPTS"
echo "  deploy/ tracked: $TRACKED_DEPLOY"

if [[ "$TRACKED_SRC" -lt 10 ]]; then
  red "  FAIL: Index appears stale or empty ($TRACKED_SRC src files)"
  EXIT_CODE=1
fi
echo ""

# ─── 2. Untracked Capability Check ───
# Fail if untracked executable capability files exist in canonical dirs
# (doc/template/example suffixes excluded)
echo "--- Untracked Capability Files (anti-CVT) ---"
UNTRACKED_BAD=$(git ls-files --others --exclude-standard 2>/dev/null | \
  grep -E "^(scripts/|tests/|config/|src/|tooling/)" | \
  grep -vE "\.(md|json|example|template|sample|bak|backup|log|txt)$" | \
  head -20)

if [[ -n "$UNTRACKED_BAD" ]]; then
  yellow "  WARNING: Untracked capability files detected in canonical dirs:"
  echo "$UNTRACKED_BAD" | while read -r f; do echo "    ? $f"; done
  echo ""
  yellow "  These MAY represent prior work that was never committed (CVT risk)."
  yellow "  Before creating NEW capabilities, verify these don't already solve your task."
  # Non-blocking warning (upgrade to EXIT_CODE=1 when ready to enforce hard-fail)
else
  green "  Clean: No untracked capability files in canonical dirs."
fi
echo ""

# ─── 3. MPP Core Files Check ───
echo "--- MPP Layer (Method Pattern Protocol) ---"
MPP_FILES="src/methods/mpp_core.py src/patterns/pattern_catalog.py src/protocols/mcp_registry.py"
MPP_PRESENT=0
for f in $MPP_FILES; do
  if git ls-files --error-unmatch "$f" &>/dev/null; then
    MPP_PRESENT=$((MPP_PRESENT + 1))
  fi
done
echo "  MPP core tracked: $MPP_PRESENT/3"
if [[ $MPP_PRESENT -lt 3 ]]; then
  yellow "  WARNING: MPP layer incomplete ($MPP_PRESENT/3)"
fi
echo ""

# ─── 4. Evidence Check: Last gate pass ───
echo "--- Last Evidence Artifact ---"
LAST_EVIDENCE=$(ls -t .goalie/evidence/domain-probes/probe_*.json 2>/dev/null | head -1)
if [[ -n "$LAST_EVIDENCE" ]]; then
  VERDICT=$(python3 -c "import json; d=json.load(open('$LAST_EVIDENCE')); print(d.get('summary',{}).get('verdict','UNKNOWN'))" 2>/dev/null || echo "PARSE_ERROR")
  echo "  Last probe: $LAST_EVIDENCE → $VERDICT"
else
  yellow "  No domain probe evidence found. Run: ./scripts/verify-domain-probes.sh"
fi
echo ""

# ─── 5. Green Baseline Quick Check ───
echo "--- Green Baseline (quick) ---"
PYTEST_SUMMARY=$(python3 -m pytest tests/billing/ tests/coherence/ tests/beads/ \
  --rootdir=tests -q --tb=no --ignore=tests/integrations 2>&1 | tail -1)
echo "  $PYTEST_SUMMARY"
if echo "$PYTEST_SUMMARY" | grep -q "failed"; then
  red "  FAIL: Core test baseline broken"
  EXIT_CODE=1
fi
echo ""

# ─── Summary ───
if [[ $EXIT_CODE -eq 0 ]]; then
  green "=== DoR PASSED — Agent may proceed ==="
else
  red "=== DoR FAILED — Fix issues before starting new work ==="
fi

exit $EXIT_CODE
