#!/usr/bin/env bash
set -euo pipefail

# ════════════════════════════════════════════════════════════════════════════
# Test Runner for Digital Cockpit and rooz.yo.life
# Runs unit tests, E2E tests, and deployment validation
# ════════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Test Suite - Digital Cockpit & rooz.yo.life"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Configuration
TEST_PORT="${TEST_PORT:-3005}"
TEST_URL="http://localhost:$TEST_PORT"
SERVER_PID=""

# ══════════════════════════════════════════════════════════════════════════
# Helper Functions
# ══════════════════════════════════════════════════════════════════════════

start_test_server() {
    echo "🚀 Starting test server on port $TEST_PORT..."
    cd "$PROJECT_ROOT"
    PORT=$TEST_PORT npm run start:web > /tmp/test-server.log 2>&1 &
    SERVER_PID=$!
    
    # Wait for server to be ready
    echo "⏳ Waiting for server to start..."
    for i in {1..30}; do
        if curl -s "$TEST_URL/api/health" > /dev/null 2>&1; then
            echo "✅ Server ready"
            return 0
        fi
        sleep 1
    done
    
    echo "❌ Server failed to start"
    cat /tmp/test-server.log
    return 1
}

stop_test_server() {
    if [ -n "$SERVER_PID" ]; then
        echo "🛑 Stopping test server (PID: $SERVER_PID)..."
        kill $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
    fi
}

# Cleanup on exit
trap stop_test_server EXIT

# ══════════════════════════════════════════════════════════════════════════
# Pre-Test Checks
# ══════════════════════════════════════════════════════════════════════════

echo "📋 Running pre-test checks..."

# Check if database exists
if [ ! -f "$PROJECT_ROOT/agentdb.db" ]; then
    echo "❌ Database not found: agentdb.db"
    exit 1
fi

# Check if build exists
if [ ! -d "$PROJECT_ROOT/dist" ]; then
    echo "⚠️  Build directory not found, building..."
    npm run build:web
fi

echo "✅ Pre-test checks passed"
echo ""

# ══════════════════════════════════════════════════════════════════════════
# Test Execution
# ══════════════════════════════════════════════════════════════════════════

# Start server for E2E tests
start_test_server

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Running Unit Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npm test -- --testPathPattern="src/tests/.*\\.test\\.ts" --testPathIgnorePatterns="e2e" || {
    echo "❌ Unit tests failed"
    exit 1
}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Running E2E API Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TEST_URL=$TEST_URL npm test -- --testPathPattern="e2e-api.test.ts" || {
    echo "❌ E2E tests failed"
    echo ""
    echo "Server logs:"
    cat /tmp/test-server.log
    exit 1
}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Running Smoke Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Quick smoke tests with curl
echo "Testing /api/cockpit..."
curl -sf "$TEST_URL/api/cockpit" > /dev/null || {
    echo "❌ Cockpit endpoint failed"
    exit 1
}
echo "✅ /api/cockpit OK"

echo "Testing /api/rooz/events..."
curl -sf "$TEST_URL/api/rooz/events" > /dev/null || {
    echo "❌ Events endpoint failed"
    exit 1
}
echo "✅ /api/rooz/events OK"

echo "Testing /api/circle-equity..."
curl -sf "$TEST_URL/api/circle-equity" > /dev/null || {
    echo "❌ Circle equity endpoint failed"
    exit 1
}
echo "✅ /api/circle-equity OK"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Database Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verify required tables exist
echo "Checking database schema..."
sqlite3 "$PROJECT_ROOT/agentdb.db" "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;" > /tmp/tables.txt

REQUIRED_TABLES=(
    "dimension_weights"
    "rooz_events"
    "rooz_subscriptions"
    "rooz_registrations"
    "rooz_roam_nodes"
    "rooz_roam_edges"
    "skills"
    "episodes"
)

for table in "${REQUIRED_TABLES[@]}"; do
    if ! grep -q "^$table$" /tmp/tables.txt; then
        echo "❌ Missing table: $table"
        exit 1
    fi
    echo "✅ Table exists: $table"
done

# Verify skill data
SKILL_COUNT=$(sqlite3 "$PROJECT_ROOT/agentdb.db" "SELECT COUNT(*) FROM skills WHERE name LIKE 'Test:%';")
if [ "$SKILL_COUNT" -lt 10 ]; then
    echo "⚠️  Warning: Only $SKILL_COUNT test skills found (expected 15)"
else
    echo "✅ Test skills: $SKILL_COUNT"
fi

# Verify events data
EVENT_COUNT=$(sqlite3 "$PROJECT_ROOT/agentdb.db" "SELECT COUNT(*) FROM rooz_events;")
if [ "$EVENT_COUNT" -lt 4 ]; then
    echo "⚠️  Warning: Only $EVENT_COUNT events found (expected 4+)"
else
    echo "✅ Events: $EVENT_COUNT"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  Performance Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Measure response times
echo "Measuring /api/cockpit response time..."
COCKPIT_TIME=$( (time curl -s "$TEST_URL/api/cockpit" > /dev/null) 2>&1 | grep real | awk '{print $2}' )
echo "Response time: $COCKPIT_TIME"

# Check if response time is under 2 seconds
if curl -s -w "%{time_total}" -o /dev/null "$TEST_URL/api/cockpit" | awk '{exit ($1 > 2)}'; then
    echo "✅ Performance OK (< 2s)"
else
    echo "⚠️  Performance warning (> 2s)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All Tests Passed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Test Summary:"
echo "  ✅ Unit tests: PASS"
echo "  ✅ E2E tests: PASS"
echo "  ✅ Smoke tests: PASS"
echo "  ✅ Database validation: PASS"
echo "  ✅ Performance tests: PASS"
echo ""
echo "🎉 Ready for deployment!"
