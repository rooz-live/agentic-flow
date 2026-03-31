#!/bin/bash
# MCP Tool: Resource Monitor
# Monitor disk usage and memory thresholds with alerts

set -euo pipefail

# MCP Tool Metadata
MCP_TOOL_NAME="resource-monitor"
MCP_TOOL_DESCRIPTION="Monitor system resources with threshold alerts"
MCP_TOOL_VERSION="1.0.0"

# Thresholds
DISK_WARNING_THRESHOLD=85
DISK_CRITICAL_THRESHOLD=95
MEMORY_WARNING_THRESHOLD=500  # MB
MEMORY_CRITICAL_THRESHOLD=100 # MB

# Logging
LOG_FILE="$HOME/Library/Logs/mcp-resource-monitor.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

check_disk_usage() {
    local usage=$(df -h . | tail -1 | awk '{print $5}' | sed 's/%//')
    local status="✅ OK"
    local level="INFO"
    
    if [[ $usage -ge $DISK_CRITICAL_THRESHOLD ]]; then
        status="🔴 CRITICAL"
        level="CRITICAL"
    elif [[ $usage -ge $DISK_WARNING_THRESHOLD ]]; then
        status="⚠️ WARNING"
        level="WARNING"
    fi
    
    log "[$level] Disk usage: ${usage}% $status"
    echo "DISK_USAGE=${usage}"
    echo "DISK_STATUS=${status}"
    
    if [[ $usage -ge $DISK_CRITICAL_THRESHOLD ]]; then
        log "🧹 RECOMMENDATION: Run cleanup script immediately"
        echo "DISK_ACTION=cleanup_required"
    fi
}

check_memory_usage() {
    local memory_free=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
    local memory_mb=$(( memory_free * 4096 / 1024 / 1024 ))
    local status="✅ OK"
    local level="INFO"
    
    if [[ $memory_mb -le $MEMORY_CRITICAL_THRESHOLD ]]; then
        status="🔴 CRITICAL"
        level="CRITICAL"
    elif [[ $memory_mb -le $MEMORY_WARNING_THRESHOLD ]]; then
        status="⚠️ WARNING"
        level="WARNING"
    fi
    
    log "[$level] Memory free: ${memory_mb}MB $status"
    echo "MEMORY_FREE=${memory_mb}"
    echo "MEMORY_STATUS=${status}"
    
    if [[ $memory_mb -le $MEMORY_CRITICAL_THRESHOLD ]]; then
        log "💾 RECOMMENDATION: Restart memory-intensive processes"
        echo "MEMORY_ACTION=restart_processes"
    fi
}

# Main execution
main() {
    log "🚀 MCP Resource Monitor starting..."
    
    echo "=== RESOURCE MONITORING REPORT ==="
    echo "Timestamp: $(date)"
    echo ""
    
    check_disk_usage
    echo ""
    check_memory_usage
    echo ""
    
    log "✅ Resource monitoring completed via MCP"
}

# MCP Tool Interface
case "${1:-}" in
    --name)
        echo "$MCP_TOOL_NAME"
        ;;
    --description)
        echo "$MCP_TOOL_DESCRIPTION"
        ;;
    --version)
        echo "$MCP_TOOL_VERSION"
        ;;
    --execute|"")
        main
        ;;
    --help)
        cat << EOF
MCP Tool: Resource Monitor

DESCRIPTION:
  Monitor system resources with threshold alerts.
  
THRESHOLDS:
  Disk Warning:    ${DISK_WARNING_THRESHOLD}%
  Disk Critical:   ${DISK_CRITICAL_THRESHOLD}%
  Memory Warning:  ${MEMORY_WARNING_THRESHOLD}MB
  Memory Critical: ${MEMORY_CRITICAL_THRESHOLD}MB

USAGE:
  $0 [--execute]     Execute resource monitoring
  $0 --name          Show tool name
  $0 --description   Show tool description
  $0 --version       Show tool version
  $0 --help          Show this help

LOGS:
  $LOG_FILE

EXAMPLES:
  # Execute via MCP server
  ruflo mcp exec resource-monitor
  
  # Direct execution
  $0 --execute
EOF
        ;;
    *)
        echo "Unknown option: $1" >&2
        echo "Use --help for usage information" >&2
        exit 1
        ;;
esac
