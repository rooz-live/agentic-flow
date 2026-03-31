#!/bin/bash
# roam-staleness-watchdog.sh - Background daemon analyzing ROAM_TRACKER.yaml for stalled nodes
# Monitors ROAM nodes and escalates if stagnant >96 hours

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ROAM_FILE="$PROJECT_ROOT/ROAM_TRACKER.yaml"
LOG_FILE="$PROJECT_ROOT/.goalie/roam-watchdog.log"
PID_FILE="$PROJECT_ROOT/.goalie/roam-watchdog.pid"
STALENESS_THRESHOLD=96  # hours

# Exit codes
readonly EXIT_SUCCESS=0
readonly EXIT_INVALID_ARGS=10
readonly EXIT_ROAM_NOT_FOUND=11
readonly EXIT_STALENESS_DETECTED=100
readonly EXIT_DAEMON_RUNNING=1

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

log() {
    local level="$1"
    local msg="$2"
    local timestamp=$(date -Iseconds)
    echo "[$timestamp] [$level] $msg" >> "$LOG_FILE"
    echo "[$level] $msg"
}

# Check if daemon is already running
check_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            log "INFO" "Watchdog already running (PID: $pid)"
            return 0
        fi
    fi
    return 1
}

# Parse ROAM_TRACKER.yaml and check staleness
parse_roam_staleness() {
    if [ ! -f "$ROAM_FILE" ]; then
        log "ERROR" "ROAM_TRACKER.yaml not found at $ROAM_FILE"
        return $EXIT_ROAM_NOT_FOUND
    fi
    
    local last_updated=$(grep "last_updated:" "$ROAM_FILE" | head -1 | cut -d: -f2- | xargs)
    if [ -z "$last_updated" ]; then
        log "WARNING" "No last_updated timestamp found in ROAM_TRACKER.yaml"
        return 0
    fi
    
    # Convert to epoch seconds
    local last_epoch=$(date -d "$last_updated" +%s 2>/dev/null || date +%s)
    local current_epoch=$(date +%s)
    local hours_diff=$(( (current_epoch - last_epoch) / 3600 ))
    
    log "INFO" "ROAM last updated: $last_updated ($hours_diff hours ago)"
    
    if [ $hours_diff -gt $STALENESS_THRESHOLD ]; then
        log "ESCALATION" "ROAM staleness detected: $hours_diff hours (threshold: $STALENESS_THRESHOLD)"
        
        # Create escalation entry
        local escalation_file="$PROJECT_ROOT/.goalie/roam-escalation-$(date +%Y%m%d-%H%M%S).json"
        cat > "$escalation_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "type": "ROAM_STALENESS",
  "hours_stale": $hours_diff,
  "threshold_hours": $STALENESS_THRESHOLD,
  "roam_file": "$ROAM_FILE",
  "last_updated": "$last_updated",
  "action_required": "Refresh ROAM_TRACKER.yaml",
  "wsjf_escalation": true
}
EOF
        
        echo -e "${RED}🚨 ROAM STALENESS ESCALATION${NC}"
        echo -e "${YELLOW}   Staleness: $hours_diff hours (threshold: $STALENESS_THRESHOLD)${NC}"
        echo -e "${YELLOW}   Escalation written to: $escalation_file${NC}"
        
        return $EXIT_STALENESS_DETECTED
    fi
    
    echo -e "${GREEN}✅ ROAM fresh: $hours_diff hours (threshold: $STALENESS_THRESHOLD)${NC}"
    return $EXIT_SUCCESS
}

# Daemon mode - continuous monitoring
daemon_mode() {
    if check_running; then
        exit $EXIT_DAEMON_RUNNING
    fi
    
    # Write PID file
    echo $$ > "$PID_FILE"
    
    log "INFO" "ROAM Staleness Watchdog started (PID: $$)"
    log "INFO" "Monitoring: $ROAM_FILE"
    log "INFO" "Threshold: ${STALENESS_THRESHOLD} hours"
    log "INFO" "Log: $LOG_FILE"
    
    # Trap signals for clean shutdown
    trap 'log "INFO" "Watchdog shutting down..."; rm -f "$PID_FILE"; exit 0' SIGTERM SIGINT
    
    # Check interval: every hour
    while true; do
        parse_roam_staleness || {
            log "WARNING" "Staleness check failed, will retry next cycle"
        }
        sleep 3600  # 1 hour
    done
}

# One-shot check mode
oneshot_mode() {
    log "INFO" "ROAM Staleness Check (one-shot)"
    parse_roam_staleness
    exit $?
}

# Show help
show_help() {
    cat << 'EOF'
ROAM Staleness Watchdog Daemon

Usage: ./scripts/roam-staleness-watchdog.sh [OPTIONS]

Options:
    --daemon          Run as background daemon (continuous monitoring)
    --oneshot         Run single check and exit (default)
    --threshold HOURS Set staleness threshold (default: 96)
    --status          Show current daemon status
    --stop            Stop running daemon
    --help            Show this help

Exit Codes:
    0   - Success / ROAM fresh
    1   - Daemon already running
    10  - Invalid arguments
    11  - ROAM file not found
    100 - Staleness detected (escalation)

Examples:
    # One-time check
    ./scripts/roam-staleness-watchdog.sh --oneshot

    # Start daemon
    ./scripts/roam-staleness-watchdog.sh --daemon

    # Check with custom threshold
    ./scripts/roam-staleness-watchdog.sh --threshold 72 --oneshot

    # Stop daemon
    ./scripts/roam-staleness-watchdog.sh --stop
EOF
}

# Main
main() {
    mkdir -p "$PROJECT_ROOT/.goalie"
    
    local mode="oneshot"
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --daemon)
                mode="daemon"
                shift
                ;;
            --oneshot)
                mode="oneshot"
                shift
                ;;
            --threshold)
                STALENESS_THRESHOLD="$2"
                shift 2
                ;;
            --status)
                if check_running; then
                    echo "Watchdog: RUNNING (PID: $(cat "$PID_FILE"))"
                    exit 0
                else
                    echo "Watchdog: NOT RUNNING"
                    exit 1
                fi
                ;;
            --stop)
                if [ -f "$PID_FILE" ]; then
                    local pid=$(cat "$PID_FILE")
                    kill "$pid" 2>/dev/null && echo "Watchdog stopped (PID: $pid)"
                    rm -f "$PID_FILE"
                else
                    echo "Watchdog not running"
                fi
                exit 0
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                show_help
                exit $EXIT_INVALID_ARGS
                ;;
        esac
    done
    
    if [ "$mode" == "daemon" ]; then
        daemon_mode
    else
        oneshot_mode
    fi
}

main "$@"
