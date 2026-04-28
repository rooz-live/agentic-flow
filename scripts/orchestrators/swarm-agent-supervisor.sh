#!/bin/bash
# Swarm Agent Supervisor v1.0
# Purpose: Keep swarm agents alive with PID tracking and task assignment
# Exit Code: 0=success, 220=daemon crashed, 240=memory exhausted

set -euo pipefail

# launchd/non-interactive shells often miss Homebrew paths.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

# Source robust exit codes
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
EXIT_CODES_PATH="${EXIT_CODES_REGISTRY:-$PROJECT_ROOT/_SYSTEM/_AUTOMATION/exit-codes-robust.sh}"

if [ -f "$EXIT_CODES_PATH" ]; then
    # shellcheck disable=SC1090
    source "$EXIT_CODES_PATH"
else
    # Fallback exit codes
    EXIT_SUCCESS=0
    EXIT_INVALID_ARGS=10
    EXIT_DAEMON_CRASHED=220
    EXIT_MEMORY_EXHAUSTED=240
fi

# Normalize names used by this script against robust registry exports.
: "${EXIT_SUCCESS:=${EX_SUCCESS:-0}}"
: "${EXIT_INVALID_ARGS:=${EX_USAGE:-10}}"
: "${EXIT_DAEMON_CRASHED:=${EX_DAEMON_CRASHED:-220}}"
: "${EXIT_MEMORY_EXHAUSTED:=${EX_MEMORY_EXHAUSTED:-240}}"

# Configuration
SWARM_NAME="${1:-phase1-core-infra}"
MAX_AGENTS="${2:-8}"
ADR_PHASE="${3:-1}"  # ADR-022: Track phase for swarm persistence
if ! [[ "$MAX_AGENTS" =~ ^[0-9]+$ ]] || [[ "$MAX_AGENTS" -lt 1 ]]; then
    echo "Invalid MAX_AGENTS: $MAX_AGENTS (must be positive integer)" >&2
    exit "$EXIT_INVALID_ARGS"
fi
STATE_DIR="$HOME/.claude-flow/swarm-state"
AGENT_PIDS_FILE="$STATE_DIR/${SWARM_NAME}-pids.txt"
LOG_DIR="$HOME/Library/Logs"
LOG_FILE="$LOG_DIR/swarm-supervisor-${SWARM_NAME}.log"
DGM_CANDIDATE_DIR="${DGM_CANDIDATE_DIR:-$STATE_DIR/dgm-candidates}"
DGM_APPROVED_DIR="${DGM_APPROVED_DIR:-$STATE_DIR/dgm-approved}"
DGM_REJECTED_DIR="${DGM_REJECTED_DIR:-$STATE_DIR/dgm-rejected}"
DGM_MAX_CYCLES="${DGM_MAX_CYCLES:-3}"
DGM_CYCLE_COUNT=0

# Create state directory
mkdir -p "$STATE_DIR"
mkdir -p "$LOG_DIR"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Check memory and disk usage (Resource Monitoring)
check_resources() {
    local memory_percent
    memory_percent="$(ps aux | awk '{sum+=$4} END {printf "%.2f", sum}')"
    if awk "BEGIN {exit !($memory_percent > 90.0)}"; then
        log "⚠️  WARNING: Memory usage at ${memory_percent}% (threshold: 90%)"
        return $EXIT_MEMORY_EXHAUSTED
    fi

    local disk_percent=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_percent" -gt 85 ]; then
        log "⚠️  WARNING: Disk usage at ${disk_percent}% (threshold: 85%)"
        # Could implement auto-cleanup here. For now, log warning.
    fi

    return 0
}

# One-line snapshot for logs after each supervisor iteration (avail + use% + mount).
log_disk_availability() {
    local line
    line=$(df -h "${HOME:-.}" 2>/dev/null | awk 'NR==2 {print $4" avail, "$3" used, "$5" cap on "$NF}')
    if [[ -z "$line" ]]; then
        line=$(df -h / 2>/dev/null | awk 'NR==2 {print $4" avail, "$3" used, "$5" cap on "$NF}')
    fi
    log "💾 Disk: ${line}"
}

