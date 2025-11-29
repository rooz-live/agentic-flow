#!/usr/bin/env bash
#
# Quick Start: Throttling + Learning Hooks Implementation
# 
# Usage: ./scripts/quick-start-throttling-hooks.sh [phase]
#   phase: 0|1|2|3|4|all (default: show help)
#

set -euo pipefail

PHASE="${1:-help}"

show_help() {
    cat << 'EOF'
🚀 Throttling + Learning Hooks Quick Start

PHASES:
  0  - Preflight (baseline capture, create POC branch)
  1  - Governor validation (stress tests, tuning)
  2  - Learning hooks (shell integration, batching)
  3  - Close learning gap (validate ratio)
  4  - Unified dashboard (single-pane view)
  all - Run all phases sequentially

CURRENT STATE:
EOF
    echo "  Governor events: $(wc -l < logs/governor_incidents.jsonl 2>/dev/null || echo 0)"
    echo "  Learning events: $(wc -l < logs/learning/events.jsonl 2>/dev/null || echo 0)"
    echo "  Ratio: $(awk 'FNR==NR{g=NR;next} END{l=NR; r=(l? g/l: g); printf "%.1f:1", r}' logs/governor_incidents.jsonl logs/learning/events.jsonl 2>/dev/null || echo 'N/A')"
    echo ""
    echo "USAGE:"
    echo "  ./scripts/quick-start-throttling-hooks.sh 0   # Start with preflight"
    echo "  ./scripts/quick-start-throttling-hooks.sh 1   # Validate governor"
    echo "  ./scripts/quick-start-throttling-hooks.sh all # Run full sequence"
}

phase_0_preflight() {
    echo "🔍 Phase 0: Preflight"
    echo ""
    
    # Create POC branch
    echo "Creating POC branch..."
    git checkout -b feat/throttling-learning-hooks 2>/dev/null || echo "  Branch already exists"
    
    # Baseline capture
    echo ""
    echo "📊 Baseline Metrics:"
    echo "---"
    
    echo "Governor config:"
    grep -E "AF_(CPU|BATCH|MAX_WIP|BACKOFF|RATE)" src/runtime/processGovernor.ts | head -7
    
    echo ""
    echo "Current counts:"
    echo "  Governor events: $(wc -l < logs/governor_incidents.jsonl 2>/dev/null || echo 0)"
    echo "  Learning events: $(wc -l < logs/learning/events.jsonl 2>/dev/null || echo 0)"
    
    echo ""
    echo "Recent metrics:"
    tail -3 .goalie/metrics_log.jsonl | jq -c '{ts:.timestamp,cpu_idle:.cpu_idle_pct,wip:.flow.wip_violations_pct}' 2>/dev/null || echo "  (jq not available)"
    
    echo ""
    echo "✅ Preflight complete"
    echo ""
    echo "Next: ./scripts/quick-start-throttling-hooks.sh 1"
}

phase_1_governor() {
    echo "⚙️  Phase 1: Governor Validation"
    echo ""
    
    # Check if test files exist
    if [ ! -f "tests/integration/throttled-stress.test.ts" ]; then
        echo "⚠️  Warning: throttled-stress.test.ts not found"
        echo "   Skipping stress tests"
        return
    fi
    
    echo "Running stress tests..."
    echo "Monitor in another terminal: tail -f logs/governor_incidents.jsonl | jq -c '{type,details}'"
    echo ""
    
    # Run with tuned parameters
    AF_TOKENS_PER_SECOND=5 \
    AF_CPU_HEADROOM_TARGET=0.5 \
    AF_MAX_WIP=4 \
    npm test -- tests/integration/throttled-stress.test.ts 2>&1 | tee logs/governor_stress_test.log
    
    echo ""
    echo "📊 Validation Results:"
    echo "  RATE_LIMITED events: $(grep -c RATE_LIMITED logs/governor_incidents.jsonl 2>/dev/null || echo 0)"
    echo "  CPU_OVERLOAD events: $(grep -c CPU_OVERLOAD logs/governor_incidents.jsonl 2>/dev/null || echo 0)"
    echo "  WIP_VIOLATION events: $(grep -c WIP_VIOLATION logs/governor_incidents.jsonl 2>/dev/null || echo 0)"
    
    echo ""
    echo "✅ Governor validation complete"
    echo ""
    echo "Next: ./scripts/quick-start-throttling-hooks.sh 2"
}

