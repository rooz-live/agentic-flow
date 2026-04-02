#!/bin/bash
# ETA Live Stream Wrapper
# @business-context WSJF-7.5: Dashboard Improvements
# @adr ADR-006: Daemon Architecture Design
# @constraint R-2026-018: Dashboard Ephemerality Drop
# @planned-change R-2026-020: Hardware Telemetry Sync

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
BOUNDED_ETA_WRAPPER="$SCRIPT_DIR/run-bounded-eta.sh"

source "$ROOT_DIR/_SYSTEM/_AUTOMATION/exit-codes.sh"

if [[ ! -x "$BOUNDED_ETA_WRAPPER" ]]; then
    echo "ERROR: bounded ETA wrapper not found or not executable at $BOUNDED_ETA_WRAPPER"
    exit "$EXIT_NO_SUCH_FILE"
fi

# Execute telemetry bounded by process contracts natively only if invoked directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    source "$BOUNDED_ETA_WRAPPER"

    # The actual telemetry stream command
    # Transmitting bounded JSONL metrics securely to the ETA Dashboard 
    # Relies natively on the `run_bounded_eta` wrapper safely exiting unbounded operations.
    STREAM_CMD="if [ -f .goalie/metrics_log.jsonl ]; then tail -n 10 -f .goalie/metrics_log.jsonl | while read -r line; do echo \"[DBOS-ETA-HOOK] \$line\"; sleep 1; done; else echo 'Missing metrics'; exit 1; fi"

    # Execute bound by contracts
    echo "Starting bounded ETA live stream..."
    run_bounded_eta "eta_stream" bash -c "$STREAM_CMD"
    EXIT_CODE=$?

    exit $EXIT_CODE
fi
