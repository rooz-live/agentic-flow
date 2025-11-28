#!/usr/bin/env bash
#
# execute_with_learning.sh
#
# Wrapper script for capturing learning events from command execution
# Integrates with AgentDB and logs/learning/events.jsonl
#
# Usage: ./scripts/execute_with_learning.sh <phase> <command> [args...]
#   phase: pre|post|error
#

set -euo pipefail

PHASE="${1:-unknown}"
shift || true

# Ensure logs directory exists
mkdir -p logs/learning

# Capture event
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EVENT_JSON=$(cat <<EOF
{"ts":"$TIMESTAMP","phase":"$PHASE","args":"$*","pwd":"$(pwd)","user":"$(whoami)"}
EOF
)

# Append to learning log (atomic)
echo "$EVENT_JSON" >> logs/learning/events.jsonl

# Execute wrapped command if provided
if [ $# -gt 0 ]; then
    exec "$@"
fi

exit 0
