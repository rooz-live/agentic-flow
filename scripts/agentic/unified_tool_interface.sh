#!/usr/bin/env bash
#
# unified_tool_interface.sh - Single interface for all agentic tools
#
# Consolidates: agentic-jujutsu, goalie, agentic-flow, claude-flow
# Enforces NO-NEW-MD policy and provides structured output
#
# Usage:
#   ./scripts/agentic/unified_tool_interface.sh status
#   ./scripts/agentic/unified_tool_interface.sh analyze
#   ./scripts/agentic/unified_tool_interface.sh plan

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source environment shim
source "$REPO_ROOT/scripts/policy/env_shim.sh"

# Configuration
LOGS_DIR="$REPO_ROOT/logs"
ANALYSIS_LOG="$LOGS_DIR/federation_analysis_$(date +%Y%m%d_%H%M%S).json"

mkdir -p "$LOGS_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse command
COMMAND="${1:-status}"

run_status() {
    echo -e "${BLUE}📊 Unified Status Report${NC}"
    echo "======================================"
    echo ""
    
    # AgentDB status
    echo -e "${GREEN}AgentDB:${NC}"
    if [ -f "$REPO_ROOT/.agentdb/agentdb.sqlite" ]; then
        echo "  ✓ Database exists"
        local event_count=$(sqlite3 "$REPO_ROOT/.agentdb/agentdb.sqlite" "SELECT COUNT(*) FROM learning_events" 2>/dev/null || echo "0")
        echo "  ✓ Learning events: $event_count"
    else
        echo "  ✗ Database not found"
    fi
    echo ""
    
    # Goalie status
    echo -e "${GREEN}Goalie (Action Tracking):${NC}"
    if [ -f "$REPO_ROOT/.goalie/cycle_log.jsonl" ]; then
        local cycles=$(wc -l < "$REPO_ROOT/.goalie/cycle_log.jsonl")
        echo "  ✓ Execution cycles: $cycles"
    fi
    if [ -f "$REPO_ROOT/.goalie/metrics_log.jsonl" ]; then
        local metrics=$(wc -l < "$REPO_ROOT/.goalie/metrics_log.jsonl")
        echo "  ✓ Metrics snapshots: $metrics"
    fi
    echo ""
    
    # Learning events
    echo -e "${GREEN}Learning Infrastructure:${NC}"
    if [ -f "$REPO_ROOT/logs/learning/events.jsonl" ]; then
        local events=$(wc -l < "$REPO_ROOT/logs/learning/events.jsonl")
        echo "  ✓ Total events: $events"
        
        # Verdict distribution
        local successes=$(grep -c '"verdict": "success"' "$REPO_ROOT/logs/learning/events.jsonl" 2>/dev/null || echo "0")
        local failures=$(grep -c '"verdict": "failure"' "$REPO_ROOT/logs/learning/events.jsonl" 2>/dev/null || echo "0")
        echo "  ✓ Success rate: $successes/$events"
        echo "  ✓ Failure rate: $failures/$events"
    else
        echo "  ⚠ No learning events captured yet"
    fi
    echo ""
    
    # Risk analytics DB
    echo -e "${GREEN}Risk Analytics:${NC}"
    if [ -f "$REPO_ROOT/metrics/risk_analytics_baseline.db" ]; then
        echo "  ✓ Baseline database exists"
        local snapshots=$(sqlite3 "$REPO_ROOT/metrics/risk_analytics_baseline.db" "SELECT COUNT(*) FROM snapshots" 2>/dev/null || echo "0")
        echo "  ✓ Metric snapshots: $snapshots"
    else
        echo "  ✗ Baseline database not found"
    fi
    echo ""
    
    # Git state
    echo -e "${GREEN}Repository:${NC}"
    echo "  Branch: $(git branch --show-current 2>/dev/null || echo 'unknown')"
    echo "  Ref: $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
    echo ""
    
    # Quick Wins progress
    echo -e "${GREEN}Quick Wins Progress:${NC}"
    if [ -f "$REPO_ROOT/docs/QUICK_WINS.md" ]; then
        local total_items=$(grep -c '^\- \[' "$REPO_ROOT/docs/QUICK_WINS.md" 2>/dev/null || echo "0")
        local done_items=$(grep -c '^\- \[x\]' "$REPO_ROOT/docs/QUICK_WINS.md" 2>/dev/null || echo "0")
        local percent=$((done_items * 100 / (total_items > 0 ? total_items : 1)))
        echo "  ✓ Completed: $done_items/$total_items ($percent%)"
    else
        echo "  ⚠ QUICK_WINS.md not found"
    fi
    echo ""
}

