#!/bin/bash

# Quarantine Action Logger
# Logs quarantine operations with timestamps and user authorization

LOG_FILE="quarantine_audit.log"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
USER=$(whoami)

# Function to log actions
log_action() {
    local action="$1"
    local file="$2"
    local details="$3"
    echo "$TIMESTAMP | $action | $file | $USER | $details" >> "$LOG_FILE"
    echo "Logged: $action for $file"
}

# Usage: ./log_quarantine_action.sh <action> <file> <details>
if [ $# -eq 3 ]; then
    log_action "$1" "$2" "$3"
else
    echo "Usage: $0 <action> <file> <details>"
    exit 1
fi