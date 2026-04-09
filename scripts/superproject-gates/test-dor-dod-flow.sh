#!/usr/bin/env bash
set -euo pipefail

# DoR/DoD Flow Test Runner
# Demonstrates how DoR budget constraints improve DoD quality iteratively

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_section() {
    echo ""
    echo -e "${BLUE}▶ $1${NC}"
}

run_test_cycle() {
    local circle="$1"
    local ceremony="$2"
    
    print_section "Testing ${circle}/${ceremony}"
    
    # Step 1: DoR Budget Lookup
    echo ""
    echo "  [1/5] DoR Budget Lookup"
    "$SCRIPT_DIR/ay-prod-dor-lookup.sh" "$circle" "$ceremony" --text | sed 's/^/    /'
    
    # Step 2: DoR Validation
    echo ""
    echo "  [2/5] DoR Validation"
    if bash "$SCRIPT_DIR/validate-dor-dod.sh" dor "$circle" "$ceremony" 2>&1 | head -20 | sed 's/^/    /'; then
        echo -e "    ${GREEN}✓ DoR PASSED${NC}"
    else
        echo -e "    ${YELLOW}⚠ DoR FAILED - Proceeding in advisory mode${NC}"
    fi
    
    # Step 3: Execute Ceremony (time-boxed)
    echo ""
    echo "  [3/5] Execute Ceremony (Time-Boxed)"
    
    # Get time budget
    DOR_MINUTES=$(jq -r ".circles.${circle}.dor_minutes" "$PROJECT_ROOT/config/dor-budgets.json" 2>/dev/null || echo "5")
    TIMEOUT_SECONDS=$((DOR_MINUTES * 60))
    
    echo "    Time Budget: ${DOR_MINUTES}m (${TIMEOUT_SECONDS}s)"
    echo "    Starting at: $(date '+%H:%M:%S')"
    
    START_TIME=$(date +%s)
    
    # Execute with timeout
    if timeout "${TIMEOUT_SECONDS}s" "$SCRIPT_DIR/ay-prod-cycle.sh" "$circle" "$ceremony" advisory 2>&1 | \
        grep -E "▶|✓|✗|Episode|DoR|DoD|Circle|Ceremony|Learning|Skills" | sed 's/^/    /'; then
        EXIT_CODE=0
    else
        EXIT_CODE=$?
        if [ $EXIT_CODE -eq 124 ]; then
            echo -e "    ${YELLOW}⏱️  Timeout after ${DOR_MINUTES}m${NC}"
        fi
    fi
    
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    echo "    Completed at: $(date '+%H:%M:%S')"
    echo "    Actual Duration: ${DURATION}s / ${TIMEOUT_SECONDS}s budget"
    
    if [ $DURATION -le $TIMEOUT_SECONDS ]; then
        echo -e "    ${GREEN}✓ Within time budget${NC}"
    else
        echo -e "    ${YELLOW}⚠ Exceeded time budget by $((DURATION - TIMEOUT_SECONDS))s${NC}"
    fi
    
    # Step 4: DoD Validation (if episode exists)
    echo ""
    echo "  [4/5] DoD Validation"
    
    # Find most recent episode for this circle
    LATEST_EPISODE=$(ls -t /tmp/ep_*_${circle}_* 2>/dev/null | head -1 || echo "")
    
    if [ -n "$LATEST_EPISODE" ]; then
        EPISODE_ID=$(basename "$LATEST_EPISODE" .json)
        if bash "$SCRIPT_DIR/validate-dor-dod.sh" dod "$circle" "$ceremony" "$EPISODE_ID" 2>&1 | head -15 | sed 's/^/    /'; then
            echo -e "    ${GREEN}✓ DoD PASSED${NC}"
        else
            echo -e "    ${YELLOW}⚠ DoD FAILED${NC}"
        fi
    else
        echo "    ℹ️  No episode found - skipping DoD validation"
    fi
    
    # Step 5: Completion Metrics
    echo ""
    echo "  [5/5] Completion Metrics"
    
    if [ -f "$PROJECT_ROOT/agentdb.db" ]; then
        # Query recent completion data
        RECENT_AVG=$(sqlite3 "$PROJECT_ROOT/agentdb.db" \
            "SELECT ROUND(AVG(completion_pct)) FROM completion_episodes WHERE circle='$circle' AND timestamp > $(date +%s -d '1 hour ago')000" \
            2>/dev/null || echo "N/A")
        
        RECENT_COUNT=$(sqlite3 "$PROJECT_ROOT/agentdb.db" \
            "SELECT COUNT(*) FROM completion_episodes WHERE circle='$circle' AND timestamp > $(date +%s -d '1 hour ago')000" \
            2>/dev/null || echo "0")
        
        echo "    Recent Episodes (1h): $RECENT_COUNT"
        echo "    Avg Completion: ${RECENT_AVG}%"
    else
        echo "    AgentDB not available"
    fi
    
    echo ""
}

# ==========================================
# Main Test Flow
# ==========================================

print_header "🧪 DoR/DoD Flow Test Suite"

echo ""
echo "This test demonstrates how DoR budget/time constraints improve DoD quality"
echo "through iterative ay-prod cycles across all 6 circles."
echo ""

# Test each circle with its primary ceremony
CIRCLES=("orchestrator:standup" "assessor:wsjf" "analyst:refine" "innovator:retro" "seeker:replenish" "intuitive:synthesis")

for entry in "${CIRCLES[@]}"; do
    IFS=':' read -r circle ceremony <<< "$entry"
    run_test_cycle "$circle" "$ceremony"
    
    # Brief pause between cycles
    sleep 2
done

# ==========================================
# Summary Report
# ==========================================

print_header "📊 Test Summary Report"

echo ""
echo "Circle Equity Analysis:"
echo ""

if [ -f "$PROJECT_ROOT/agentdb.db" ]; then
    for entry in "${CIRCLES[@]}"; do
        IFS=':' read -r circle ceremony <<< "$entry"
        
        EPISODE_COUNT=$(sqlite3 "$PROJECT_ROOT/agentdb.db" \
            "SELECT COUNT(*) FROM completion_episodes WHERE circle='$circle'" \
            2>/dev/null || echo "0")
        
        AVG_COMPLETION=$(sqlite3 "$PROJECT_ROOT/agentdb.db" \
            "SELECT ROUND(AVG(completion_pct)) FROM completion_episodes WHERE circle='$circle'" \
            2>/dev/null || echo "0")
        
        printf "  %-15s: %3d episodes | %3s%% avg completion\n" "$circle" "$EPISODE_COUNT" "$AVG_COMPLETION"
    done
else
    echo "  AgentDB not available"
fi

echo ""
echo -e "${GREEN}✅ DoR/DoD Flow Test Complete${NC}"
echo ""
echo "Next Steps:"
echo "  • Run: $SCRIPT_DIR/ay-prod-cycle.sh learn 5"
echo "  • Run: $SCRIPT_DIR/ay-yo-enhanced.sh dashboard"
echo "  • Run: $SCRIPT_DIR/ay-yo-enhanced.sh equity"
echo ""
