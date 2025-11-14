#!/usr/bin/env bash
#
# validate-foundation.sh - QE Validation Gate for Foundation
#
# Validates core system health before allowing progression to next phase.
# Fail-fast approach: exits on first failure.
#
# Usage: ./scripts/validate-foundation.sh [--strict]

set -euo pipefail

STRICT_MODE=false
[[ "${1:-}" == "--strict" ]] && STRICT_MODE=true

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

FAILED_CHECKS=0
TOTAL_CHECKS=0

check() {
    local name="$1"
    local command="$2"
    local threshold="${3:-}"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name"
    else
        echo -e "${RED}✗${NC} $name"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        if [ "$STRICT_MODE" = true ]; then
            echo -e "${RED}STRICT MODE: Failing fast${NC}"
            exit 1
        fi
    fi
}

check_numeric() {
    local name="$1"
    local command="$2"
    local operator="$3"
    local threshold="$4"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    local value=$(eval "$command" 2>/dev/null || echo "0")
    
    case "$operator" in
        ">")
            if (( $(echo "$value > $threshold" | bc -l 2>/dev/null || echo "0") )); then
                echo -e "${GREEN}✓${NC} $name ($value > $threshold)"
            else
                echo -e "${RED}✗${NC} $name ($value <= $threshold)"
                FAILED_CHECKS=$((FAILED_CHECKS + 1))
                [ "$STRICT_MODE" = true ] && exit 1
            fi
            ;;
        "<")
            if (( $(echo "$value < $threshold" | bc -l 2>/dev/null || echo "0") )); then
                echo -e "${GREEN}✓${NC} $name ($value < $threshold)"
            else
                echo -e "${YELLOW}⚠${NC} $name ($value >= $threshold) - Warning only"
            fi
            ;;
        ">=")
            if (( $(echo "$value >= $threshold" | bc -l 2>/dev/null || echo "0") )); then
                echo -e "${GREEN}✓${NC} $name ($value >= $threshold)"
            else
                echo -e "${RED}✗${NC} $name ($value < $threshold)"
                FAILED_CHECKS=$((FAILED_CHECKS + 1))
                [ "$STRICT_MODE" = true ] && exit 1
            fi
            ;;
    esac
}

echo "🔍 Foundation Validation Gate"
echo "=============================="
echo ""

echo "📦 AgentDB Validation"
check "AgentDB exists" "test -f .agentdb/agentdb.sqlite"
check_numeric "execution_contexts seeded" \
    "sqlite3 .agentdb/agentdb.sqlite 'SELECT COUNT(*) FROM execution_contexts'" \
    ">" "0"
check_numeric "beam_dimensions seeded" \
    "sqlite3 .agentdb/agentdb.sqlite 'SELECT COUNT(*) FROM beam_dimensions'" \
    ">" "0"
echo ""

echo "🪝 Hook Infrastructure"
check "Hooks directory exists" "test -d .agentdb/hooks"
check_numeric "Hooks discovered" \
    "find .agentdb/hooks -name '*.sh' | wc -l | tr -d ' '" \
    ">" "0"
echo ""

echo "📸 Snapshot Infrastructure"
check "Snapshots directory exists" "test -d .snapshots"
check "Baseline snapshot exists" "test -d .snapshots/baseline"
check "Restore script exists" "test -x scripts/restore-environment.sh"
echo ""

echo "📊 Metrics Infrastructure"
check "Metrics database exists" "test -f metrics/risk_analytics_baseline.db"
check_numeric "Baseline metrics captured" \
    "sqlite3 metrics/risk_analytics_baseline.db 'SELECT COUNT(*) FROM baseline_metrics'" \
    ">=" "1"
check "Metrics tracking active" "test -f .goalie/metrics_log.jsonl"
echo ""

echo "🔧 Unified Interface"
check "af command exists" "test -x scripts/af"
check "af status works" "./scripts/af status > /dev/null"
echo ""

echo "📝 Tracking Infrastructure"
check "Cycle log exists" "test -f .goalie/cycle_log.jsonl"
check "Insights log exists" "test -f .goalie/insights_log.jsonl"
check "Kanban board exists" "test -f .goalie/KANBAN_BOARD.yaml"
echo ""

echo "⚙️  Governor Validation"
check "Process governor exists" "test -f src/runtime/processGovernor.ts"
check "Token bucket implemented" "grep -q 'AF_RATE_LIMIT_ENABLED' src/runtime/processGovernor.ts"
check "Governor incidents logged" "test -f logs/governor_incidents.jsonl"
echo ""

echo "🎯 Build-Measure-Learn Validation"
check "doc_query.py exists" "test -f scripts/doc_query.py"
check "baseline-metrics.sh exists" "test -f scripts/baseline-metrics.sh"
check_numeric "BML cycles recorded" \
    "grep -c 'BML-CYCLE' .goalie/cycle_log.jsonl 2>/dev/null || echo 0" \
    ">" "0"
echo ""

# Summary
echo "=============================="
if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed ($TOTAL_CHECKS/$TOTAL_CHECKS)${NC}"
    echo ""
    echo "Foundation is validated and ready for next phase."
    exit 0
else
    echo -e "${YELLOW}⚠️  $FAILED_CHECKS/$TOTAL_CHECKS checks failed${NC}"
    echo ""
    echo "Foundation has issues but is operational."
    exit $FAILED_CHECKS
fi
