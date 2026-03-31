#!/usr/bin/env bash

#############################################
# Warp Health Monitor with Notification Pattern
# Monitors memory usage and tab count thresholds
#############################################

# === CONFIGURATION ===
readonly MEMORY_WARNING_GB=50
readonly MEMORY_CRITICAL_GB=100
readonly TAB_WARNING_COUNT=10
readonly TAB_CRITICAL_COUNT=20
readonly CHECK_INTERVAL=300  # 5 minutes
readonly LOG_FILE="$HOME/.warp_health_monitor.log"
readonly STATE_FILE="$HOME/.warp_health_state"

# Notification protocols
readonly NOTIFY_SYSTEM=true     # macOS notification center
readonly NOTIFY_LOG=true        # File logging
readonly NOTIFY_STDOUT=true     # Terminal output
readonly NOTIFY_SOUND=true      # Alert sound

# === NOTIFICATION METHOD PATTERN ===
notify() {
    local severity="$1"  # INFO, WARNING, CRITICAL
    local message="$2"
    local context="$3"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Protocol: Log first (always)
    if [[ "$NOTIFY_LOG" == true ]]; then
        echo "[$timestamp] [$severity] $message | Context: $context" >> "$LOG_FILE"
    fi
    
    # Protocol: Terminal output (immediate feedback)
    if [[ "$NOTIFY_STDOUT" == true ]]; then
        case "$severity" in
            CRITICAL)
                echo -e "\033[1;31m🚨 CRITICAL: $message\033[0m"
                ;;
            WARNING)
                echo -e "\033[1;33m⚠️  WARNING: $message\033[0m"
                ;;
            INFO)
                echo -e "\033[1;32m✓ INFO: $message\033[0m"
                ;;
        esac
    fi
    
    # Protocol: System notification (persistent)
    if [[ "$NOTIFY_SYSTEM" == true ]] && [[ "$severity" != "INFO" ]]; then
        osascript -e "display notification \"$message\" with title \"Warp Health Monitor\" subtitle \"$severity\""
    fi
    
    # Protocol: Sound alert (attention)
    if [[ "$NOTIFY_SOUND" == true ]] && [[ "$severity" == "CRITICAL" ]]; then
        afplay /System/Library/Sounds/Sosumi.aiff 2>/dev/null &
    fi
    
    # Protocol: State tracking (for deduplication)
    echo "$severity|$message|$timestamp" >> "$STATE_FILE"
}

# === CONTEXT FACTORS ===
get_warp_context() {
    local warp_pid=$(ps aux | grep -i "Warp.app/Contents/MacOS/stable$" | grep -v grep | grep -v terminal-server | awk '{print $2}' | head -n 1)
    
    if [[ -z "$warp_pid" ]]; then
        echo "pid=none,memory=0,tabs=0,runtime=0"
        return 1
    fi
    
    # Factor 1: Memory usage
    local mem_info=$(ps -p "$warp_pid" -o rss= 2>/dev/null)
    local mem_gb=$((mem_info / 1024 / 1024))
    
    # Factor 2: Runtime duration
    local runtime=$(ps -p "$warp_pid" -o etime= 2>/dev/null | tr -d ' ')
    
    # Factor 3: Tab/pane count (estimate from file descriptors)
    local fd_count=$(lsof -p "$warp_pid" 2>/dev/null | wc -l)
    local estimated_tabs=$((fd_count / 30))  # Heuristic: ~30 FDs per tab
    
    # Factor 4: CPU usage
    local cpu=$(ps -p "$warp_pid" -o %cpu= 2>/dev/null | tr -d ' ')
    
    # Factor 5: Thread count
    local threads=$(ps -M -p "$warp_pid" 2>/dev/null | wc -l)
    
    echo "pid=$warp_pid,memory=${mem_gb}GB,tabs=$estimated_tabs,runtime=$runtime,cpu=$cpu%,threads=$threads"
}

# === HEALTH CHECK PATTERN ===
check_memory_threshold() {
    local mem_gb="$1"
    local context="$2"
    
    if (( mem_gb >= MEMORY_CRITICAL_GB )); then
        notify "CRITICAL" "Warp memory usage: ${mem_gb}GB (threshold: ${MEMORY_CRITICAL_GB}GB)" "$context"
        return 2
    elif (( mem_gb >= MEMORY_WARNING_GB )); then
        notify "WARNING" "Warp memory approaching limit: ${mem_gb}GB (threshold: ${MEMORY_WARNING_GB}GB)" "$context"
        return 1
    fi
    return 0
}

