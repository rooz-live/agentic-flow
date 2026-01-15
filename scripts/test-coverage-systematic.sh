#!/bin/bash

# Test Coverage Systematic Gap Analysis and Filling
# Target: 80% overall coverage, 90% critical paths

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORTS_DIR="$PROJECT_ROOT/reports/coverage"
TIMESTAMP=$(date +%s)

mkdir -p "$REPORTS_DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Test Coverage Systematic Analysis"
echo "  Target: 80% overall, 90% critical paths"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Run coverage analysis
echo "[COVERAGE] Running Jest with coverage..."
cd "$PROJECT_ROOT"
npm test -- --coverage --coverageReporters=json --coverageReporters=text --coverageReporters=lcov 2>&1 | tee "$REPORTS_DIR/coverage-run-$TIMESTAMP.log"

# 2. Parse coverage JSON
COVERAGE_JSON="$PROJECT_ROOT/coverage/coverage-final.json"
if [ ! -f "$COVERAGE_JSON" ]; then
    echo "⚠ Coverage JSON not found at $COVERAGE_JSON"
    exit 1
fi

# 3. Analyze gaps by directory
echo ""
echo "[GAP ANALYSIS] Identifying untested modules..."

cat > "$REPORTS_DIR/gap-analysis-$TIMESTAMP.json" <<EOF
{
    "timestamp": "$TIMESTAMP",
    "target_coverage": 80,
    "critical_target": 90,
    "gaps": []
}
EOF

# 4. Find files without tests
echo "[GAP ANALYSIS] Scanning for files without corresponding tests..."

GAPS_FOUND=0

for SOURCE_FILE in $(find "$PROJECT_ROOT/src" -type f -name "*.ts" -not -path "*/node_modules/*" -not -path "*/__tests__/*"); do
    REL_PATH=${SOURCE_FILE#$PROJECT_ROOT/src/}
    BASE_NAME=$(basename "$SOURCE_FILE" .ts)
    DIR_NAME=$(dirname "$SOURCE_FILE")
    
    # Check for test file patterns
    TEST_PATTERNS=(
        "$PROJECT_ROOT/tests/**/$BASE_NAME.test.ts"
        "$PROJECT_ROOT/tests/**/${BASE_NAME}.test.ts"
        "$DIR_NAME/__tests__/$BASE_NAME.test.ts"
        "$DIR_NAME/$BASE_NAME.test.ts"
    )
    
    HAS_TEST=false
    for PATTERN in "${TEST_PATTERNS[@]}"; do
        if ls $PATTERN 2>/dev/null | grep -q .; then
            HAS_TEST=true
            break
        fi
    done
    
    if [ "$HAS_TEST" = false ]; then
        echo "  ⚠ Missing test: $REL_PATH"
        ((GAPS_FOUND++))
    fi
done

echo ""
echo "[GAP ANALYSIS] Found $GAPS_FOUND files without tests"

# 5. Identify critical paths needing 90% coverage
echo ""
echo "[CRITICAL PATHS] Identifying modules requiring 90% coverage..."

CRITICAL_PATHS=(
    "src/governance/"
    "src/mithra/"
    "src/observability/"
    "src/circuits/"
    "src/database/"
    "src/security/"
)

for CRITICAL_PATH in "${CRITICAL_PATHS[@]}"; do
    echo "  Analyzing: $CRITICAL_PATH"
    # Count files and tests
    SOURCE_COUNT=$(find "$PROJECT_ROOT/$CRITICAL_PATH" -type f -name "*.ts" -not -path "*/__tests__/*" -not -path "*/node_modules/*" 2>/dev/null | wc -l)
    TEST_COUNT=$(find "$PROJECT_ROOT/tests" "$PROJECT_ROOT/$CRITICAL_PATH" -type f -name "*.test.ts" -path "*${CRITICAL_PATH#src/}*" 2>/dev/null | wc -l)
    
    if [ "$SOURCE_COUNT" -gt 0 ]; then
        COVERAGE_PERCENT=$((TEST_COUNT * 100 / SOURCE_COUNT))
        echo "    Sources: $SOURCE_COUNT, Tests: $TEST_COUNT, Estimated coverage: ${COVERAGE_PERCENT}%"
        
        if [ "$COVERAGE_PERCENT" -lt 90 ]; then
            echo "    ⚠ Below 90% target - needs $((SOURCE_COUNT * 90 / 100 - TEST_COUNT)) more tests"
        fi
    fi
done

# 6. Generate test template for gaps
echo ""
echo "[TEST GENERATION] Generating test templates for gaps..."

TEMPLATE_DIR="$REPORTS_DIR/test-templates"
mkdir -p "$TEMPLATE_DIR"

cat > "$TEMPLATE_DIR/test-template.ts" <<'TEMPLATE_EOF'
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
// Import module under test
// import { FunctionName } from '../path/to/module';

describe('ModuleName', () => {
    beforeEach(() => {
        // Setup
        jest.clearAllMocks();
    });

    afterEach(() => {
        // Cleanup
    });

    describe('FunctionName', () => {
        it('should handle valid input correctly', () => {
            // Arrange
            const input = 'test';
            
            // Act
            // const result = FunctionName(input);
            
            // Assert
            // expect(result).toBeDefined();
        });

        it('should throw error for invalid input', () => {
            // Arrange
            const invalidInput = null;
            
            // Act & Assert
            // expect(() => FunctionName(invalidInput)).toThrow();
        });

        it('should handle edge cases', () => {
            // Test boundary conditions
        });
    });

    describe('Integration scenarios', () => {
        it('should integrate with dependent modules', () => {
            // Integration test
        });
    });

    describe('Error handling', () => {
        it('should handle and log errors gracefully', () => {
            // Error handling test
        });
    });
});
TEMPLATE_EOF

echo "  ✓ Test template created at $TEMPLATE_DIR/test-template.ts"

# 7. Priority test list
cat > "$REPORTS_DIR/priority-test-list-$TIMESTAMP.txt" <<EOF
PRIORITY TEST ADDITIONS (Target: 80% overall, 90% critical)

HIGH PRIORITY (Critical Paths):
- governance/decision_audit_logger.ts
- mithra/mithra_coherence.ts
- circuits/circuit-breaker-coordinator.ts
- observability/manthra-instrumentation.ts
- security/auth-middleware.ts

MEDIUM PRIORITY (Core Logic):
- trading/performance_analytics.ts
- trading/fmp-client.ts
- discord/notification_manager.ts
- database/connection.ts

LOW PRIORITY (Utilities):
- utils/logger.ts
- utils/validation.ts
- config/env-loader.ts

NEXT STEPS:
1. Create tests for HIGH PRIORITY modules first
2. Ensure each test file has:
   - Unit tests for all public functions
   - Integration tests for module interactions
   - Error handling tests
   - Edge case coverage
3. Run coverage again: npm test -- --coverage
4. Iterate until 80% overall, 90% critical achieved
EOF

cat "$REPORTS_DIR/priority-test-list-$TIMESTAMP.txt"

echo ""
echo "[COVERAGE] Analysis complete. Reports saved to:"
echo "  - $REPORTS_DIR/coverage-run-$TIMESTAMP.log"
echo "  - $REPORTS_DIR/gap-analysis-$TIMESTAMP.json"
echo "  - $REPORTS_DIR/priority-test-list-$TIMESTAMP.txt"
echo "  - $TEMPLATE_DIR/test-template.ts"
echo ""
echo "Next: Create tests from priority list using test-template.ts"
