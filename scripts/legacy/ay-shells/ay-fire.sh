#!/usr/bin/env bash
# ay-fire.sh - FIRE (Focused Incremental Relentless Execution)
set -euo pipefail

echo "🔥 AY FIRE - Identifying Critical Issues"
echo

# Check 1: Test failures
echo "1. Test Failures Analysis..."
npm test 2>&1 | grep -E "(failed|FAIL)" | head -10 || echo "✓ No critical test failures"

# Check 2: TypeScript errors
echo
echo "2. TypeScript Errors..."
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l || echo "✓ No TypeScript errors"

# Check 3: ROAM staleness
echo
echo "3. ROAM Assessment..."
bash "$(dirname "$0")/ay-assess.sh" 2>&1 | grep -E "(Health|Priority)" || echo "✓ ROAM healthy"

# Check 4: Missing patterns
echo
echo "4. Observability Patterns..."
find . -name "*.ts" -type f ! -path "*/node_modules/*" -exec grep -l "TODO.*observability" {} \; | wc -l || echo "✓ No missing patterns"

echo
echo "🔥 FIRE Analysis Complete"
