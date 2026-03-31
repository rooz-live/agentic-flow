#!/usr/bin/env bash
# mcp-health-check.sh - Check MCP server availability
set -euo pipefail

TIMEOUT="${MCP_TIMEOUT:-3}"
AGENTDB_AVAILABLE=0
CLAUDE_FLOW_AVAILABLE=0

# Check AgentDB
if timeout "$TIMEOUT" npx agentdb --version &>/dev/null; then
    AGENTDB_AVAILABLE=1
    echo "✅ AgentDB MCP available"
else
    echo "⚠️  AgentDB MCP unreachable - using fallback"
fi

# Check Claude Flow
if timeout "$TIMEOUT" npx claude-flow --version &>/dev/null; then
    CLAUDE_FLOW_AVAILABLE=1
    echo "✅ Claude Flow available"
else
    echo "⚠️  Claude Flow unreachable - using fallback"
fi

# Export status
export AGENTDB_AVAILABLE
export CLAUDE_FLOW_AVAILABLE

# Exit code: 0 if at least one is available, 1 if both are down
if [ "$AGENTDB_AVAILABLE" -eq 1 ] || [ "$CLAUDE_FLOW_AVAILABLE" -eq 1 ]; then
    exit 0
else
    exit 1
fi
