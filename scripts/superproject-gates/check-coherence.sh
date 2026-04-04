#!/bin/bash
# P2-LIVE: Coherence Check Script for CI Integration
# Validates pattern consistency across codebase and checks system coherence score
#
# Exit codes:
#   0 = Coherence check passed
#   1 = Coherence below threshold
#   2 = Critical coherence failure

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Configuration
COHERENCE_THRESHOLD=${COHERENCE_THRESHOLD:-0.85}
PATTERN_CONSISTENCY_THRESHOLD=${PATTERN_CONSISTENCY_THRESHOLD:-0.80}

echo "=== Coherence Check ==="
echo "Project Root: $PROJECT_ROOT"
echo "Coherence Threshold: $COHERENCE_THRESHOLD"
echo "Pattern Consistency Threshold: $PATTERN_CONSISTENCY_THRESHOLD"
echo ""

# Initialize scores
CODE_DOCUMENTATION_ALIGNMENT=1.0
PATTERN_CONSISTENCY=1.0
TYPE_COVERAGE=1.0
TEST_EVIDENCE=1.0

# 1. Check code-documentation alignment
echo "📋 Checking code-documentation alignment..."
DOC_COUNT=$(find "$PROJECT_ROOT/docs" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
SRC_COUNT=$(find "$PROJECT_ROOT/src" -name "*.ts" 2>/dev/null | wc -l | tr -d ' ')
if [ "$SRC_COUNT" -gt 0 ]; then
  RATIO=$(echo "scale=2; $DOC_COUNT / $SRC_COUNT" | bc)
  if (( $(echo "$RATIO < 0.1" | bc -l) )); then
    echo "  ⚠️ Low documentation ratio: $DOC_COUNT docs / $SRC_COUNT source files"
    CODE_DOCUMENTATION_ALIGNMENT=0.7
  else
    echo "  ✓ Documentation ratio acceptable: $DOC_COUNT docs / $SRC_COUNT source files"
  fi
fi

# 2. Check pattern consistency
echo "📐 Checking pattern consistency..."
if [ -f "$PROJECT_ROOT/.goalie/pattern_metrics.jsonl" ]; then
  PATTERN_COUNT=$(wc -l < "$PROJECT_ROOT/.goalie/pattern_metrics.jsonl" | tr -d ' ')
  # Check patterns have rationales
  RATIONALE_COUNT=$(grep -c '"rationale":' "$PROJECT_ROOT/.goalie/pattern_metrics.jsonl" 2>/dev/null || echo "0")
  if [ "$PATTERN_COUNT" -gt 0 ]; then
    PATTERN_CONSISTENCY=$(echo "scale=2; $RATIONALE_COUNT / $PATTERN_COUNT" | bc)
    echo "  Pattern coverage: $RATIONALE_COUNT / $PATTERN_COUNT patterns documented"
  fi
else
  echo "  ⚠️ No pattern metrics file found"
  PATTERN_CONSISTENCY=0.5
fi

# 3. Check TypeScript compilation health
echo "🔧 Checking TypeScript health..."
if npx tsc --noEmit 2>/dev/null; then
  echo "  ✓ TypeScript compiles without errors"
  TYPE_COVERAGE=1.0
else
  echo "  ⚠️ TypeScript compilation errors detected"
  TYPE_COVERAGE=0.6
fi

# 4. Check test evidence
echo "🧪 Checking test evidence..."
if [ -d "$PROJECT_ROOT/src/tests" ]; then
  TEST_COUNT=$(find "$PROJECT_ROOT/src/tests" -name "*.test.ts" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$TEST_COUNT" -gt 50 ]; then
    echo "  ✓ $TEST_COUNT test files found"
    TEST_EVIDENCE=1.0
  elif [ "$TEST_COUNT" -gt 10 ]; then
    echo "  ⚠️ Low test count: $TEST_COUNT files"
    TEST_EVIDENCE=0.7
  else
    echo "  ❌ Very few tests: $TEST_COUNT files"
    TEST_EVIDENCE=0.3
  fi
fi

# 5. Check ROAM tracker freshness
echo "📊 Checking ROAM tracker freshness..."
if [ -f "$PROJECT_ROOT/.goalie/ROAM_TRACKER.yaml" ]; then
  LAST_UPDATED=$(grep "last_updated:" "$PROJECT_ROOT/.goalie/ROAM_TRACKER.yaml" | head -1 | sed 's/.*"\(.*\)".*/\1/')
  echo "  ROAM last updated: $LAST_UPDATED"
else
  echo "  ⚠️ No ROAM tracker found"
fi

# Calculate overall coherence score
COHERENCE=$(echo "scale=3; ($CODE_DOCUMENTATION_ALIGNMENT + $PATTERN_CONSISTENCY + $TYPE_COVERAGE + $TEST_EVIDENCE) / 4" | bc)
echo ""
echo "=== Coherence Summary ==="
echo "  Code-Documentation Alignment: $CODE_DOCUMENTATION_ALIGNMENT"
echo "  Pattern Consistency: $PATTERN_CONSISTENCY"
echo "  TypeScript Health: $TYPE_COVERAGE"
echo "  Test Evidence: $TEST_EVIDENCE"
echo "  ─────────────────────────────"
echo "  Overall Coherence Score: $COHERENCE"
echo ""

# Evaluate result
if (( $(echo "$COHERENCE < 0.5" | bc -l) )); then
  echo "❌ CRITICAL: Coherence score $COHERENCE is critically low"
  exit 2
elif (( $(echo "$COHERENCE < $COHERENCE_THRESHOLD" | bc -l) )); then
  echo "⚠️ WARNING: Coherence score $COHERENCE is below threshold $COHERENCE_THRESHOLD"
  exit 1
else
  echo "✅ PASS: Coherence score $COHERENCE meets threshold $COHERENCE_THRESHOLD"
  exit 0
fi

