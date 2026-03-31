#!/usr/bin/env bash
#
# 99-emit-metrics.sh
# Final hook: Append to events.jsonl and update AgentDB
#
# Input: Enhanced JSON context from stdin
# Output: Confirmation message

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
EVENTS_LOG="$REPO_ROOT/logs/learning/events.jsonl"

# Read enhanced context
CONTEXT="$(cat)"

# Ensure logs/learning directory exists
mkdir -p "$(dirname "$EVENTS_LOG")"

# Append to events.jsonl
echo "$CONTEXT" >> "$EVENTS_LOG"

# Call Python learning hooks system if available
if [ -f "$REPO_ROOT/scripts/agentic/learning_hooks_system.py" ]; then
    echo "$CONTEXT" | python3 "$REPO_ROOT/scripts/agentic/learning_hooks_system.py" --stdin 2>/dev/null || true
fi

echo "✓ Learning event captured"
