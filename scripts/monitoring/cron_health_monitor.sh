#!/bin/bash
# cron_health_monitor.sh
# Checks system load and logs to governor_incidents.jsonl
# Used to reset/maintain the "recent incidents" window for Agentic Flow governance.

# Resolve paths
# Assuming this script might be run from anywhere, we try to locate the project root.
# If run from within the repo (scripts/monitoring), we can find root.
# If run from .claude/agents, we might need hardcoded paths or env vars.

# Default to current directory or try to find the repo
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Try to find agentic-flow root
if [[ "$SCRIPT_DIR" == *"/investing/agentic-flow"* ]]; then
    PROJECT_ROOT="${SCRIPT_DIR%/investing/agentic-flow*}/investing/agentic-flow"
else
    # Fallback: Assume standard structure if running from .claude/agents
    # /Users/shahroozbhopti/Documents/code/.claude/agents -> /Users/shahroozbhopti/Documents/code/investing/agentic-flow
    PROJECT_ROOT="/Users/shahroozbhopti/Documents/code/investing/agentic-flow"
fi

LOG_FILE="$PROJECT_ROOT/logs/governor_incidents.jsonl"
mkdir -p "$(dirname "$LOG_FILE")"

# Get load average (1 minute)
# macOS 'uptime' output example: "14:00  up 1 day, 10:00, 2 users, load averages: 1.50 1.40 1.35"
# Linux 'uptime' output example: " 14:00:00 up 1 day, 10:00,  2 users,  load average: 1.50, 1.40, 1.35"
LOAD=$(uptime | awk -F'load average' '{print $2}' | awk -F',' '{print $1}' | tr -d ' s:')

# Threshold (adjust as needed, matching governance.py logic roughly)
THRESHOLD=5.0

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Check if load is valid number
if [[ ! "$LOAD" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
    LOAD=0
fi

# Determine status
if (( $(echo "$LOAD > $THRESHOLD" | bc -l) )); then
    STATUS="system_overload"
    ACTION="warn"
else
    STATUS="healthy"
    ACTION="info"
fi

# Log JSON
# We log "healthy" events too, so that the "recent incidents" count (grep "system_overload")
# decreases as healthy records push old overload records out of the tail window.
echo "{\"timestamp\": \"$TIMESTAMP\", \"command\": \"HEALTH_CHECK\", \"reason\": \"$STATUS\", \"action\": \"$ACTION\", \"load1\": $LOAD, \"threshold\": $THRESHOLD}" >> "$LOG_FILE"

# Output for manual run
echo "Logged: $STATUS (Load: $LOAD)"