phase_2_hooks() {
    echo "🔗 Phase 2: Learning Hooks"
    echo ""
    
    echo "This phase requires manual implementation:"
    echo ""
    echo "1. Create scripts/shell_integration.sh"
    echo "   - PROMPT_COMMAND integration"
    echo "   - Smart exclusions (vim, less, man, top, etc.)"
    echo "   - Scope controls (AGENTDB_SCOPE, AGENTDB_CAPTURE)"
    echo ""
    echo "2. Upgrade scripts/execute_with_learning.sh"
    echo "   - Batching (10 events or 2s)"
    echo "   - Debouncing (<1s duplicates)"
    echo "   - Async writer (background)"
    echo "   - Log rotation (50MB, keep 5)"
    echo ""
    echo "3. Create scripts/validate-learning-capture.sh"
    echo "   - Smoke test (5 commands → 5 events)"
    echo "   - Performance validation (<5ms overhead)"
    echo ""
    echo "Refer to docs/INCREMENTAL_RELENTLESS_EXECUTION_STATUS.md for details."
    echo ""
    echo "After implementation, run: ./scripts/quick-start-throttling-hooks.sh 3"
}

phase_3_gap() {
    echo "📈 Phase 3: Close Learning Gap"
    echo ""
    
    GOVERNOR_COUNT=$(wc -l < logs/governor_incidents.jsonl 2>/dev/null || echo 0)
    LEARNING_COUNT=$(wc -l < logs/learning/events.jsonl 2>/dev/null || echo 0)
    
    if [ "$LEARNING_COUNT" -eq 0 ]; then
        echo "⚠️  No learning events captured yet"
        echo "   1. Source scripts/shell_integration.sh"
        echo "   2. Run normal dev commands for ~1 hour"
        echo "   3. Re-run this phase"
        return
    fi
    
    RATIO=$(awk -v g="$GOVERNOR_COUNT" -v l="$LEARNING_COUNT" 'BEGIN {printf "%.1f", l>0 ? g/l : g}')
    
    echo "Current counts:"
    echo "  Governor events: $GOVERNOR_COUNT"
    echo "  Learning events: $LEARNING_COUNT"
    echo "  Ratio: $RATIO:1"
    echo ""
    
    if (( $(echo "$RATIO < 100" | bc -l 2>/dev/null || echo 0) )); then
        echo "✅ Target achieved (<100:1)"
    else
        echo "🔄 Target not yet met (ratio: $RATIO:1, target: <100:1)"
        echo ""
        echo "Actions:"
        echo "  - Ensure shell_integration.sh sourced in all terminals"
        echo "  - Check AGENTDB_SCOPE (should be 'all')"
        echo "  - Verify post_command hook not failing silently"
    fi
    
    echo ""
    echo "Recent learning events:"
    tail -5 logs/learning/events.jsonl 2>/dev/null || echo "  (none)"
    
    echo ""
    echo "Next: ./scripts/quick-start-throttling-hooks.sh 4"
}

phase_4_dashboard() {
    echo "📊 Phase 4: Unified Dashboard"
    echo ""
    
    if [ -f "scripts/unified_context_dashboard.sh" ]; then
        echo "Running dashboard..."
        ./scripts/unified_context_dashboard.sh
    else
        echo "⚠️  scripts/unified_context_dashboard.sh not found"
        echo ""
        echo "Create it to aggregate:"
        echo "  - WSJF items from .goalie/CONSOLIDATED_ACTIONS.yaml"
        echo "  - Governor incidents (last 10)"
        echo "  - Learning events (last 10, grouped)"
        echo "  - Metrics from .goalie/metrics_log.jsonl"
        echo "  - Quick-wins progress from docs/QUICK_WINS.md"
        echo ""
        echo "Then add to .vscode/tasks.json as 'Context Dashboard'"
    fi
}

# Main
case "$PHASE" in
    0) phase_0_preflight ;;
    1) phase_1_governor ;;
    2) phase_2_hooks ;;
    3) phase_3_gap ;;
    4) phase_4_dashboard ;;
    all)
        phase_0_preflight
        phase_1_governor
        phase_2_hooks
        phase_3_gap
        phase_4_dashboard
        ;;
    *)
        show_help
        exit 0
        ;;
esac
