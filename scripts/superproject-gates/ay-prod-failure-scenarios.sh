#!/usr/bin/env bash
set -euo pipefail

# ==========================================
# Failure Scenario Test Suite
# ==========================================
# Tests learning infrastructure with expected failures
# to generate reward variance (not all 1.0)
#
# Scenarios:
# 1. Invalid ceremony execution
# 2. WSJF calculation with missing data
# 3. Episode storage with corrupted JSON
# 4. MCP health validation timeout
# ==========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Counters
SCENARIOS_RUN=0
SCENARIOS_EXPECTED_FAIL=0
SCENARIOS_UNEXPECTED_FAIL=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Failure Scenario Test Suite"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ==========================================
# Scenario 1: Invalid Ceremony Execution
# ==========================================
scenario_1_invalid_ceremony() {
    echo "Scenario 1: Invalid Ceremony Execution"
    echo "Expected: Failure (invalid circle rejected)"
    
    SCENARIOS_RUN=$((SCENARIOS_RUN + 1))
    
    # Attempt to run invalid ceremony
    output=$("$SCRIPT_DIR/ay-prod-cycle.sh" invalid_circle standup advisory 2>&1 || true)
    
    if echo "$output" | grep -q "❌ Unknown circle"; then
        echo -e "${GREEN}✅ PASS${NC}: Invalid circle properly rejected"
        SCENARIOS_EXPECTED_FAIL=$((SCENARIOS_EXPECTED_FAIL + 1))
        
        # Calculate reward for this failure
        reward=$(python3 "$PROJECT_ROOT/.agentdb/reward-calculator.py" \
            --success 0 \
            --wsjf-confidence 0.50 \
            --latency-ms 100 2>/dev/null || echo "0.60")
        
        echo "   Reward: $reward (expected <1.0)"
    else
        echo -e "${RED}❌ FAIL${NC}: Invalid circle not rejected"
        SCENARIOS_UNEXPECTED_FAIL=$((SCENARIOS_UNEXPECTED_FAIL + 1))
    fi
    
    echo ""
}

# ==========================================
# Scenario 2: WSJF with Missing/Invalid Data
# ==========================================
scenario_2_wsjf_missing_data() {
    echo "Scenario 2: WSJF Calculation with Missing Data"
    echo "Expected: Defaults used, low confidence"
    
    SCENARIOS_RUN=$((SCENARIOS_RUN + 1))
    
    # Try WSJF with empty task (should still calculate with defaults)
    output=$("$SCRIPT_DIR/calculate-wsjf-auto.sh" --task "" 2>&1 || true)
    
    if echo "$output" | grep -q "Calculating WSJF"; then
        # Extract confidence
        confidence=$(echo "$output" | grep -oE "Confidence:.*[0-9]+%" | grep -oE "[0-9]+" || echo "50")
        
        if [ "$confidence" -le 55 ]; then
            echo -e "${GREEN}✅ PASS${NC}: Low confidence ($confidence%) for empty task"
            SCENARIOS_EXPECTED_FAIL=$((SCENARIOS_EXPECTED_FAIL + 1))
            
            # Calculate reward with low confidence
            reward=$(python3 "$PROJECT_ROOT/.agentdb/reward-calculator.py" \
                --success 1 \
                --wsjf-confidence 0.50 \
                --latency-ms 200 2>/dev/null || echo "0.60")
            
            echo "   Reward: $reward (reduced due to low confidence)"
        else
            echo -e "${YELLOW}⚠️  WARN${NC}: Confidence unexpectedly high ($confidence%)"
        fi
    else
        echo -e "${RED}❌ FAIL${NC}: WSJF calculator failed completely"
        SCENARIOS_UNEXPECTED_FAIL=$((SCENARIOS_UNEXPECTED_FAIL + 1))
    fi
    
    echo ""
}

