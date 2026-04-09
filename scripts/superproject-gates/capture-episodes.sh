#!/bin/bash

# Episode Capture Script
# Demonstrates capturing episodes using pattern metrics data

cd "$(dirname "$0")/.."

echo "🎓 Capturing learning episodes from pattern metrics..."
echo ""

# Check if pattern metrics exist
if [ ! -f ".goalie/pattern_metrics.jsonl" ]; then
    echo "❌ No pattern metrics found. Run capture-pattern-metrics.cjs first."
    exit 1
fi

METRICS_COUNT=$(wc -l < .goalie/pattern_metrics.jsonl | tr -d ' ')
echo "📊 Found $METRICS_COUNT pattern metrics"
echo ""

# The pattern metrics we just created serve as implicit episodes
# AgentDB will use these when we run the learner
echo "✅ Pattern metrics are ready to be processed by AgentDB learner"
echo ""

# Show sample metrics
echo "📋 Sample pattern metrics:"
head -3 .goalie/pattern_metrics.jsonl | while read -r line; do
    PATTERN=$(echo "$line" | python3 -c "import sys, json; print(json.load(sys.stdin).get('pattern', 'unknown'))")
    CIRCLE=$(echo "$line" | python3 -c "import sys, json; print(json.load(sys.stdin).get('circle', 'unknown'))")
    echo "   • $PATTERN [$CIRCLE]"
done

echo ""
echo "💡 Ready for learning! Next steps:"
echo "   1. npx agentdb learner run 2 0.5 0.6 false"
echo "   2. npx agentdb skill consolidate 2 0.6 3 true"
echo "   3. npx agentdb db stats"
echo ""
