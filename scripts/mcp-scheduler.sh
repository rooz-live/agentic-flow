#!/bin/bash
# MCP-based Automated Monitoring Scheduler
# Bypasses macOS LaunchAgent/cron restrictions through MCP server execution

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuration
ROAM_INTERVAL=3600    # 1 hour
RESOURCE_INTERVAL=600 # 10 minutes  
SWARM_INTERVAL=1800   # 30 minutes

# Logging
LOG_FILE="$HOME/Library/Logs/mcp-scheduler.log"
PID_FILE="/tmp/mcp-scheduler.pid"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Check if scheduler is already running
check_running() {
    if [[ -f "$PID_FILE" ]]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            log "MCP Scheduler already running (PID: $pid)"
            exit 1
        else
            log "Removing stale PID file"
            rm -f "$PID_FILE"
        fi
    fi
}

# Execute MCP tool with error handling
execute_mcp_tool() {
    local tool_name="$1"
    local tool_script="$2"
    
    log "Executing $tool_name..."
    
    if bash "$PROJECT_ROOT/scripts/mcp-tools/$tool_script" --execute; then
        log "✅ $tool_name completed successfully"
        return 0
    else
        log "❌ $tool_name failed"
        return 1
    fi
}

# Main scheduler loop
scheduler_loop() {
    local last_roam=0
    local last_resource=0
    local last_swarm=0
    
    log "🚀 MCP Scheduler starting..."
    echo $$ > "$PID_FILE"
    
    while true; do
        local current_time=$(date +%s)
        
        # ROAM watchdog (every hour)
        if (( current_time - last_roam >= ROAM_INTERVAL )); then
            execute_mcp_tool "ROAM Watchdog" "roam-watchdog-tool.sh"
            last_roam=$current_time
        fi
        
        # Resource monitor (every 10 minutes)
        if (( current_time - last_resource >= RESOURCE_INTERVAL )); then
            execute_mcp_tool "Resource Monitor" "resource-monitor-tool.sh"
            last_resource=$current_time
        fi
        
        # Swarm supervisor (every 30 minutes)
        if (( current_time - last_swarm >= SWARM_INTERVAL )); then
            execute_mcp_tool "Swarm Supervisor" "swarm-supervisor-tool.sh"
            last_swarm=$current_time
        fi
        
        # Sleep for 1 minute before next check
        sleep 60
    done
}

# Signal handlers
cleanup() {
    log "🛑 MCP Scheduler stopping..."
    rm -f "$PID_FILE"
    exit 0
}

trap cleanup SIGTERM SIGINT

# Command interface
case "${1:-start}" in
    start)
        check_running
        scheduler_loop
        ;;
    stop)
        if [[ -f "$PID_FILE" ]]; then
            pid=$(cat "$PID_FILE")
            if ps -p "$pid" > /dev/null 2>&1; then
                log "Stopping MCP Scheduler (PID: $pid)"
                kill "$pid"
                rm -f "$PID_FILE"
                echo "✅ MCP Scheduler stopped"
            else
                echo "❌ MCP Scheduler not running"
                rm -f "$PID_FILE"
            fi
        else
            echo "❌ MCP Scheduler not running"
        fi
        ;;
    status)
        if [[ -f "$PID_FILE" ]]; then
            pid=$(cat "$PID_FILE")
            if ps -p "$pid" > /dev/null 2>&1; then
                echo "✅ MCP Scheduler running (PID: $pid)"
                echo "Log: $LOG_FILE"
            else
                echo "❌ MCP Scheduler not running (stale PID file)"
                rm -f "$PID_FILE"
            fi
        else
            echo "❌ MCP Scheduler not running"
        fi
        ;;
    --help)
        cat << EOF
MCP Automated Monitoring Scheduler

DESCRIPTION:
  Automated monitoring scheduler using MCP tools to bypass macOS restrictions.
  
SCHEDULE:
  ROAM Watchdog:    Every ${ROAM_INTERVAL}s (1 hour)
  Resource Monitor: Every ${RESOURCE_INTERVAL}s (10 minutes)
  Swarm Supervisor: Every ${SWARM_INTERVAL}s (30 minutes)

USAGE:
  $0 [start|stop|status|--help]

EXAMPLES:
  $0 start     # Start scheduler daemon
  $0 stop      # Stop scheduler daemon
  $0 status    # Check scheduler status

LOGS:
  $LOG_FILE
EOF
        ;;
    *)
        echo "Unknown command: $1" >&2
        echo "Use --help for usage information" >&2
        exit 1
        ;;
esac
