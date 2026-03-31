#!/bin/bash
set -e

# Demo: Integrated Production Workflow
# Shows the new --with-full-workflow flag in action

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 Agentic Flow - Integrated Production Workflow Demo"
echo ""
echo "This demonstrates the new --with-full-workflow flag that integrates:"
echo "  1. Pre-cycle health check (quick-health)"
echo "  2. Production cycle execution"
echo "  3. Post-cycle graduation assessment"
echo ""

# ============================================================================
# Example 1: Basic Workflow (Old Way)
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "❌ OLD WAY: Manual 3-step process"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "# Step 1: Manual health check"
echo "$ ./scripts/af quick-health"
echo ""
echo "# Step 2: Run prod-cycle"
echo "$ AF_ENV=local ./scripts/af prod-cycle --mode advisory --iterations 25 --json"
echo ""
echo "# Step 3: Manual graduation assessment"
echo "$ ./scripts/af evidence assess --json | jq '{...}'"
echo ""
echo "⚠️  Problem: Manual steps, easy to skip, inconsistent execution"
echo ""

# ============================================================================
# Example 2: Integrated Workflow (New Way)
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ NEW WAY: Single command with --with-full-workflow"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Command:"
echo "$ AF_ENV=local ./scripts/af prod-cycle \\"
echo "    --mode advisory \\"
echo "    --iterations 25 \\"
echo "    --with-full-workflow \\"
echo "    --default-emitters \\"
echo "    --json"
echo ""
echo "✨ Benefits:"
echo "  • Automatic pre-flight health checks"
echo "  • Integrated evidence collection"
echo "  • Post-cycle graduation assessment"
echo "  • Consistent execution every time"
echo "  • CI/CD friendly"
echo ""

# Prompt for demo execution
read -p "Run DEMO with --with-full-workflow? (takes ~5 min) [y/N] " -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Skipping execution. Demo complete!"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📚 Usage Examples"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "# Advisory cycle with full workflow"
    echo "./scripts/af prod-cycle --mode advisory --iterations 25 --with-full-workflow"
    echo ""
    echo "# Production swarm with full workflow"
    echo "./scripts/af prod-swarm --golden-iters 25 --with-full-workflow --default-emitters"
    echo ""
    echo "# Just pre-health check (no post-assess)"
    echo "./scripts/af prod-cycle --mode advisory --iterations 25 --with-health-check"
    echo ""
    echo "# Just post-assessment (no pre-health)"
    echo "./scripts/af prod-cycle --mode advisory --iterations 25 --with-evidence-assess"
    echo ""
    echo "# Shadow cycle for graduation tracking (10 cycles)"
    echo "for i in {1..10}; do"
    echo "  ./scripts/af prod-cycle \\"
    echo "    --mode advisory \\"
    echo "    --iterations 25 \\"
    echo "    --with-full-workflow \\"
    echo "    --json > .goalie/shadow_cycle_\${i}.json"
    echo "  sleep 30"
    echo "done"
    echo ""
    exit 0
fi

# ============================================================================
# Execute Demo
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 Running integrated workflow..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$PROJECT_ROOT"

# Run with reduced iterations for demo (5 instead of 25)
AF_ENV=local ./scripts/af prod-cycle \
  --mode advisory \
  --iterations 5 \
  --circle assessor \
  --with-full-workflow \
  --json > /tmp/af_demo_result.json

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Demo Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Results saved to: /tmp/af_demo_result.json"
echo ""

# Show summary if jq is available
if command -v jq &> /dev/null; then
    echo "📊 Quick Summary:"
    echo ""
    
    # Check for graduation data in the result
    if jq -e '.graduation' /tmp/af_demo_result.json &> /dev/null; then
        jq -r '
            "🎓 Graduation Status: \(.graduation.assessment)",
            "   Green Streak: \(.graduation.green_streak_count)/\(.graduation.green_streak_required)",
            "   Stability: \(.graduation.stability_score)%/\(.graduation.min_stability_score)%",
            "   Ready: \(if .graduation.ready_for_graduation then "✅ YES" else "⏸️  NOT YET" end)"
        ' /tmp/af_demo_result.json 2>/dev/null || true
    else
        echo "   (Graduation data in separate assessment output)"
    fi
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📚 Next Steps"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Run 10 shadow cycles for autocommit graduation:"
echo "   ./scripts/af prod-cycle --mode advisory --iterations 25 --with-full-workflow --json"
echo ""
echo "2. Check QUICKSTART_PROD_CYCLE.md for complete workflows"
echo ""
echo "3. Use in CI/CD:"
echo "   AF_ENV=ci ./scripts/af prod-cycle --mode advisory --with-full-workflow --json"
echo ""