check_tab_threshold() {
    local tab_count="$1"
    local context="$2"
    
    if (( tab_count >= TAB_CRITICAL_COUNT )); then
        notify "CRITICAL" "Tab count critical: $tab_count tabs (threshold: $TAB_CRITICAL_COUNT)" "$context"
        return 2
    elif (( tab_count >= TAB_WARNING_COUNT )); then
        notify "WARNING" "Tab count high: $tab_count tabs (threshold: $TAB_WARNING_COUNT)" "$context"
        return 1
    fi
    return 0
}

# === DEDUPLICATION PATTERN ===
should_notify() {
    local severity="$1"
    local message="$2"
    local cooldown=600  # 10 minutes for same alert
    
    if [[ ! -f "$STATE_FILE" ]]; then
        return 0
    fi
    
    # Check if similar alert sent recently
    local last_alert=$(grep "$severity|$message" "$STATE_FILE" | tail -n 1)
    if [[ -n "$last_alert" ]]; then
        local last_time=$(echo "$last_alert" | cut -d'|' -f3)
        local last_epoch=$(date -j -f "%Y-%m-%d %H:%M:%S" "$last_time" +%s 2>/dev/null || echo 0)
        local now_epoch=$(date +%s)
        local diff=$((now_epoch - last_epoch))
        
        if (( diff < cooldown )); then
            return 1  # Skip notification (too recent)
        fi
    fi
    
    return 0
}

# === MAIN MONITORING LOOP ===
monitor_once() {
    local context=$(get_warp_context)
    
    if [[ "$context" == "pid=none"* ]]; then
        notify "INFO" "Warp not running" "monitoring_paused"
        return 0
    fi
    
    # Extract context factors
    local mem_gb=$(echo "$context" | grep -o 'memory=[0-9]*GB' | grep -o '[0-9]*')
    local tabs=$(echo "$context" | grep -o 'tabs=[0-9]*' | grep -o '[0-9]*')
    
    # Health checks
    local status=0
    check_memory_threshold "$mem_gb" "$context" || status=$?
    check_tab_threshold "$tabs" "$context" || ((status+=$?))
    
    # Aggregate health status
    if (( status >= 4 )); then
        notify "CRITICAL" "Multiple critical thresholds exceeded!" "$context"
    elif (( status > 0 )); then
        notify "INFO" "Health check completed with warnings" "$context"
    fi
}

# === CONTINUOUS MONITORING MODE ===
monitor_continuous() {
    notify "INFO" "Warp health monitoring started" "interval=${CHECK_INTERVAL}s"
    
    while true; do
        monitor_once
        sleep "$CHECK_INTERVAL"
    done
}

# === USAGE ===
usage() {
    cat << EOF
Warp Health Monitor - Memory & Tab Threshold Notification System

Usage:
    $0 [OPTIONS]

Options:
    -o, --once          Run single health check (default)
    -c, --continuous    Run continuous monitoring (every ${CHECK_INTERVAL}s)
    -s, --status        Show current Warp status
    -l, --logs          Show recent log entries
    -h, --help          Show this help

Examples:
    $0 --once           # Single check
    $0 --continuous     # Background monitoring
    $0 --status         # Current metrics
EOF
}

# === COMMAND PARSING ===
main() {
    case "${1:-once}" in
        -o|--once|once)
            monitor_once
            ;;
        -c|--continuous|continuous)
            monitor_continuous
            ;;
        -s|--status|status)
            context=$(get_warp_context)
            echo "Current Warp Status:"
            echo "$context" | tr ',' '\n' | sed 's/^/  /'
            ;;
        -l|--logs|logs)
            if [[ -f "$LOG_FILE" ]]; then
                tail -n 20 "$LOG_FILE"
            else
                echo "No logs found at $LOG_FILE"
            fi
            ;;
        -h|--help|help)
            usage
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
}

# Initialize
mkdir -p "$(dirname "$LOG_FILE")"
touch "$STATE_FILE"

main "$@"
