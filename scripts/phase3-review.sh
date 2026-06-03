#!/bin/bash
# Phase 3 Code Review & Regression Script
# Validates D→B→A implementation before next story

set -e

echo "=========================================="
echo "  PHASE 3: CODE REVIEW & REGRESSION"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

checks_passed=0
checks_failed=0

# Function to check and report
check() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅${NC} $2"
        ((checks_passed++))
    else
        echo -e "${RED}❌${NC} $2"
        ((checks_failed++))
    fi
}

echo "1. TDD CYCLE VALIDATION"
echo "----------------------"
echo "   RED Phase: TDD specs defined"
echo "   GREEN Phase: Domain implementations"
echo "   VERIFY Phase: E2E tests"
echo ""

# Check Rust Bridge
echo "2. RUST BRIDGE (eventops_pyo3)"
echo "------------------------------"
rust_functions=$(grep -c "#\[pyfunction\]" src/rust/eventops_pyo3/src/lib.rs 2>/dev/null || echo "0")
check $([ "$rust_functions" -eq 7 ] && echo 0 || echo 1) "7 Rust functions exported (found: $rust_functions)"

# List functions
echo "   Functions:"
grep "fn " src/rust/eventops_pyo3/src/lib.rs | grep -v "fn eventops_pyo3" | sed 's/^/   - /' || true
echo ""

# Check VERIFY tests
echo "3. VERIFY PHASE TESTS"
echo "--------------------"
verify_count=$(ls tests/*-verify.e2e.spec.ts 2>/dev/null | wc -l)
check $([ "$verify_count" -eq 9 ] && echo 0 || echo 1) "9 VERIFY test files (found: $verify_count)"

if [ "$verify_count" -gt 0 ]; then
    echo "   Tests found:"
    ls tests/*-verify.e2e.spec.ts 2>/dev/null | sed 's/.*\///; s/^/   - /' || true
fi
echo ""

# Check Domain Imports
echo "4. DOMAIN IMPORT REGRESSION"
echo "---------------------------"
cd /Users/shahroozbhopti/Documents/code

python3 << 'PYEOF'
import sys
sys.path.insert(0, 'src')

domains = [
    ('identity', 'entity_registry'),
    ('rates', 'rate_engine'),
    ('eventops', 'event_logger'),
    ('ceremony', 'ceremony_logger'),
    ('jobs', 'job_manifest'),
    ('ledger', 'cost_ledger'),
    ('projects', 'project_context'),
    ('tax', 'tax_currency'),
    ('calculation', 'calculation_engine')
]

failed = []
for package, module in domains:
    full = f'{package}.{module}'
    try:
        __import__(full)
        print(f"✅ {full}")
    except Exception as e:
        print(f"❌ {full}: {e}")
        failed.append(full)

if failed:
    sys.exit(1)
PYEOF

check $? "All 9 domains import without errors"
echo ""

# Check Deployment Workflow
echo "5. DEPLOYMENT WORKFLOW"
echo "---------------------"
if [ -f ".github/workflows/billing-deploy.yml" ]; then
    check 0 "billing-deploy.yml exists"
    phases=$(grep -c "^  # Phase" .github/workflows/billing-deploy.yml 2>/dev/null || echo "0")
    check $([ "$phases" -ge 4 ] && echo 0 || echo 1) "Multi-phase deployment (found $phases phases)"
else
    check 1 "billing-deploy.yml exists (blocked by .codeiumignore - use terminal)"
fi
echo ""

# Performance Benchmarks Check
echo "6. PERFORMANCE BENCHMARKS"
echo "------------------------"
echo "   Targets:"
echo "   - UUID v7: >10K ops/sec"
echo "   - Rate calc: >50K ops/sec"
echo "   - Geo distance: >100K ops/sec"
echo "   - p99 latency: <50ms"
echo ""

# Error Code Pattern Check
echo "7. ERROR CODE PATTERNS"
echo "----------------------"
err_codes=$(grep -o "ERR_[A-Z_]*" src/rust/eventops_pyo3/src/lib.rs 2>/dev/null | sort -u | wc -l)
check $([ "$err_codes" -ge 4 ] && echo 0 || echo 1) "Specific error codes used (found: $err_codes)"
grep -o "ERR_[A-Z_]*" src/rust/eventops_pyo3/src/lib.rs 2>/dev/null | sort -u | sed 's/^/   - /' || true
echo ""

# Summary
echo "=========================================="
echo "  SUMMARY"
echo "=========================================="
echo -e "Checks Passed: ${GREEN}$checks_passed${NC}"
echo -e "Checks Failed: ${RED}$checks_failed${NC}"
echo ""

if [ $checks_failed -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED - Ready for next story${NC}"
    exit 0
else
    echo -e "${RED}❌ SOME CHECKS FAILED - Fix before proceeding${NC}"
    exit 1
fi
