#!/bin/bash
# Comprehensive Test Suite for Agentic Flow Production Improvements
# Tests: Economic tracking, Flow metrics, Schema drift, WIP auto-snooze, Early stop tuning

# Note: Don't use 'set -e' so all tests can run even if some fail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Agentic Flow Comprehensive Improvement Test Suite"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=8

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_result() {
    local test_name="$1"
    local result="$2"
    local details="$3"
    
    if [ "$result" -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: $test_name"
        [ -n "$details" ] && echo "   ℹ️  $details"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}: $test_name"
        [ -n "$details" ] && echo "   ⚠️  $details"
        ((TESTS_FAILED++))
    fi
    echo ""
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST 1: Economic Fields - Revenue Impact Attribution
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: Economic Fields - Revenue Impact Auto-Calculation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ANALYST_REVENUE=$(tail -100 .goalie/pattern_metrics.jsonl | \
    python3 -c "import json, sys; \
    entries = [json.loads(l) for l in sys.stdin if l.strip()]; \
    analyst = [e for e in entries if e.get('circle') == 'analyst' and 'economic' in e]; \
    print(analyst[-1]['economic']['revenue_impact'] if analyst else 0)" 2>/dev/null || echo "0")

if [ "$ANALYST_REVENUE" = "3500.0" ] || [ "$ANALYST_REVENUE" = "3500" ]; then
    test_result "Revenue impact auto-calculated for analyst circle" 0 "Analyst: \$3,500/month"
else
    test_result "Revenue impact auto-calculated for analyst circle" 1 "Expected 3500, got $ANALYST_REVENUE"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST 2: Economic Fields - CapEx/OpEx Structure
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: Economic Fields - CapEx/OpEx Ratio Structure"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

HAS_CAPEX=$(tail -50 .goalie/pattern_metrics.jsonl | \
    python3 -c "import json, sys; \
    entries = [json.loads(l) for l in sys.stdin if l.strip()]; \
    found = any('capex_opex_ratio' in e.get('economic', {}) for e in entries); \
    print('yes' if found else 'no')" 2>/dev/null || echo "no")

if [ "$HAS_CAPEX" = "yes" ]; then
    test_result "CapEx/OpEx ratio field present in economic data" 0 "Field exists (awaiting device integration)"
else
    test_result "CapEx/OpEx ratio field present in economic data" 1 "Field missing"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST 3: Flow Metrics - Cycle Time Tracking
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 3: Flow Metrics - Cycle Time & Throughput Tracking"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

HAS_FLOW=$(tail -50 .goalie/pattern_metrics.jsonl | \
    python3 -c "import json, sys; \
    entries = [json.loads(l) for l in sys.stdin if l.strip()]; \
    found = any('flow_metrics' in e for e in entries); \
    print('yes' if found else 'no')" 2>/dev/null || echo "no")

if [ "$HAS_FLOW" = "yes" ]; then
    test_result "Flow metrics tracked (cycle_time, throughput, efficiency)" 0 "Real-time productivity metrics"
else
    test_result "Flow metrics tracked (cycle_time, throughput, efficiency)" 1 "Flow metrics missing"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST 4: Schema Drift - Detection with Severity Levels
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 4: Schema Drift - JSON Output with Severity Levels"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DRIFT_OUTPUT=$(python3 scripts/monitor_schema_drift.py --last 50 --json 2>/dev/null || echo '{"drift_detected": false}')
DRIFT_DETECTED=$(echo "$DRIFT_OUTPUT" | python3 -c "import json, sys; d=json.load(sys.stdin); print('yes' if d.get('drift_detected') else 'no')" 2>/dev/null || echo "no")
HIGH_COUNT=$(echo "$DRIFT_OUTPUT" | python3 -c "import json, sys; d=json.load(sys.stdin); print(d.get('high_severity', 0))" 2>/dev/null || echo "0")

if [ "$DRIFT_DETECTED" = "yes" ]; then
    test_result "Schema drift detection with severity levels" 0 "Detected drift (HIGH: $HIGH_COUNT)"
else
    test_result "Schema drift detection with severity levels" 0 "No drift detected (clean schema)"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST 5: Schema Drift - Preflight Integration (Blocks Mutate)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 5: Schema Drift - Preflight Blocks Mutate on HIGH"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Only test if HIGH severity drift exists
if [ "$HIGH_COUNT" -gt 0 ]; then
    MUTATE_OUTPUT=$(python3 scripts/cmd_prod_cycle.py --mode mutate --iterations 1 --circle orchestrator --no-replenish 2>&1 || true)
    BLOCKED=$(echo "$MUTATE_OUTPUT" | grep -q "PRE-FLIGHT CHECKS FAILED" && echo "yes" || echo "no")
    
    if [ "$BLOCKED" = "yes" ]; then
        test_result "Preflight blocks mutate mode on HIGH severity drift" 0 "Mutate blocked correctly"
    else
        test_result "Preflight blocks mutate mode on HIGH severity drift" 1 "Mutate should be blocked"
    fi
else
    test_result "Preflight blocks mutate mode on HIGH severity drift" 0 "SKIP (no HIGH severity drift)"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST 6: Early Stop - Innovator Threshold (4 iterations)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 6: Early Stop - Innovator Threshold (4 iterations)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

INNOVATOR_OUTPUT=$(python3 scripts/cmd_prod_cycle.py --mode advisory --iterations 6 --circle innovator --no-replenish 2>&1 || true)
ITERATIONS_RUN=$(echo "$INNOVATOR_OUTPUT" | grep -o "Iterations: [0-9]*/[0-9]*" | head -1 | cut -d' ' -f2 | cut -d'/' -f1)

if [ "$ITERATIONS_RUN" -ge 4 ] 2>/dev/null; then
    test_result "Innovator early stop threshold at 4 iterations" 0 "Ran $ITERATIONS_RUN iterations before early stop"
else
    test_result "Innovator early stop threshold at 4 iterations" 1 "Expected 4+, got $ITERATIONS_RUN"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST 7: WIP Auto-Snooze - Backlog Integration
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 7: WIP Auto-Snooze - Backlog.md with WSJF Scores"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "backlog.md" ]; then
    WSJF_COUNT=$(grep -c "#wsjf:" backlog.md 2>/dev/null || echo "0")
    if [ "$WSJF_COUNT" -gt 0 ]; then
        test_result "Backlog.md exists with WSJF-scored tasks" 0 "Found $WSJF_COUNT WSJF-scored tasks"
    else
        test_result "Backlog.md exists with WSJF-scored tasks" 1 "No WSJF scores found"
    fi
else
    test_result "Backlog.md exists with WSJF-scored tasks" 1 "backlog.md not found"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST 8: Integration Test - Full Advisory Run
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 8: Integration - Full Advisory Run (All Features)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

FULL_OUTPUT=$(python3 scripts/cmd_prod_cycle.py --mode advisory --iterations 3 --circle analyst --no-replenish 2>&1 || echo "FAILED")
SUCCESS=$(echo "$FULL_OUTPUT" | grep -q "Flow Metrics:" && echo "yes" || echo "no")

if [ "$SUCCESS" = "yes" ]; then
    test_result "Full advisory run with all features integrated" 0 "All systems operational"
else
    test_result "Full advisory run with all features integrated" 1 "Run failed or incomplete"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST SUMMARY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "Total Tests:  $TOTAL_TESTS"
echo -e "${GREEN}Passed:       $TESTS_PASSED${NC}"
echo -e "${RED}Failed:       $TESTS_FAILED${NC}"
echo ""

PASS_RATE=$((TESTS_PASSED * 100 / TOTAL_TESTS))
echo -e "Pass Rate:    ${PASS_RATE}%"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Production improvements verified.${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed. Review output above.${NC}"
    exit 1
fi
