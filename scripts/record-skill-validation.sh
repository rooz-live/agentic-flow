#!/usr/bin/env bash
# record-skill-validation.sh - Record a skill validation event
set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <skill_name> <outcome> <confidence_after> [episode_id] [performance_score]"
  exit 1
fi

SKILL_NAME="$1"
OUTCOME="$2"
CONFIDENCE_AFTER="$3"
EPISODE_ID="${4:-}"
PERFORMANCE_SCORE="${5:-0.5}"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Insert via npx agentdb if available
if command -v npx >/dev/null 2>&1; then
  echo "Recording validation: $SKILL_NAME ($OUTCOME, confidence=$CONFIDENCE_AFTER)"
  # AgentDB custom insert would go here
  # For now, append to JSONL
  echo "{\"skill_name\":\"$SKILL_NAME\",\"outcome\":\"$OUTCOME\",\"confidence_after\":$CONFIDENCE_AFTER,\"timestamp\":\"$TIMESTAMP\"}" >> .agentdb/validations.jsonl
fi
