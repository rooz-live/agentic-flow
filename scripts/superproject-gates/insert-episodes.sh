#!/bin/bash
set -e

EPISODE_FILE=${1:-/tmp/episode_run_1767742427225_fmae6sfdt.json}

if [ ! -f "$EPISODE_FILE" ]; then
  echo "❌ Episode file not found: $EPISODE_FILE"
  exit 1
fi

echo "📥 Inserting episode from: $EPISODE_FILE"

# Parse episode JSON
NAME=$(jq -r '.name' "$EPISODE_FILE")
DESC=$(jq -r '.task // .description' "$EPISODE_FILE")
TRAJ_LEN=$(jq '.trajectory | length' "$EPISODE_FILE")
FINAL_REWARD=$(jq -r '.trajectory[-1].reward' "$EPISODE_FILE")
SUCCESS=$([ $(echo "$FINAL_REWARD >= 0.7" | bc -l) -eq 1 ] && echo "true" || echo "false")

# Extract circle and ceremony from metadata
CIRCLE=$(jq -r '.metadata.circle // "orchestrator"' "$EPISODE_FILE")
CEREMONY=$(jq -r '.metadata.ceremony // "standup"' "$EPISODE_FILE")

# Build critique from trajectory
CRITIQUE=$(jq -r '.trajectory | to_entries | map("Step \(.key+1): \(.value.state) (\(.value.action)) → reward \(.value.reward)") | join("\n")' "$EPISODE_FILE")

# Get full metadata JSON
METADATA=$(jq -c '.metadata // {}' "$EPISODE_FILE")

echo "   Name: $NAME"
echo "   Circle: $CIRCLE"
echo "   Ceremony: $CEREMONY"
echo "   Steps: $TRAJ_LEN"
echo "   Final reward: $FINAL_REWARD"
echo "   Success: $SUCCESS"

# Insert using SQLite directly with full metadata
cd /Users/shahroozbhopti/Documents/code/agentic-flow-core

# Use SQLite to insert with proper metadata (bypassing CLI limitations)
sqlite3 agentdb.db <<SQL
INSERT INTO episodes (ts, session_id, task, input, output, critique, reward, success, latency_ms, tokens_used, tags, metadata)
VALUES (
  strftime('%s', 'now'),
  '$NAME',
  '$CIRCLE/$CEREMONY',
  '$DESC',
  '$SUCCESS',
  '$CRITIQUE',
  $FINAL_REWARD,
  $([ "$SUCCESS" = "true" ] && echo 1 || echo 0),
  1000,
  0,
  '["$CIRCLE","$CEREMONY","ay-prod"]',
  '$METADATA'
);
SQL

echo "✅ Episode inserted successfully with circle=$CIRCLE, ceremony=$CEREMONY!"
