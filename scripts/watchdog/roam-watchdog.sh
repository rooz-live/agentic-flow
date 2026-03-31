#!/usr/bin/env bash
# scripts/watchdog/roam-watchdog.sh
# Background daemon to continuously monitor ROAM_TRACKER.yaml staleness
# Threshold: > 96 hours triggers macOS notification
# Part of Phase 16: Guardrail Emplacement

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TRACKER_FILE="$REPO_ROOT/ROAM_TRACKER.yaml"
EXIT_CODES_REGISTRY="${EXIT_CODES_REGISTRY:-$REPO_ROOT/scripts/validation-core.sh}"
# shellcheck disable=SC1090
source "$EXIT_CODES_REGISTRY" 2>/dev/null || true
EXIT_SUCCESS="${EXIT_SUCCESS:-0}"
EXIT_INVALID_FORMAT="${EXIT_INVALID_FORMAT:-12}"
EXIT_STALE="${EXIT_STALE:-152}"

THRESHOLD_HOURS=96
SLEEP_INTERVAL=$((4 * 3600)) # Poll every 4 hours

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

check_tracker_staleness() {
    if [ ! -f "$TRACKER_FILE" ]; then
        log "WARNING: $TRACKER_FILE not found."
        return "$EXIT_INVALID_FORMAT"
    fi

    # Read last updated using grep and cut
    local last_updated
    last_updated=$(grep -m 1 "^last_updated:" "$TRACKER_FILE" | cut -d: -f2- | xargs || echo "")
    if [ -z "$last_updated" ]; then
        log "WARNING: last_updated field not found in ROAM_TRACKER.yaml"
        return "$EXIT_INVALID_FORMAT"
    fi

    # Handle multiple date formats safely for macOS date command
    local last_epoch
    last_epoch=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$last_updated" +%s 2>/dev/null || \
                 date -j -f "%Y-%m-%d %H:%M:%S" "$last_updated" +%s 2>/dev/null || \
                 date -d "$last_updated" +%s 2>/dev/null || echo "0")

    if [ "${last_epoch:-0}" -le 0 ]; then
        log "WARNING: Could not parse timestamp '$last_updated'"
        return "$EXIT_INVALID_FORMAT"
    fi

    local current_epoch diff_hours
    current_epoch=$(date +%s)
    diff_hours=$(( (current_epoch - last_epoch) / 3600 ))

    if [ "$diff_hours" -gt "$THRESHOLD_HOURS" ]; then
        local msg="ROAM Tracker is STALE! Last updated $diff_hours hours ago (> $THRESHOLD_HOURS hrs limit)."
        log "ALERT: $msg"
        osascript -e "display notification \"$msg\" with title \"ROAM Staleness Alert\" sound name \"Basso\"" || true
        return "$EXIT_STALE"
    fi

    log "ROAM is fresh ($diff_hours hours old). Threshold: $THRESHOLD_HOURS hrs"
    return "$EXIT_SUCCESS"
}

# Auto-daemonize instructions (optional)
if [[ "${1:-}" == "--install" ]]; then
    AGENT_PLIST="$HOME/Library/LaunchAgents/com.bhopti.roam.watchdog.plist"
    log "Installing launch agent to $AGENT_PLIST..."
    cat > "$AGENT_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.bhopti.roam.watchdog</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$SCRIPT_DIR/roam-watchdog.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardErrorPath</key>
    <string>$HOME/Library/Logs/roam.watchdog.err</string>
    <key>StandardOutPath</key>
    <string>$HOME/Library/Logs/roam.watchdog.out</string>
</dict>
</plist>
EOF
    launchctl load "$AGENT_PLIST" 2>/dev/null || true
    log "Installed and started watchdog daemon!"
    exit 0
fi

log "Starting ROAM Staleness Watchdog Daemon (Threshold: $THRESHOLD_HOURS hrs)"

while true; do
    check_tracker_staleness
    check_rc=$?

    if [[ "${1:-}" == "--run-once" ]]; then
        log "Run once completed. Exiting with code $check_rc."
        exit "$check_rc"
    fi

    sleep "$SLEEP_INTERVAL"
done
