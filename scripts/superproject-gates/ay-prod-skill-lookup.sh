#!/bin/bash
# ay-prod-skill-lookup.sh - Query relevant skills before ceremony execution

CIRCLE=$1  # orchestrator, assessor, innovator, analyst, seeker, intuitive
TASK=$2    # standup, wsjf, refine, replenish, review, retro
JSON_FLAG=$3  # --json for JSON output

if [ -z "$CIRCLE" ] || [ -z "$TASK" ]; then
  echo "Usage: $0 <circle> <task> [--json]"
  echo "  circle: orchestrator|assessor|innovator|analyst|seeker|intuitive"
  echo "  task: standup|wsjf|refine|replenish|review|retro"
  exit 1
fi

# JSON output mode
if [ "$JSON_FLAG" = "--json" ]; then
  # Try local cache first (local-first architecture)
  CACHE_FILE="$(dirname "$0")/../.cache/skills/${CIRCLE}.json"

  if [ -f "$CACHE_FILE" ]; then
    echo "📦 Using cached skills for ${CIRCLE}" >&2
    cat "$CACHE_FILE"
    exit 0
  fi

  # agentdb skill search doesn't support --json, parse text output
  SEARCH_RES=$(export AGENTDB_PATH=/Users/shahroozbhopti/Documents/code/agentic-flow-core/agentdb.db && npx agentdb skill search "$TASK $CIRCLE" 10 2>&1)
  echo "$SEARCH_RES" | python3 "$(dirname "$0")/parse_skills.py"
  exit 0
fi

# Human-readable output mode
echo "🔍 Searching skills for $CIRCLE circle, $TASK ceremony..."
echo ""

# Search for relevant skills (output is already formatted, not JSON)
PRIMARY_OUTPUT=$(npx agentdb skill search "$TASK $CIRCLE" 3 2>&1 | grep -v "^✅" | grep -v "^ℹ" || true)
echo "$PRIMARY_OUTPUT"

# If no results, try broader search
if echo "$PRIMARY_OUTPUT" | grep -qi "no skills found" || echo "$PRIMARY_OUTPUT" | grep -qi "no skill"; then
  echo "⚠️  No exact match found, trying broader search..."
  npx agentdb skill search "$TASK" 3 2>&1 | grep -v "^✅" | grep -v "^ℹ" || true
fi

echo ""
echo "💡 These skills can inform the execution strategy for $TASK in the $CIRCLE circle."
