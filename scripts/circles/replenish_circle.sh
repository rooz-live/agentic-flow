#!/bin/bash
set -e

# Default to project root
if [ -z "$PROJECT_ROOT" ]; then
  # Assuming this script is in scripts/circles/
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  export PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
fi

CIRCLE=$1
shift

if [ -z "$CIRCLE" ]; then
    echo "Usage: replenish_circle.sh [CIRCLE_NAME] [--auto-calc-wsjf] [--aggregate]"
    exit 1
fi

echo "🔄 Replenishing Circle: $CIRCLE"

# Log observability pattern
START_MS=$(python3 -c 'import time; print(int(time.time() * 1000))')

# 1. Replenish: Add new items from QUICK_WINS.md
# replenish_manager.py finds the correct backlogs for the circle
echo "--- Step 1: Adding New Insights ---"
python3 "$PROJECT_ROOT/scripts/circles/replenish_manager.py" "$CIRCLE" "$@"

# Find backlog files.
CIRCLE_DIR="$PROJECT_ROOT/circles/$CIRCLE" # Simplified path assumption
# Or try the deep path structure
DEEP_DIR="$PROJECT_ROOT/investing/agentic-flow/circles/$CIRCLE"

if [ -d "$DEEP_DIR" ]; then
    SEARCH_ROOT="$DEEP_DIR"
elif [ -d "$CIRCLE_DIR" ]; then
    SEARCH_ROOT="$CIRCLE_DIR"
else
    # Fallback: search anywhere
    SEARCH_ROOT="$PROJECT_ROOT"
fi

echo "--- Step 2: Validating & Sorting Backlogs ---"
# Find backlogs
find "$SEARCH_ROOT" -name "backlog.md" | while read backlog; do
    echo "Processing: $backlog"
    # Pass --circle explicitly for Adaptive Schema validation
    python3 "$PROJECT_ROOT/scripts/circles/wsjf_calculator.py" "$backlog" --circle "$CIRCLE" "$@"
done

END_MS=$(python3 -c 'import time; print(int(time.time() * 1000))')
DURATION_MS=$((END_MS - START_MS))

# Log observability pattern with duration
python3 "$PROJECT_ROOT/scripts/agentic/pattern_logger.py" "replenish_circle" \
  --data "{\"circle\": \"$CIRCLE\", \"duration_ms\": $DURATION_MS, \"action_completed\": true}" \
  --mode "mutate"
