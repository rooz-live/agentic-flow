#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

ITERATIONS=${1:-3}
CURRENT_ITERATION=0

echo "🔄 Starting Iterative Learning Loop"
echo "   Iterations: $ITERATIONS"
echo "   Project: $PROJECT_ROOT"
echo ""

while [ $CURRENT_ITERATION -lt $ITERATIONS ]; do
  CURRENT_ITERATION=$((CURRENT_ITERATION + 1))
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔁 ITERATION $CURRENT_ITERATION/$ITERATIONS"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  # 1. REPLENISH: Generate new workflow variations
  echo "📥 REPLENISH: Generating workflow variations..."
  node scripts/agile-workflow-generator.cjs
  echo ""
  
  # 2. REFINE: Convert metrics to episodes
  echo "🔧 REFINE: Converting metrics to episodes..."
  node scripts/create-episodes-from-metrics.cjs
  echo ""
  
  # 3. STANDUP: Insert new episodes into AgentDB
  echo "🚀 STANDUP: Inserting episodes..."
  EPISODE_COUNT=0
  for episode_file in /tmp/episode_run_*.json; do
    if [ -f "$episode_file" ]; then
      ./scripts/insert-episodes.sh "$episode_file" 2>&1 | grep -E "(Inserting episode|Episode inserted|Stored episode)" || true
      EPISODE_COUNT=$((EPISODE_COUNT + 1))
    fi
  done
  echo "   ✅ Inserted $EPISODE_COUNT episodes"
  echo ""
  
  # 4. WSJF: Run causal learner (prioritize causal relationships)
  echo "🎯 WSJF: Discovering causal edges..."
  npx agentdb learner run 2 0.5 0.6 false | grep -E "(Discovered|Min|Running)" || true
  echo ""
  
  # 5. REVIEW: Consolidate skills
  echo "📊 REVIEW: Consolidating skills..."
  npx agentdb skill consolidate 2 0.6 3 true | grep -E "(Created|Updated|Pattern|Avg Reward)" || true
  echo ""
  
  # 6. RETRO: Check database stats and analyze
  echo "🔍 RETRO: Analyzing learning progress..."
  npx agentdb db stats | grep -E "(episodes|causal_edges|skills|records)" || true
  echo ""
  
  echo "✅ Iteration $CURRENT_ITERATION complete"
  echo ""
  
  # Brief pause between iterations
  if [ $CURRENT_ITERATION -lt $ITERATIONS ]; then
    echo "⏸️  Pausing 2s before next iteration..."
    sleep 2
    echo ""
  fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Learning Loop Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📈 Final Analysis:"
npx agentdb db stats
echo ""
echo "🔍 Search skills:"
echo "   npx agentdb skill search \"wsjf\" 5"
echo "   npx agentdb skill search \"standup\" 5"
echo "   npx agentdb skill search \"retro\" 5"
echo ""
echo "💡 View metrics:"
echo "   tail -20 .goalie/pattern_metrics.jsonl | jq ."