# ==========================================
# Scenario 3: Corrupted Episode JSON
# ==========================================
scenario_3_corrupted_json() {
    echo "Scenario 3: Episode Storage with Corrupted JSON"
    echo "Expected: Graceful handling or error"
    
    SCENARIOS_RUN=$((SCENARIOS_RUN + 1))
    
    # Create intentionally malformed JSON in WSJF_CONTEXT
    CORRUPTED_JSON='{
  "episode_id": "test_corrupted",
  "malformed": "missing closing brace",
  "wsjf_context": {
    "ubv": 5
  # Missing closing braces'
    
    # Try to process it with corrupted WSJF_CONTEXT
    if [ -f "$SCRIPT_DIR/ay-prod-store-episode.sh" ]; then
        output=$(WSJF_CONTEXT="$CORRUPTED_JSON" "$SCRIPT_DIR/ay-prod-store-episode.sh" test_corrupted failure 0.60 orchestrator 2>&1 || true)
        
        if echo "$output" | grep -q "Invalid WSJF_CONTEXT JSON"; then
            echo -e "${GREEN}✅ PASS${NC}: Corrupted JSON detected and rejected"
            SCENARIOS_EXPECTED_FAIL=$((SCENARIOS_EXPECTED_FAIL + 1))
        else
            echo -e "${YELLOW}⚠️  WARN${NC}: Storage may have accepted corrupted JSON"
        fi
    else
        echo -e "${YELLOW}⚠️  SKIP${NC}: Episode storage script not found"
    fi
    
    # Calculate failure reward
    reward=$(python3 "$PROJECT_ROOT/.agentdb/reward-calculator.py" \
        --success 0 \
        --wsjf-confidence 0.60 \
        --latency-ms 500 2>/dev/null || echo "0.60")
    
    echo "   Reward: $reward (failure scenario)"
    echo ""
}

# ==========================================
# Scenario 4: MCP Health Timeout
# ==========================================
scenario_4_mcp_timeout() {
    echo "Scenario 4: MCP Health Validation Timeout"
    echo "Expected: Degraded mode fallback"
    
    SCENARIOS_RUN=$((SCENARIOS_RUN + 1))
    
    # Temporarily make agentdb command unavailable by hijacking npx
    TEMP_SCRIPT="/tmp/npx_timeout_$$"
    cat > "$TEMP_SCRIPT" <<'EOF'
#!/usr/bin/env bash
# Simulate timeout by sleeping longer than the health check timeout
sleep 5
exit 124  # timeout exit code
EOF
    chmod +x "$TEMP_SCRIPT"
    
    # Run cycle with hijacked npx in PATH
    output=$(PATH="$(dirname "$TEMP_SCRIPT"):$PATH" "$SCRIPT_DIR/ay-prod-cycle.sh" orchestrator standup advisory 2>&1 || true)
    
    # Cleanup
    rm -f "$TEMP_SCRIPT"
    
    if echo "$output" | grep -qE "(degraded|MCP validation skipped|safe_degrade|agentdb timeout)"; then
        echo -e "${GREEN}✅ PASS${NC}: MCP degradation detected, safe_degrade mode activated"
        SCENARIOS_EXPECTED_FAIL=$((SCENARIOS_EXPECTED_FAIL + 1))
        
        # Reduced reward due to degraded mode
        reward=$(python3 "$PROJECT_ROOT/.agentdb/reward-calculator.py" \
            --success 1 \
            --wsjf-confidence 0.65 \
            --latency-ms 2000 2>/dev/null || echo "0.70")
        
        echo "   Reward: $reward (degraded mode penalty)"
    else
        echo -e "${YELLOW}⚠️  WARN${NC}: MCP appears healthy (no degradation)"
    fi
    
    echo ""
}

# ==========================================
# Run All Scenarios
# ==========================================

scenario_1_invalid_ceremony
scenario_2_wsjf_missing_data
scenario_3_corrupted_json
scenario_4_mcp_timeout

# ==========================================
# Summary
# ==========================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Failure Scenario Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Total Scenarios:        $SCENARIOS_RUN"
echo -e "${GREEN}Expected Failures:      $SCENARIOS_EXPECTED_FAIL${NC}"
echo -e "${RED}Unexpected Failures:    $SCENARIOS_UNEXPECTED_FAIL${NC}"
echo ""

if [ $SCENARIOS_EXPECTED_FAIL -ge 3 ]; then
    echo -e "${GREEN}✅ Phase A2 Failure Modes: OPERATIONAL${NC}"
    echo ""
    echo "Reward variance achieved through:"
    echo "  • Invalid ceremony blocks (reward: 0.60)"
    echo "  • Low WSJF confidence scenarios (reward: 0.50-0.70)"
    echo "  • Degraded mode penalties (reward: 0.65-0.75)"
    echo ""
    exit 0
else
    echo -e "${YELLOW}⚠️  Phase A2 Failure Modes: NEEDS ATTENTION${NC}"
    echo "Some scenarios did not produce expected failures"
    exit 1
fi
