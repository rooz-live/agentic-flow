#!/bin/bash
# MCP Tool: ROAM Staleness Watchdog
# Bypasses macOS LaunchAgent/cron restrictions through MCP server execution

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# MCP Tool Metadata
MCP_TOOL_NAME="roam-staleness-watchdog"
MCP_TOOL_DESCRIPTION="Monitor ROAM tracker staleness for legal compliance"
MCP_TOOL_VERSION="1.0.0"

# Logging
LOG_FILE="$HOME/Library/Logs/mcp-roam-watchdog.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Main execution
main() {
    log "🚀 MCP ROAM Watchdog starting..."
    
    # Change to project root for proper execution context
    cd "$PROJECT_ROOT"
    
    # Execute the actual ROAM staleness watchdog
    if bash scripts/validators/roam-staleness-watchdog.sh; then
        log "✅ ROAM staleness check completed successfully via MCP"
        return 0
    else
        log "❌ ROAM staleness check failed via MCP"
        return 1
    fi
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
MCP Tool: ROAM Staleness Watchdog

DESCRIPTION:
  Monitor ROAM tracker staleness for legal compliance.
  Bypasses macOS LaunchAgent/cron restrictions through MCP server execution.

USAGE:
  $0 [--execute]     Execute ROAM staleness check
  $0 --name          Show tool name
  $0 --description   Show tool description
  $0 --version       Show tool version
  $0 --help          Show this help

LOGS:
  $LOG_FILE

EXAMPLES:
  # Execute via MCP server
  ruflo mcp exec roam-staleness-watchdog
  
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
