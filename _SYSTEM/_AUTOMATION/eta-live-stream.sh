#!/bin/bash
# ETA Live Stream Wrapper
# @business-context WSJF-7.5: Dashboard Improvements
# @adr ADR-006: Daemon Architecture Design
# @constraint R-2026-018: Dashboard Ephemerality Drop
# @planned-change R-2026-020: Hardware Telemetry Sync

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
ROBUST_WRAPPER="$ROOT_DIR/scripts/robust-quality.sh"

source "$ROOT_DIR/_SYSTEM/_AUTOMATION/exit-codes.sh"

if [[ ! -x "$ROBUST_WRAPPER" ]]; then
    echo "ERROR: robust-quality.sh wrapper not found or not executable at $ROBUST_WRAPPER"
    exit "$EXIT_NO_SUCH_FILE"
fi

# Define process boundaries
MAX_STEPS=100
MAX_DURATION=300
DEPENDENCIES="curl,jq"
DESCRIPTION="ETA Live Streaming Dashboard Telemetry"

# Register the dashboard hook to emit progress
"$ROBUST_WRAPPER" hook

# The actual telemetry stream command
# Transmitting bounded JSONL metrics securely to the ETA Dashboard 
# Relies natively on the `timeout_guard` wrapper safely exiting unbounded operations.
STREAM_CMD="if [ -f .goalie/metrics_log.jsonl ]; then tail -n 10 -f .goalie/metrics_log.jsonl | while read -r line; do echo \"[DBOS-ETA-HOOK] \$line\"; sleep 1; done; else echo 'Missing metrics'; exit 1; fi"

# Execute bound by contracts
echo "Starting bounded ETA live stream..."
"$ROBUST_WRAPPER" run "$MAX_STEPS" "$MAX_DURATION" "$DEPENDENCIES" "$DESCRIPTION" "$STREAM_CMD"
EXIT_CODE=$?

exit $EXIT_CODE