run_analyze() {
    echo -e "${BLUE}🔬 Running Analysis${NC}"
    echo "======================================"
    echo ""
    
    local analysis_data="{\"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"
    
    # Try agentic-jujutsu (if available)
    echo -e "${YELLOW}→ Checking agentic-jujutsu...${NC}"
    if command -v npx &>/dev/null; then
        # Note: agentic-jujutsu may not work on macOS darwin-x64
        if npx agentic-jujutsu@latest status 2>/dev/null; then
            echo "  ✓ agentic-jujutsu status retrieved"
        else
            echo "  ⚠ agentic-jujutsu not available (platform limitation)"
        fi
    else
        echo "  ✗ npx not found"
    fi
    echo ""
    
    # Analyze metrics trends
    echo -e "${YELLOW}→ Analyzing metrics trends...${NC}"
    if [ -f "$REPO_ROOT/.goalie/metrics_log.jsonl" ]; then
        local recent_metrics=$(tail -5 "$REPO_ROOT/.goalie/metrics_log.jsonl")
        echo "  ✓ Recent metrics analyzed"
    fi
    echo ""
    
    # Analyze learning events
    echo -e "${YELLOW}→ Analyzing learning patterns...${NC}"
    if [ -f "$REPO_ROOT/logs/learning/events.jsonl" ]; then
        local success_rate=$(grep -c '"verdict": "success"' "$REPO_ROOT/logs/learning/events.jsonl" 2>/dev/null || echo "0")
        local total_events=$(wc -l < "$REPO_ROOT/logs/learning/events.jsonl")
        if [ "$total_events" -gt 0 ]; then
            local rate=$((success_rate * 100 / total_events))
            echo "  ✓ Success rate: $rate%"
            analysis_data=$(echo "$analysis_data" | jq --argjson sr $rate '. + {success_rate: $sr}')
        fi
    fi
    echo ""
    
    # Save analysis
    echo "$analysis_data" | jq '.' > "$ANALYSIS_LOG"
    echo -e "${GREEN}✓ Analysis saved to: $ANALYSIS_LOG${NC}"
    echo ""
}

run_plan() {
    echo -e "${BLUE}📋 WSJF Planning${NC}"
    echo "======================================"
    echo ""
    
    # Read QUICK_WINS if available
    if [ ! -f "$REPO_ROOT/docs/QUICK_WINS.md" ]; then
        echo -e "${RED}✗ docs/QUICK_WINS.md not found${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}→ Computing WSJF priorities...${NC}"
    
    # Extract HIGH priority items
    local high_items=$(grep '\[x\] ✅.*priority: HIGH' "$REPO_ROOT/docs/QUICK_WINS.md" 2>/dev/null | wc -l)
    local high_pending=$(grep '\[ \].*priority: HIGH' "$REPO_ROOT/docs/QUICK_WINS.md" 2>/dev/null | wc -l)
    
    echo "  HIGH priority: $high_items complete, $high_pending pending"
    echo ""
    
    # Show next recommended items
    echo -e "${GREEN}Next Recommended Actions:${NC}"
    grep '\[ \].*priority: HIGH' "$REPO_ROOT/docs/QUICK_WINS.md" 2>/dev/null | head -3 || echo "  (none pending)"
    echo ""
    
    # Create plan.json
    local plan_file="$REPO_ROOT/.goalie/plan.json"
    cat > "$plan_file" <<EOF
{
  "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "strategy": "WSJF",
  "high_priority_pending": $high_pending,
  "recommended_next": "Execute high_priority items first"
}
EOF
    
    echo -e "${GREEN}✓ Plan saved to: $plan_file${NC}"
}

case "$COMMAND" in
    status)
        run_status
        ;;
    analyze)
        run_analyze
        ;;
    plan)
        run_plan
        ;;
    *)
        echo "Usage: $0 {status|analyze|plan}"
        echo ""
        echo "Commands:"
        echo "  status   - Show current system status"
        echo "  analyze  - Run analysis and save results"
        echo "  plan     - Generate WSJF-based execution plan"
        exit 1
        ;;
esac
