#!/bin/bash
# delegate-agent-spawn.sh — Universal Agent Spawn Wrapper with Registry Update
# Purpose: Wrap agent spawning with state registry tracking for persistence
# Usage: delegate-agent-spawn.sh -t <type> --name <name>
# Exit Codes: 0=success, 220=spawn failed, 221=registry update failed

set -euo pipefail

# Source exit codes
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXIT_CODES_PATH="${SCRIPT_DIR}/../validation-core.sh"

if [[ -f "$EXIT_CODES_PATH" ]]; then
    # shellcheck source=../validation-core.sh
    source "$EXIT_CODES_PATH"
else
    readonly EXIT_SUCCESS=0
    readonly EXIT_SPAWN_FAILED=220
    readonly EXIT_REGISTRY_FAILED=221
fi

SWARM_NAME="${SWARM_NAME:-legal-coordination-swarm}"
STATE_DIR="$HOME/.claude-flow/swarm-state"
AGENT_REGISTRY_FILE="$STATE_DIR/${SWARM_NAME}-registry.txt"
LOG_DIR="$HOME/Library/Logs"
LOG_FILE="$LOG_DIR/delegate-agent-spawn.log"

mkdir -p "$STATE_DIR" "$LOG_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

agent_type=""
agent_name=""

while [[ $# -gt 0 ]]; do
  case $1 in
    -t|--type)
      agent_type="$2"
      shift 2
      ;;
    --name)
      agent_name="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

if [[ -z "$agent_type" ]] || [[ -z "$agent_name" ]]; then
    log "❌ Usage: delegate-agent-spawn.sh -t <type> --name <name>"
    exit $EXIT_SPAWN_FAILED
fi

# Spawn agent via npx
# CSQBM Governance Constraint: Prevent hallucinatory agent spawns outside of Truth Matrix
local_proj_root="$(cd "$SCRIPT_DIR/../.." && pwd)"
[ -f "$local_proj_root/scripts/validation-core.sh" ] && source "$local_proj_root/scripts/validation-core.sh" || true

log "🚀 Spawning agent: $agent_name (type: $agent_type)"
if ! npx @claude-flow/cli@latest agent spawn -t "$agent_type" --name "$agent_name" --mode semi-auto 2>&1; then
    log "❌ Agent spawn failed: $agent_name"
    exit $EXIT_SPAWN_FAILED
fi

# Get PID after brief delay
sleep 2
AGENT_PID=$(pgrep -f "$agent_name" | head -1 || echo "pending")

# Update registry
touch "$AGENT_REGISTRY_FILE"
if ! grep -q "^${agent_type}:${agent_name}" "$AGENT_REGISTRY_FILE"; then
    echo "${agent_type}:${agent_name}:${AGENT_PID}:$(date '+%Y-%m-%dT%H:%M:%S')" >> "$AGENT_REGISTRY_FILE"
    log "✅ Registered agent $agent_name ($agent_type, PID: $AGENT_PID)"
else
    log "ℹ️ Agent $agent_name already registered"
fi

exit $EXIT_SUCCESS
