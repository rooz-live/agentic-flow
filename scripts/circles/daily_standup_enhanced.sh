#!/bin/bash
# Enhanced Daily Standup - WSJF + Actionable Context + Relentless Execution
# Version: 2.0
# Owner: Orchestrator Circle
# Patterns: actionable_context, wsjf_protocol, relentless_execution

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

echo "═══════════════════════════════════════════════"
echo "🎯 DAILY STANDUP - WSJF ACTIONABLE CONTEXT"
echo "   $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════════════"
echo ""

# 1. Pattern Coverage
./scripts/af pattern-coverage --json | jq -r '"✅ Coverage: \(.coverage.coverage_percentage)% (\(.coverage.unique_patterns_logged)/\(.coverage.total_patterns))"'

# 2. Observability Status
./scripts/af detect-observability-gaps | grep "Overall Status" -A 1

# 3. Top 5 WSJF Actions
echo ""
echo "💰 TOP 5 WSJF PRIORITIES:"
./scripts/af retro-coach 2>&1 | grep -E "action_id|WSJF" | head -5 | sed 's/^/  /'

# 4. Blockers
echo ""
echo "🚧 BLOCKERS:"
./scripts/af retro-coach --summary 2>&1 | grep -i "\[risk\]\|\[blocker\]" | sed 's/^/  /' || echo "  ✅ None"

# 5. Action Completion
echo ""
TOTAL=$(./scripts/af retro-coach 2>&1 | grep -c "action_id" || echo 0)
DONE=$(git log --oneline --since="7 days ago" --grep="closes.*action" | wc -l | tr -d ' ')
PCT=$((DONE * 100 / (TOTAL > 0 ? TOTAL : 1)))
echo "📋 ACTION COMPLETION: $PCT% ($DONE/$TOTAL) - Target: 80%"

echo ""
echo "═══════════════════════════════════════════════"
echo "Next Standup: $(date -v+1d '+%Y-%m-%d 09:00' 2>/dev/null || date '+%Y-%m-%d 09:00')"
echo "═══════════════════════════════════════════════"
