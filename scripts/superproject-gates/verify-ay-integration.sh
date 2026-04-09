#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 ay prod-yo Integration Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PASS=0
FAIL=0

test_result() {
    if [ $1 -eq 0 ]; then
        echo "✅ $2"
        ((PASS++))
    else
        echo "❌ $2"
        ((FAIL++))
    fi
}

# ==========================================
# Test 1: AFProdEngine Integration
# ==========================================
echo "1️⃣ Testing AFProdEngine Integration..."

if [ -f "src/core/af-prod-engine.ts" ]; then
    test_result 0 "AFProdEngine file exists"
    
    # Test TypeScript compilation
    if npx tsx src/core/af-prod-engine.ts --circle orchestrator --ceremony standup --mode advisory 2>&1 | grep -q "AFProdEngine"; then
        test_result 0 "AFProdEngine executes"
    else
        test_result 1 "AFProdEngine execution failed"
    fi
else
    test_result 1 "AFProdEngine file missing"
fi

echo ""

# ==========================================
# Test 2: MCP Health Checks
# ==========================================
echo "2️⃣ Testing MCP Health Validation..."

if ./scripts/ay-prod-cycle.sh orchestrator standup advisory 2>&1 | grep -q "Validating MCP health"; then
    test_result 0 "MCP health validation active"
else
    test_result 1 "MCP health validation missing"
fi

if ./scripts/ay-prod-cycle.sh orchestrator standup advisory 2>&1 | grep -qE "(MCP healthy|MCP degraded)"; then
    test_result 0 "MCP health status reported"
else
    test_result 1 "MCP health status not reported"
fi

# Test graceful degradation
if AGENTDB_DISABLE_MCP=1 ./scripts/ay-prod-cycle.sh orchestrator standup advisory 2>&1 | grep -q "safe_degrade"; then
    test_result 0 "Graceful MCP failure handling"
else
    test_result 1 "MCP failure handling broken"
fi

echo ""

# ==========================================
# Test 3: Episode Storage Optimization
# ==========================================
echo "3️⃣ Testing Episode Batch Storage..."

# Check batch directory created
if ./scripts/ay-prod-cycle.sh orchestrator standup advisory 2>&1 | grep -q "Episode:"; then
    test_result 0 "Episode generation working"
else
    test_result 1 "Episode generation failed"
fi

if [ -d "/tmp/ay-episodes" ]; then
    test_result 0 "Batch storage directory created"
else
    test_result 1 "Batch storage directory missing"
fi

# Test batch storage function exists
if grep -q "store_episode_batch" scripts/ay-prod-cycle.sh; then
    test_result 0 "Batch storage function implemented"
else
    test_result 1 "Batch storage function missing"
fi

echo ""

# ==========================================
# Test 4: Circle Learning Workers
# ==========================================
echo "4️⃣ Testing Circle Learning Workers..."

if grep -q "start_circle_learning_worker" scripts/ay-prod-cycle.sh; then
    test_result 0 "Learning worker function implemented"
else
    test_result 1 "Learning worker function missing"
fi

# Run cycle and check for worker start
if timeout 20s ./scripts/ay-prod-cycle.sh orchestrator standup advisory 2>&1 | grep -q "Learning worker"; then
    test_result 0 "Learning worker management active"
else
    test_result 1 "Learning worker not started"
fi

# Check PID file creation
if ls /tmp/ay-learn-worker-*.pid 2>/dev/null | head -1; then
    test_result 0 "Worker PID tracking active"
    
    # Cleanup
    pkill -f "ay-prod-learn-loop" 2>/dev/null || true
    rm -f /tmp/ay-learn-worker-*.pid
else
    test_result 1 "Worker PID tracking missing"
fi

echo ""

# ==========================================
# Test 5: Web UI Integration
# ==========================================
echo "5️⃣ Testing Web UI Integration..."

# Check web command exists
if grep -q "start_web_cockpit" scripts/ay-yo.sh; then
    test_result 0 "Web cockpit function implemented"
else
    test_result 1 "Web cockpit function missing"
fi

# Test dashboard command
if ./scripts/ay-yo.sh dashboard 2>&1 | grep -q "Circle Equity Dashboard"; then
    test_result 0 "Dashboard CLI working"
else
    test_result 1 "Dashboard CLI broken"
fi

# Test web server startup (with timeout)
PORT=3939 timeout 5s bash -c '
    ./scripts/ay-yo.sh web &
    WEB_PID=$!
    sleep 3
    if curl -s http://localhost:3939 | grep -q "yo.life"; then
        kill $WEB_PID 2>/dev/null || true
        exit 0
    fi
    kill $WEB_PID 2>/dev/null || true
    exit 1
' 2>/dev/null

if [ $? -eq 0 ]; then
    test_result 0 "Web server starts successfully"
else
    test_result 1 "Web server startup failed"
fi

# Check pricing hidden
if grep -q "pricing-hidden" scripts/ay-yo.sh; then
    test_result 0 "Pricing hidden by default"
else
    test_result 1 "Pricing visibility not configured"
fi

echo ""

# ==========================================
# Integration Tests
# ==========================================
echo "🔗 Testing End-to-End Integration..."

# Test skill query → execution → storage workflow
./scripts/ay-prod-skill-lookup.sh orchestrator standup 2>&1 | head -5 > /tmp/skills.txt
if grep -q "Searching skills" /tmp/skills.txt; then
    test_result 0 "Skill query workflow"
else
    test_result 1 "Skill query failed"
fi

# Test circle equity maintenance
CIRCLES=("orchestrator" "assessor" "analyst" "innovator" "seeker" "intuitive")
EQUITY_PASS=0
for circle in "${CIRCLES[@]}"; do
    if ./scripts/ay-yo.sh dashboard 2>&1 | grep -q "$circle"; then
        ((EQUITY_PASS++))
    fi
done

if [ $EQUITY_PASS -eq 6 ]; then
    test_result 0 "All 6 circles in dashboard"
else
    test_result 1 "Only $EQUITY_PASS/6 circles in dashboard"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Results: $PASS passed, $FAIL failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAIL -eq 0 ]; then
    echo "✅ All integrations verified successfully!"
    exit 0
else
    echo "⚠️  Some tests failed - review output above"
    exit 1
fi
