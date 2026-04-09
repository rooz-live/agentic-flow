#!/bin/bash
# ay-prod-learn-loop.sh - Continuous learning loop for ay prod-cycle

CIRCLE=${1:-"orchestrator"}
ITERATIONS=${2:-5}

if [ "$1" == "--help" ]; then
  echo "Usage: $0 [circle] [iterations]"
  echo "  circle: orchestrator|assessor|innovator|analyst|seeker|intuitive (default: orchestrator)"
  echo "  iterations: number of workflow iterations to generate (default: 5)"
  exit 0
fi

echo "🔁 Starting continuous learning loop for $CIRCLE circle"
echo "   Iterations: $ITERATIONS"
echo ""

# 1. Generate workflow metrics
echo "📊 Generating workflow metrics for $CIRCLE..."
node scripts/agile-workflow-generator.cjs --iterations $ITERATIONS --circle $CIRCLE || {
  echo "⚠️  Warning: workflow generator not yet updated for circle parameter, using default"
  node scripts/agile-workflow-generator.cjs
}

# 2. Convert metrics to episodes
echo ""
echo "🔄 Converting metrics to episodes..."
node scripts/create-episodes-from-metrics.cjs

# 3. Insert episodes
echo ""
echo "💾 Inserting episodes into AgentDB..."
EPISODE_COUNT=0
for f in /tmp/episode_*.json; do
  if [ -f "$f" ]; then
    ./scripts/insert-episodes.sh "$f"
    EPISODE_COUNT=$((EPISODE_COUNT + 1))
  fi
done

echo ""
echo "✅ Inserted $EPISODE_COUNT episodes"

# 4. Run learner
echo ""
echo "🧠 Running causal learner..."
npx agentdb learner run 2 0.5 0.6 false

# 5. Consolidate skills
echo ""
echo "🔧 Consolidating skills..."
npx agentdb skill consolidate 2 0.6 30 true

# 6. Show updated stats
echo ""
echo "📈 Updated AgentDB statistics:"
npx agentdb db stats

# 7. Show circle-specific skills
echo ""
echo "🎯 Skills for $CIRCLE circle:"
npx agentdb skill search "$CIRCLE" 5

echo ""
echo "✅ Learning loop complete for $CIRCLE circle"
