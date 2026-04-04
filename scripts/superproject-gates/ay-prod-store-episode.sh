#!/bin/bash
# ay-prod-store-episode.sh - Store ay prod-cycle outcome for learning

CYCLE_ID=$1
OUTCOME=$2  # success or failure
REWARD=$3   # 0.0 to 1.0 (optional, auto-calc from WSJF)
CIRCLE=${4:-"orchestrator"}  # default to orchestrator
CEREMONY=${5:-"standup"}  # default to standup

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

TMP_DIR="${AY_TMP_DIR:-/tmp}"

# If reward not provided, try auto-calculation from WSJF
if [ -z "$REWARD" ] && [ -n "${WSJF_CONTEXT:-}" ] && [ "$WSJF_CONTEXT" != "{}" ]; then
  # Extract WSJF confidence
  confidence=$(echo "$WSJF_CONTEXT" | jq -r '.confidence // 0.50' 2>/dev/null || echo "0.50")
  success_flag=1
  [ "$OUTCOME" = "failure" ] && success_flag=0
  
  # Calculate reward using reward calculator
  if [ -f "$PROJECT_ROOT/.agentdb/reward-calculator.py" ]; then
    REWARD=$(python3 "$PROJECT_ROOT/.agentdb/reward-calculator.py" \
      --success "$success_flag" \
      --wsjf-confidence "$confidence" \
      --latency-ms 1000 2>/dev/null || echo "0.80")
  else
    # Fallback: simple calculation
    REWARD=$(awk "BEGIN {printf \"%.2f\", 0.6 + (0.4 * $confidence)}")
  fi
fi

# Default if still not set
[ -z "$REWARD" ] && REWARD="0.80"

# Validate reward is numeric and in range
if [ -n "$REWARD" ]; then
  # Check if reward is a valid number
  if ! [[ "$REWARD" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
    echo "⚠️  Invalid reward value: $REWARD (must be numeric 0.0-1.0)"
    REWARD="0.80"
  fi
  # Ensure reward is between 0 and 1
  if command -v bc &>/dev/null; then
    if (( $(echo "$REWARD > 1.0" | bc -l) )); then REWARD="1.0"; fi
    if (( $(echo "$REWARD < 0.0" | bc -l) )); then REWARD="0.60"; fi
  fi
fi

if [ -z "$CYCLE_ID" ] || [ -z "$OUTCOME" ] || [ -z "$REWARD" ]; then
  echo "Usage: $0 <cycle_id> <success|failure> <reward> [circle] [ceremony]"
  echo "  cycle_id: unique identifier for this prod-cycle"
  echo "  outcome: success or failure"
  echo "  reward: 0.0 to 1.0"
  echo "  circle: orchestrator|assessor|innovator|analyst|seeker|intuitive (optional)"
  echo "  ceremony: standup|wsjf|review|retro|refine|replenish|synthesis (optional)"
  exit 1
fi

echo "📝 Storing ay prod-cycle episode..."
echo "   Cycle ID: $CYCLE_ID"
echo "   Outcome: $OUTCOME"
echo "   Reward: $REWARD"
echo "   Circle: $CIRCLE"
echo "   Ceremony: $CEREMONY"
echo ""

# Create episode JSON
EPISODE_FILE="$TMP_DIR/ay-prod-episode-$CYCLE_ID.json"

# Check for WSJF metadata from environment or file
WSJF_METADATA='{}'
if [ -n "${WSJF_CONTEXT:-}" ]; then
    # Validate JSON before using
    if echo "$WSJF_CONTEXT" | jq empty 2>/dev/null; then
        WSJF_METADATA="$WSJF_CONTEXT"
    else
        echo "⚠️  Warning: Invalid WSJF_CONTEXT JSON, using defaults"
        WSJF_METADATA='{}'
    fi
elif [ -f "$TMP_DIR/wsjf_context_${CYCLE_ID}.json" ]; then
    # Validate file JSON
    if jq empty "$TMP_DIR/wsjf_context_${CYCLE_ID}.json" 2>/dev/null; then
        WSJF_METADATA=$(cat "$TMP_DIR/wsjf_context_${CYCLE_ID}.json")
    else
        echo "⚠️  Warning: Invalid JSON in wsjf_context file, using defaults"
        WSJF_METADATA='{}'
    fi
fi

cat > "$EPISODE_FILE" <<EOF
{
  "name": "ay_prod_cycle_${CYCLE_ID}",
  "task": "ay prod-cycle execution for $CIRCLE/$CEREMONY",
  "reward": $REWARD,
  "trajectory": [
    {
      "state": "Starting ay prod-cycle for $CIRCLE/$CEREMONY",
      "action": "executeWithZeroFailure",
      "reward": $REWARD
    }
  ],
  "metadata": {
    "circle": "$CIRCLE",
    "ceremony": "$CEREMONY",
    "cycle_type": "ay_prod",
    "outcome": "$OUTCOME",
    "patterns": ["af-prod", "zero-failure", "multipass-convergence"],
    "wsjf_context": $WSJF_METADATA
  }
}
EOF

echo "✅ Episode created: $EPISODE_FILE"
echo ""

# Auto-insert if AY_AUTO_INSERT=1 (default for auto-cycle)
if [ "${AY_AUTO_INSERT:-0}" = "1" ]; then
  echo "📥 Auto-inserting episode into AgentDB..."
  if [ -f "$SCRIPT_DIR/insert-episodes.sh" ]; then
    "$SCRIPT_DIR/insert-episodes.sh" "$EPISODE_FILE" 2>/dev/null || {
      echo "⚠️  Auto-insert failed - manual insert required:"
      echo "  ./scripts/insert-episodes.sh $EPISODE_FILE"
    }
  else
    echo "⚠️  insert-episodes.sh not found"
    echo "To insert this episode into AgentDB:"
    echo "  ./scripts/insert-episodes.sh $EPISODE_FILE"
  fi
else
  echo "To insert this episode into AgentDB:"
  echo "  ./scripts/insert-episodes.sh $EPISODE_FILE"
fi
