#!/bin/bash
# monitor-daemon.sh - Background daemon for continuous inbox monitoring
# Runs check-maa-inbox.sh every N minutes with process management

# CRITICAL FIX (QE Review): Remove -e to prevent immediate exit on error
set -uo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHECK_SCRIPT="${SCRIPT_DIR}/check-maa-inbox.sh"
PID_FILE="${SCRIPT_DIR}/../logs/monitor-daemon.pid"
LOG_FILE="${SCRIPT_DIR}/../logs/monitor-daemon.log"
ERROR_LOG="${SCRIPT_DIR}/../logs/errors.log"
CHECK_INTERVAL="${CHECK_INTERVAL:-300}"  # 5 minutes default
MAX_RESTART_ATTEMPTS="${MAX_RESTART_ATTEMPTS:-5}"
RESTART_DELAY="${RESTART_DELAY:-60}"

# Ensure directories exist
mkdir -p "$(dirname "${PID_FILE}")"
mkdir -p "$(dirname "${LOG_FILE}")"
mkdir -p "$(dirname "${ERROR_LOG}")"

# Function: Log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_FILE}"
}

# CRITICAL FIX (QE Review): Add error logging function
log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" | tee -a "${ERROR_LOG}" "${LOG_FILE}"
}

# CRITICAL FIX (QE Review): Add error trap handler for crash recovery
trap 'handle_error $? $LINENO' ERR

handle_error() {
    local exit_code=$1
    local line_number=$2
    log_error "Daemon encountered error (exit code: ${exit_code}, line: ${line_number})"
    log_error "Attempting auto-restart in ${RESTART_DELAY} seconds..."
    sleep "${RESTART_DELAY}"

    # Check restart attempts
    local restart_count_file="${SCRIPT_DIR}/../logs/restart_count.txt"
    local restart_count=0
    if [[ -f "${restart_count_file}" ]]; then
        restart_count=$(cat "${restart_count_file}")
    fi

    if [[ ${restart_count} -lt ${MAX_RESTART_ATTEMPTS} ]]; then
        restart_count=$((restart_count + 1))
        echo "${restart_count}" > "${restart_count_file}"
        log "Auto-restart attempt ${restart_count}/${MAX_RESTART_ATTEMPTS}"
        start_daemon
    else
        log_error "Max restart attempts (${MAX_RESTART_ATTEMPTS}) reached. Manual intervention required."
        echo "0" > "${restart_count_file}"
        exit 1
    fi
}

# CRITICAL FIX (QE Review): Add health check function
health_check() {
    if is_running; then
        local pid=$(cat "${PID_FILE}")
        if ! ps -p "${pid}" > /dev/null 2>&1; then
            log_error "PID file exists but process ${pid} not running (zombie process)"
            rm -f "${PID_FILE}"
            return 1
        fi

        # Check if process is responsive (last check time)
        local last_check_file="${SCRIPT_DIR}/../logs/last_check.txt"
        if [[ -f "${last_check_file}" ]]; then
            local last_check=$(cat "${last_check_file}")
            local now=$(date +%s)
            local last_check_epoch=$(date -j -f "%Y-%m-%d %H:%M:%S" "${last_check}" +%s 2>/dev/null || echo 0)
            local elapsed=$((now - last_check_epoch))

            # Alert if no check in 2x interval (potential hang)
            if [[ ${elapsed} -gt $((CHECK_INTERVAL * 2)) ]]; then
                log_error "Daemon appears hung (no check in ${elapsed}s, expected <$((CHECK_INTERVAL * 2))s)"
                return 1
            fi
        fi

        return 0
    else
        return 1
    fi
}

# Function: Check if daemon is running
is_running() {
    if [[ -f "${PID_FILE}" ]]; then
        local pid=$(cat "${PID_FILE}")
        if ps -p "${pid}" > /dev/null 2>&1; then
            return 0
        else
            # Stale PID file
            rm -f "${PID_FILE}"
            return 1
        fi
    fi
    return 1
}

# Function: Start daemon
start_daemon() {
    if is_running; then
        local pid=$(cat "${PID_FILE}")
        log "ERROR: Daemon already running (PID: ${pid})"
        return 1
    fi
    
    log "Starting inbox monitor daemon (interval: ${CHECK_INTERVAL}s)"
    
    # Start background process
    nohup bash -c "
        while true; do
            echo \"[$(date '+%Y-%m-%d %H:%M:%S')] Running inbox check...\" >> '${LOG_FILE}'
            '${CHECK_SCRIPT}' >> '${LOG_FILE}' 2>&1
            sleep ${CHECK_INTERVAL}
        done
    " > /dev/null 2>&1 &
    
    local pid=$!
    echo "${pid}" > "${PID_FILE}"
    
    log "Daemon started (PID: ${pid})"
    log "Logs: ${LOG_FILE}"
    log "Next check in ${CHECK_INTERVAL} seconds"
}

# Function: Stop daemon
stop_daemon() {
    if ! is_running; then
        log "Daemon not running"
        return 0
    fi
    
    local pid=$(cat "${PID_FILE}")
    log "Stopping daemon (PID: ${pid})"
    
    kill "${pid}" 2>/dev/null || true
    rm -f "${PID_FILE}"
    
    log "Daemon stopped"
}

# Function: Restart daemon
restart_daemon() {
    log "Restarting daemon..."
    stop_daemon
    sleep 2
    start_daemon
}

# Function: Show daemon status
show_status() {
    if is_running; then
        local pid=$(cat "${PID_FILE}")
        local uptime=$(ps -p "${pid}" -o etime= | tr -d ' ')
        log "Daemon running (PID: ${pid}, uptime: ${uptime})"
        
        # Show last check time
        if [[ -f "${SCRIPT_DIR}/../logs/last_check.txt" ]]; then
            local last_check=$(cat "${SCRIPT_DIR}/../logs/last_check.txt")
            log "Last check: ${last_check}"
        fi
        
        # Show recent log entries
        log "Recent activity:"
        tail -5 "${LOG_FILE}" | sed 's/^/  /'
    else
        log "Daemon not running"
    fi
}

# Function: Show usage
usage() {
    cat <<EOF
Usage: $0 {start|stop|restart|status}

Commands:
  start    - Start the inbox monitor daemon
  stop     - Stop the daemon
  restart  - Restart the daemon
  status   - Show daemon status and recent activity

Environment Variables:
  CHECK_INTERVAL  - Polling interval in seconds (default: 300)
  CASE_NUMBER     - Case number to monitor (default: 26CV005596-590)

Examples:
  # Start with default 5-minute interval
  $0 start
  
  # Start with 2-minute interval
  CHECK_INTERVAL=120 $0 start
  
  # Check status
  $0 status
EOF
}

# Main execution
main() {
    local command="${1:-}"
    
    case "${command}" in
        start)
            start_daemon
            ;;
        stop)
            stop_daemon
            ;;
        restart)
            restart_daemon
            ;;
        status)
            show_status
            ;;
        *)
            usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"

