#!/bin/bash
set -e

# Replenish all circles with WSJF auto-calculation and aggregation
# Usage: ./replenish_all_circles.sh [--auto-calc-wsjf] [--aggregate]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

echo "🔄 Replenishing All Circles with WSJF Analysis"
echo "==============================================="

CIRCLES=("analyst" "assessor" "innovator" "intuitive" "orchestrator" "seeker")

for circle in "${CIRCLES[@]}"; do
    echo ""
    echo "➡️  Processing: $circle"
    echo "---"
    "$SCRIPT_DIR/replenish_circle.sh" "$circle" "$@" 2>&1 | grep -E "^(🔄|📊|✅|📈|⚠️|---)"
done

echo ""
echo "✅ All circles replenished!"
echo ""
echo "📊 Summary Report"
echo "================="
echo "Run 'af wsjf' to see consolidated WSJF priorities"
echo "Run 'af board' to view updated Kanban board"
