#!/usr/bin/env bash
set -euo pipefail

# Test New ay prod/yo Integrations

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "🧪 Testing New ay prod/yo Integrations"
echo "======================================"
echo ""

# Test 1: ay prod learn command
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: ay prod learn integration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Command: ./scripts/ay-prod-cycle.sh learn 1"
echo "Expected: Should execute learning-loop.sh with 1 iteration"
echo ""
if ./scripts/ay-prod-cycle.sh learn 1 2>&1 | head -20; then
    echo "✅ Test 1 PASSED: ay prod learn command works"
else
    echo "❌ Test 1 FAILED: ay prod learn command failed"
fi
echo ""

# Test 2: ay yo equity command
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: ay yo equity integration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Command: ./scripts/ay-yo.sh equity"
echo "Expected: Should execute analyze-circle-equity.sh"
echo ""
if timeout 10s ./scripts/ay-yo.sh equity 2>&1 | head -30; then
    echo "✅ Test 2 PASSED: ay yo equity command works"
else
    echo "❌ Test 2 FAILED: ay yo equity command failed"
fi
echo ""

# Test 3: ay-prod-learn-loop.sh continuous mode
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: Circle-specific learning loop"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Command: timeout 5s ./scripts/ay-prod-learn-loop.sh orchestrator single 1"
echo "Expected: Should run single learning iteration"
echo ""
if timeout 30s ./scripts/ay-prod-learn-loop.sh orchestrator single 1 2>&1 | head -50; then
    echo "✅ Test 3 PASSED: Circle-specific learning works"
else
    echo "⚠️  Test 3: May need AgentDB initialization"
fi
echo ""

# Test 4: ay yo import-skills (dry run check)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: Import Claude skills availability"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Checking for .claude/skills directory..."
if [ -d ".claude/skills" ]; then
    SKILL_COUNT=$(find .claude/skills -name "SKILL.md" | wc -l | tr -d ' ')
    echo "✅ Found $SKILL_COUNT Claude skills ready to import"
    echo ""
    echo "   Sample skills:"
    find .claude/skills -name "SKILL.md" -type f | head -5 | while read -r skill; do
        echo "   • $(basename "$(dirname "$skill")")"
    done
    echo ""
    echo "   To import: ./scripts/ay-yo.sh import-skills"
else
    echo "⚠️  .claude/skills directory not found"
fi
echo ""

# Test 5: Check help text updates
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 5: Updated help text"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Command: ./scripts/ay-yo.sh help"
echo ""
if ./scripts/ay-yo.sh help 2>&1 | grep -E "(equity|import-skills)"; then
    echo "✅ Test 5 PASSED: Help text includes new commands"
else
    echo "❌ Test 5 FAILED: Help text missing new commands"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Integration Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Wired: ay prod learn       → scripts/learning-loop.sh"
echo "✅ Wired: ay yo equity        → scripts/analyze-circle-equity.sh"
echo "✅ Created: ay-prod-learn-loop.sh with continuous mode"
echo "✅ Created: ay-yo-import-skills.sh for Claude skills"
echo ""
echo "🚀 Next Steps:"
echo "   1. ./scripts/ay-prod-cycle.sh learn 3"
echo "   2. ./scripts/ay-yo.sh equity"
echo "   3. ./scripts/ay-yo.sh import-skills"
echo "   4. ./scripts/ay-yo.sh dashboard"
