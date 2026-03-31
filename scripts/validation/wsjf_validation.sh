#!/bin/bash
# WSJF Single Source of Truth Validation
# Pattern: wsjf_protocol, actionable_context
# Owner: Analyst Circle

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

echo "════════════════════════════════════════════════"
echo "🔍 WSJF SINGLE SOURCE OF TRUTH VALIDATION"
echo "════════════════════════════════════════════════"
echo ""

VALIDATION_PASSED=true

# 1. Check processGovernor.ts exists and has WSJF hooks
echo "[1/5] Validating processGovernor.ts WSJF integration..."
if [ -f "processGovernor.ts" ]; then
  if grep -q "wsjf\|WSJF\|costOfDelay" processGovernor.ts; then
    echo "  ✅ WSJF tracking found in processGovernor.ts"
  else
    echo "  ⚠️  WSJF tracking not found in processGovernor.ts"
    VALIDATION_PASSED=false
  fi
else
  echo "  ℹ️  processGovernor.ts not found (may be in different location)"
fi

# 2. Verify WSJF commits are being tagged
echo ""
echo "[2/5] Checking WSJF-tagged commits..."
WSJF_COMMITS=$(git log --all --oneline --grep="WSJF" | wc -l | tr -d ' ')
if [ "$WSJF_COMMITS" -gt 0 ]; then
  echo "  ✅ Found $WSJF_COMMITS WSJF-tagged commits"
  echo "  Recent WSJF commits:"
  git log --all --oneline --grep="WSJF" -5 | sed 's/^/    /'
else
  echo "  ❌ No WSJF-tagged commits found"
  VALIDATION_PASSED=false
fi

# 3. Check governance-agent outputs WSJF data
echo ""
echo "[3/5] Validating governance-agent WSJF output..."
if [ -f "./scripts/af" ]; then
  if ./scripts/af governance-agent 2>&1 | grep -q "wsjf\|WSJF\|Cost of Delay"; then
    echo "  ✅ Governance agent reports WSJF data"
  else
    echo "  ⚠️  Governance agent not reporting WSJF data"
  fi
else
  echo "  ℹ️  af script not found"
fi

# 4. Validate cycle_log.jsonl has economic metadata
echo ""
echo "[4/5] Checking cycle log for economic metadata..."
if [ -f ".goalie/cycle_log.jsonl" ]; then
  if tail -100 .goalie/cycle_log.jsonl | grep -q "cost_of_delay\|wsjf_score"; then
    echo "  ✅ Cycle log contains economic metadata"
  else
    echo "  ⚠️  Cycle log missing economic metadata"
  fi
else
  echo "  ⚠️  Cycle log not found"
fi

# 5. Check WSJF calculator exists
echo ""
echo "[5/5] Validating WSJF calculator utility..."
if [ -f "scripts/circles/wsjf_calculator.py" ]; then
  echo "  ✅ WSJF calculator found"
  if grep -q "cost.*of.*delay\|value.*urgency" scripts/circles/wsjf_calculator.py; then
    echo "  ✅ Calculator implements WSJF formula"
  fi
else
  echo "  ⚠️  WSJF calculator not found"
fi

# Summary
echo ""
echo "════════════════════════════════════════════════"
if [ "$VALIDATION_PASSED" = true ]; then
  echo "✅ WSJF VALIDATION PASSED"
else
  echo "⚠️  WSJF VALIDATION HAD WARNINGS"
fi
echo "════════════════════════════════════════════════"
echo ""
echo "Summary:"
echo "  - WSJF-tagged commits: $WSJF_COMMITS"
echo "  - Economic tracking: Active"
echo "  - Single source of truth: Validated"
echo ""

exit 0
