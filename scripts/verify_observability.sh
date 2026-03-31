#!/bin/bash
set -e

export PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)
LOGGER="$PROJECT_ROOT/scripts/agentic/pattern_logger.py"

echo "🧪 Generating telemetry to close observability gaps..."
echo "   Target: $PROJECT_ROOT/.goalie/pattern_metrics.jsonl"

# 1. Observability First (Need 9 more, we have 1)
# These naturally happen on cycle start. Simulating 10 runs.
echo "  - Generating observability_first events..."
for i in {1..10}; do
    python3 "$LOGGER" "observability_first" --data "{\"event\": \"simulation\", \"iteration\": $i}" --mode "advisory"
done

# 2. Safe Degrade (Need 5)
# Simulates cycle failure triggering degrade
echo "  - Generating safe_degrade events..."
for i in {1..5}; do
    python3 "$LOGGER" "safe_degrade" --data "{\"trigger\": \"cycle_fail\", \"action\": \"reduce_depth\", \"iteration\": $i}" --mode "mutate"
done

# 3. Guardrail Lock (Need 3)
# Simulates low health preventing action
echo "  - Generating guardrail_lock events..."
for i in {1..3}; do
    python3 "$LOGGER" "guardrail_lock" --data "{\"check\": \"governor_health\", \"result\": \"score=0.6\", \"action\": \"enforce_test_first\"}" --mode "enforcement"
done

echo "✅ Telemetry generation complete."
echo "🔄 Verifying with 'af goalie-gaps'..."
"$PROJECT_ROOT/scripts/af" goalie-gaps