run_dgm_cycle_tick() {
    [[ "${DGM_GATE_ENABLED:-0}" == "1" ]] || return 0
    [[ "$DGM_CYCLE_COUNT" -lt "$DGM_MAX_CYCLES" ]] || return 0

    mkdir -p "$DGM_CANDIDATE_DIR" "$DGM_APPROVED_DIR" "$DGM_REJECTED_DIR"
    local candidates=("$DGM_CANDIDATE_DIR"/*.json)
    [[ -e "${candidates[0]}" ]] || return 0

    log "🧠 DGM cycle tick $((DGM_CYCLE_COUNT + 1))/$DGM_MAX_CYCLES"
    for candidate in "${candidates[@]}"; do
        local decision_file="${candidate}.decision.json"
        if cargo run -p dgm-prototype --bin dgm-gate -- \
            --candidate-json "$candidate" \
            --allowlist "${DGM_ALLOWLIST:-scripts/validators/,_SYSTEM/_AUTOMATION/validate-email.sh}" \
            --tests-passed "${DGM_TESTS_PASSED:-0}" \
            --shellcheck-passed "${DGM_SHELLCHECK_PASSED:-0}" \
            --contract-verify-passed "${DGM_CONTRACT_VERIFY_PASSED:-0}" \
            --rollback-ready "${DGM_ROLLBACK_READY:-0}" > "$decision_file" 2>>"$LOG_FILE"; then
            mv "$candidate" "$DGM_APPROVED_DIR/" 2>/dev/null || true
            log "✅ DGM approved candidate: $(basename "$candidate")"
        else
            mv "$candidate" "$DGM_REJECTED_DIR/" 2>/dev/null || true
            log "⛔ DGM rejected candidate: $(basename "$candidate")"
        fi
    done
    DGM_CYCLE_COUNT=$((DGM_CYCLE_COUNT + 1))
}

# Agent Registration File
AGENT_REGISTRY_FILE="$STATE_DIR/${SWARM_NAME}-registry.txt"

# Default fallback agents if registry doesn't exist
if [ ! -f "$AGENT_REGISTRY_FILE" ]; then
    cat > "$AGENT_REGISTRY_FILE" << EOF
hierarchical-coordinator:legal-coordinator
researcher:legal-researcher
coder:document-generator
tester:validator
reviewer:legal-reviewer
EOF
fi

# Load active agent types
load_agent_types() {
    AGENT_TYPES=()
    if [ -f "$AGENT_REGISTRY_FILE" ]; then
        while IFS= read -r line || [ -n "$line" ]; do
            # Skip empty lines and comments
            [[ -z "$line" || "$line" =~ ^# ]] && continue
            AGENT_TYPES+=("$line")
        done < "$AGENT_REGISTRY_FILE"
    fi
}

# Spawn agent with PID tracking
spawn_agent() {
    local agent_type="$1"
    local agent_name="$2"

    log "Spawning agent: $agent_name (type: $agent_type)"

    # Use persistent wrapper that processes task queue (fixes Exit 220 churn)
    local wrapper_script="$PROJECT_ROOT/scripts/orchestrators/persistent-agent-wrapper.sh"
    local work_queue="$HOME/.claude-flow/task-queue"
    
    if [ ! -f "$wrapper_script" ]; then
        log "❌ Persistent wrapper not found: $wrapper_script"
        return 1
    fi
    
    # Spawn persistent agent with task queue
    "$wrapper_script" "$agent_type" "$agent_name" "$work_queue" >> "$LOG_DIR/agent-${agent_name}.log" 2>&1 &

    local agent_pid=$!

    # Store PID
    echo "${agent_name}:${agent_pid}" >> "$AGENT_PIDS_FILE"

    log "✅ Agent $agent_name spawned with PID: $agent_pid (task queue: $work_queue)"

    return 0
}

# Check if agent is still alive
is_agent_alive() {
    local agent_pid="$1"
    if kill -0 "$agent_pid" 2>/dev/null; then
        return 0  # Alive
    else
        return 1  # Dead
    fi
}

# Respawn dead agents
respawn_dead_agents() {
    log "Checking agent health..."

    if [ ! -f "$AGENT_PIDS_FILE" ]; then
        log "No PID file found - spawning initial agents"
        return 1
    fi

    local respawn_count=0
    local -a alive_pids=()
    local -a dead_agents=()

    while IFS=: read -r agent_name agent_pid; do
        if [ -n "$agent_name" ] && [ -n "$agent_pid" ]; then
            if ! is_agent_alive "$agent_pid"; then
                log "❌ Agent $agent_name (PID $agent_pid) is DEAD - preparing to respawn"
                dead_agents+=("$agent_name")
            else
                log "✅ Agent $agent_name (PID $agent_pid) is ALIVE"
                alive_pids+=("${agent_name}:${agent_pid}")
            fi
        fi
    done < "$AGENT_PIDS_FILE"

    # Rewrite PID file with only alive agents
    > "$AGENT_PIDS_FILE"
    for alive_pid in "${alive_pids[@]:-}"; do
        echo "$alive_pid" >> "$AGENT_PIDS_FILE"
    done

    load_agent_types
    # First: Respawn dead agents that were already tracked
    for dead_name in "${dead_agents[@]:-}"; do
        # Find agent type from original spawn
        for agent_def in "${AGENT_TYPES[@]}"; do
            IFS=: read -r agent_type expected_name _rest <<< "$agent_def"
            if [ "$expected_name" == "$dead_name" ]; then
                spawn_agent "$agent_type" "$dead_name"
                ((respawn_count++))
                break
            fi
        done
    done

    # Second: Launch any newly registered agents that don't even exist in the PIDS file
    for agent_def in "${AGENT_TYPES[@]}"; do
        IFS=: read -r agent_type expected_name _rest <<< "$agent_def"
        # If this expected agent is completely missing from alive_pids AND dead_agents, spawn it
        local is_tracked=false
        for alive in "${alive_pids[@]:-}"; do
            if [[ "$alive" == "$expected_name:"* ]]; then
                is_tracked=true
                break
            fi
        done
        for dead in "${dead_agents[@]:-}"; do
            if [[ "$dead" == "$expected_name" ]]; then
                is_tracked=true
                break
            fi
        done

        if [ "$is_tracked" = false ]; then
            log "💡 New agent registered: $expected_name - spawning"
            spawn_agent "$agent_type" "$expected_name"
            ((respawn_count++))
        fi
    done

    if [ "$respawn_count" -gt 0 ]; then
        log "Respawned $respawn_count agents"
    fi

    return 0
}

# Main supervisor loop
main() {
    if ! command -v npx >/dev/null 2>&1; then
      log "❌ npx not found in PATH; supervisor cannot spawn agents"
      return $EXIT_DAEMON_CRASHED
    fi

    log "========================================="
    log "Swarm Agent Supervisor Started"
    log "Swarm: $SWARM_NAME"
    log "Max Agents: $MAX_AGENTS"
    log "State Dir: $STATE_DIR"
    log "========================================="

    # Initial agent spawn
    log "Spawning initial agents ($MAX_AGENTS)..."
    rm -f "$AGENT_PIDS_FILE"  # Clear old PIDs

    load_agent_types
    local spawn_count=0
    for agent_def in "${AGENT_TYPES[@]}"; do
        if [ "$spawn_count" -ge "$MAX_AGENTS" ]; then
            break
        fi

        IFS=: read -r agent_type agent_name <<< "$agent_def"
        spawn_agent "$agent_type" "$agent_name"
        ((spawn_count++))

        sleep 2  # Stagger spawns to avoid overwhelming system
    done

    log "Initial spawn complete: $spawn_count agents"

    # Supervisor loop
    log "Entering supervisor loop (press Ctrl+C to stop)"

    while true; do
        sleep 30  # Check every 30 seconds

        # Check resources (memory/disk)
        if ! check_resources; then
            log "⚠️  Memory exhausted - pausing agent spawns"
            sleep 60  # Wait for memory to free up
            continue
        fi

        # Respawn dead agents
        respawn_dead_agents
        run_dgm_cycle_tick

        # Get current agent count
        local active_count=$(wc -l < "$AGENT_PIDS_FILE" 2>/dev/null || echo "0")
        log "Active agents: $active_count/$MAX_AGENTS"
        log_disk_availability
    done
}

# Cleanup on exit
cleanup() {
    log "Supervisor stopping - killing all agents"

    if [ -f "$AGENT_PIDS_FILE" ]; then
        while IFS=: read -r agent_name agent_pid; do
            if kill -0 "$agent_pid" 2>/dev/null; then
                log "Killing agent $agent_name (PID $agent_pid)"
                kill "$agent_pid" 2>/dev/null || true
            fi
        done < "$AGENT_PIDS_FILE"
    fi

    rm -f "$AGENT_PIDS_FILE"
    log "Cleanup complete"
    exit $EXIT_SUCCESS
}

trap cleanup SIGINT SIGTERM

# Run main loop
main || exit $EXIT_DAEMON_CRASHED

exit $EXIT_SUCCESS
