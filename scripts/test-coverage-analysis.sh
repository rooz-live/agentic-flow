#!/usr/bin/env bash
# Test Coverage Gap Analysis and Automated Test Generation
# Identifies untested code paths and generates test templates

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COVERAGE_DIR="$PROJECT_ROOT/coverage"
REPORTS_DIR="$PROJECT_ROOT/reports"
TESTS_DIR="$PROJECT_ROOT/tests"

echo "🔍 Test Coverage Gap Analysis"
echo "=============================="
echo

# Run coverage analysis
echo "📊 Step 1: Generating coverage report..."
cd "$PROJECT_ROOT"
npm test -- --coverage --coverageReporters=json-summary --coverageReporters=lcov --silent 2>&1 | tail -20

# Parse coverage summary
if [ -f "$COVERAGE_DIR/coverage-summary.json" ]; then
    echo
    echo "📈 Step 2: Analyzing coverage gaps..."
    
    # Extract coverage percentages
    LINES_PCT=$(node -e "console.log(require('$COVERAGE_DIR/coverage-summary.json').total.lines.pct)")
    STATEMENTS_PCT=$(node -e "console.log(require('$COVERAGE_DIR/coverage-summary.json').total.statements.pct)")
    FUNCTIONS_PCT=$(node -e "console.log(require('$COVERAGE_DIR/coverage-summary.json').total.functions.pct)")
    BRANCHES_PCT=$(node -e "console.log(require('$COVERAGE_DIR/coverage-summary.json').total.branches.pct)")
    
    echo "Current Coverage:"
    echo "  Lines:      ${LINES_PCT}%"
    echo "  Statements: ${STATEMENTS_PCT}%"
    echo "  Functions:  ${FUNCTIONS_PCT}%"
    echo "  Branches:   ${BRANCHES_PCT}%"
    echo
    
    # Calculate gap to 80%
    LINES_GAP=$(node -e "console.log(Math.max(0, 80 - $LINES_PCT).toFixed(2))")
    echo "Gap to 80% coverage: ${LINES_GAP}% lines needed"
    echo
fi

# Find untested files
echo "📂 Step 3: Identifying untested files..."
mkdir -p "$REPORTS_DIR"
UNTESTED_REPORT="$REPORTS_DIR/untested-files.txt"

# Find source files without corresponding tests
find "$PROJECT_ROOT/src" -type f \( -name "*.ts" -o -name "*.tsx" \) ! -name "*.test.ts" ! -name "*.spec.ts" | while read -r src_file; do
    relative_path="${src_file#$PROJECT_ROOT/src/}"
    base_name="$(basename "$src_file" .ts)"
    base_name="$(basename "$base_name" .tsx)"
    dir_name="$(dirname "$relative_path")"
    
    # Check if test file exists
    test_exists=false
    for test_pattern in \
        "$TESTS_DIR/$dir_name/$base_name.test.ts" \
        "$TESTS_DIR/$dir_name/$base_name.spec.ts" \
        "$TESTS_DIR/$base_name.test.ts" \
        "$TESTS_DIR/$base_name.spec.ts" \
        "$PROJECT_ROOT/src/$dir_name/$base_name.test.ts"
    do
        if [ -f "$test_pattern" ]; then
            test_exists=true
            break
        fi
    done
    
    if [ "$test_exists" = false ]; then
        echo "$src_file"
    fi
done > "$UNTESTED_REPORT"

UNTESTED_COUNT=$(wc -l < "$UNTESTED_REPORT")
echo "Found $UNTESTED_COUNT files without tests"
echo

# Show top 10 untested files
if [ "$UNTESTED_COUNT" -gt 0 ]; then
    echo "Top 10 untested files:"
    head -10 "$UNTESTED_REPORT" | while read -r file; do
        echo "  - ${file#$PROJECT_ROOT/}"
    done
    echo
fi

# Generate test templates
echo "📝 Step 4: Generating test templates..."
TEMPLATES_DIR="$REPORTS_DIR/test-templates"
mkdir -p "$TEMPLATES_DIR"

# Generate template for first 5 untested files
head -5 "$UNTESTED_REPORT" | while read -r src_file; do
    relative_path="${src_file#$PROJECT_ROOT/src/}"
    base_name="$(basename "$src_file" .ts)"
    base_name="$(basename "$base_name" .tsx)"
    
    # Extract exported functions/classes
    exports=$(grep -E "^export (class|function|const|interface|type)" "$src_file" | head -10 || true)
    
    template_file="$TEMPLATES_DIR/${base_name}.test.ts"
    
    cat > "$template_file" << EOF
/**
 * Tests for ${relative_path}
 * Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('${base_name}', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  describe('Unit Tests', () => {
    it('should be defined', () => {
      // TODO: Import and test main exports
      expect(true).toBe(true);
    });

    // TODO: Add tests for:
$(echo "$exports" | sed 's/^/    \/\/ - /')
  });

  describe('Integration Tests', () => {
    it.todo('should integrate with dependencies');
  });

  describe('Edge Cases', () => {
    it.todo('should handle error conditions');
    it.todo('should handle invalid inputs');
    it.todo('should handle boundary conditions');
  });
});
EOF

    echo "  Generated: test-templates/${base_name}.test.ts"
done

echo
echo "✅ Analysis complete!"
echo
echo "📋 Summary:"
echo "  - Coverage reports: coverage/"
echo "  - Untested files list: reports/untested-files.txt"
echo "  - Test templates: reports/test-templates/"
echo
echo "📈 Next Steps:"
echo "  1. Review untested files in reports/untested-files.txt"
echo "  2. Copy test templates from reports/test-templates/ to tests/"
echo "  3. Implement tests to reach 80% coverage"
echo "  4. Run: npm test -- --coverage"
echo
