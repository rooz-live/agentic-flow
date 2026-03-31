#!/bin/bash
# MCP Tool: Swarm Supervisor
# Bypasses macOS LaunchAgent/cron restrictions through MCP server execution

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# MCP Tool Metadata
MCP_TOOL_NAME="swarm-supervisor"
MCP_TOOL_DESCRIPTION="Monitor and maintain swarm agent health"
MCP_TOOL_VERSION="1.0.0"

# Configuration
SWARM_NAME="${2:-legal-coordination-swarm}"
MAX_AGENTS="${3:-1}"

# Logging
LOG_FILE="$HOME/Library/Logs/mcp-swarm-supervisor.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Main execution
main() {
    log "🚀 MCP Swarm Supervisor starting for $SWARM_NAME..."
    
    # Change to project root for proper execution context
    cd "$PROJECT_ROOT"
    
    # Check if swarm supervisor script exists
    if [[ ! -f "scripts/orchestrators/swarm-agent-supervisor.sh" ]]; then
        log "❌ Swarm supervisor script not found"
        return 1
    fi
    
    # Execute the swarm supervisor
    if bash scripts/orchestrators/swarm-agent-supervisor.sh "$SWARM_NAME" "$MAX_AGENTS"; then
        log "✅ Swarm supervision completed successfully via MCP"
        return 0
    else
        log "❌ Swarm supervision failed via MCP"
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
MCP Tool: Swarm Supervisor

DESCRIPTION:
  Monitor and maintain swarm agent health.
  Bypasses macOS LaunchAgent/cron restrictions through MCP server execution.

USAGE:
  $0 [--execute] [SWARM_NAME] [MAX_AGENTS]
  $0 --name          Show tool name
  $0 --description   Show tool description
  $0 --version       Show tool version
  $0 --help          Show this help

PARAMETERS:
  SWARM_NAME         Name of swarm to supervise (default: legal-coordination-swarm)
  MAX_AGENTS         Maximum number of agents (default: 1)

LOGS:
  $LOG_FILE

EXAMPLES:
  # Execute via MCP server
  ruflo mcp exec swarm-supervisor
  
  # Direct execution with parameters
  $0 --execute legal-coordination-swarm 2
EOF
        ;;
    *)
        echo "Unknown option: $1" >&2
        echo "Use --help for usage information" >&2
        exit 1
        ;;
esac
