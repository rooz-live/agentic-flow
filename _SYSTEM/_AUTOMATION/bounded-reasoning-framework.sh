#!/bin/bash
# bounded-reasoning-framework.sh
# System-wide bounded reasoning and ETA prediction framework
# Provides % completion and # steps remaining for any process

set -euo pipefail

_PROJECT_ROOT="$(cd "$(dirname "$(dirname "${BASH_SOURCE[0]}")")" && pwd)"
[ -f "$_PROJECT_ROOT/scripts/validation-core.sh" ] && source "$_PROJECT_ROOT/scripts/validation-core.sh" || true

# Framework configuration
FRAMEWORK_VERSION="1.0"
STATE_DIR="/tmp/brf-state"
METRICS_DIR="/tmp/brf-metrics"
CONTRACTS_DIR="/tmp/brf-contracts"

# Create directories
mkdir -p "$STATE_DIR" "$METRICS_DIR" "$CONTRACTS_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# =============================================================================
# Bounded Reasoning Contract Definition
# =============================================================================

# Create a bounded contract for a process
create_contract() {
    local process_id="$1"
    local name="$2"
    local max_steps="${3:-100}"
    local max_duration="${4:-300}"
    local dependencies="${5:-}"

    local contract_file="$CONTRACTS_DIR/${process_id}.json"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Format dependencies as json array elements
    local deps_json=""
    if [[ -n "$dependencies" && "$dependencies" != "none" ]]; then
        deps_json=\"$(echo "$dependencies" | sed 's/,/","/g')\"
    fi

    cat > "$contract_file" << EOF
{
  "process_id": "$process_id",
  "name": "$name",
  "created_at": "$timestamp",
  "max_steps": $max_steps,
  "current_step": 0,
  "max_duration_seconds": $max_duration,
  "dependencies": [$deps_json],
  "state": "INIT",
  "progress_pct": 0.0,
  "eta_seconds": $max_duration,
  "steps_completed": [],
  "steps_remaining": $max_steps,
  "start_time": null,
  "last_update": "$timestamp"
}
EOF

    echo "Contract created: $contract_file"
}

# =============================================================================
# Progress Tracking System
# =============================================================================

# Update progress for a process
update_progress() {
    local process_id="$1"
    local step_name="$2"
    local step_weight="${3:-1}"
    local current_state="${4:-RUNNING}"

    local contract_file="$CONTRACTS_DIR/${process_id}.json"

    if [[ ! -f "$contract_file" ]]; then
        echo "No contract found for process: $process_id"
        return 1
    fi

    # Read current state
    local current_step=$(jq -r '.current_step' "$contract_file")
    local max_steps=$(jq -r '.max_steps' "$contract_file")
    local start_time=$(jq -r '.start_time // empty' "$contract_file")

    # Update step count
    current_step=$((current_step + step_weight))

    # Calculate progress
    local progress_pct=$(echo "scale=2; $current_step / $max_steps * 100" | bc -l)

    # Calculate ETA
    local now=$(date +%s)
    local eta_seconds=0

    if [[ -n "$start_time" && "$start_time" != "null" ]]; then
        local elapsed=$((now - start_time))
        if [[ $progress_pct > 0 ]]; then
            eta_seconds=$(echo "scale=0; $elapsed / $progress_pct * (100 - $progress_pct)" | bc -l)
        fi
    fi

    # Update contract
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    jq --arg step "$step_name" \
       --arg state "$current_state" \
       --arg timestamp "$timestamp" \
       --argjson current_step "$current_step" \
       --argjson progress_pct "$progress_pct" \
       --argjson eta_seconds "$eta_seconds" \
       --argjson steps_remaining $((max_steps - current_step)) \
       '.current_step = $current_step |
        .progress_pct = $progress_pct |
        .eta_seconds = $eta_seconds |
        .state = $state |
        .steps_remaining = $steps_remaining |
        .last_update = $timestamp |
        .steps_completed += [$step]' \
       "$contract_file" > "${contract_file}.tmp" && \
    mv "${contract_file}.tmp" "$contract_file"

    # Emit metrics
    emit_metrics "$process_id"
}

# Mark process as started
start_process() {
    local process_id="$1"
    local contract_file="$CONTRACTS_DIR/${process_id}.json"

    if [[ ! -f "$contract_file" ]]; then
        echo "No contract found for process: $process_id"
        return 1
    fi

    local start_time=$(date +%s)
    jq --argjson start_time "$start_time" \
       '.start_time = $start_time | .state = "RUNNING"' \
       "$contract_file" > "${contract_file}.tmp" && \
    mv "${contract_file}.tmp" "$contract_file"

    update_progress "$process_id" "STARTED" 0 "RUNNING"
}

# Mark process as complete
complete_process() {
    local process_id="$1"
    local success="${2:-true}"

    local state="COMPLETED"
    [[ "$success" != "true" ]] && state="FAILED"

    update_progress "$process_id" "COMPLETED" 0 "$state"
}

# =============================================================================
# Metrics and Reporting
# =============================================================================

# Emit metrics for monitoring
emit_metrics() {
    local process_id="$1"
    local contract_file="$CONTRACTS_DIR/${process_id}.json"
    local metrics_file="$METRICS_DIR/${process_id}.metrics"

    if [[ ! -f "$contract_file" ]]; then
        return 1
    fi

    # Extract metrics
    local progress_pct=$(jq -r '.progress_pct' "$contract_file")
    local eta_seconds=$(jq -r '.eta_seconds' "$contract_file")
    local steps_remaining=$(jq -r '.steps_remaining' "$contract_file")
    local state=$(jq -r '.state' "$contract_file")
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Write metrics
    cat > "$metrics_file" << EOF
process_id=$process_id progress=$progress_pct eta_seconds=$eta_seconds steps_remaining=$steps_remaining state=$state timestamp=$timestamp
EOF

    # Dashboard-friendly JSON for polling (when BRF_REPORTS_DIR is set)
    if [[ -n "${BRF_REPORTS_DIR:-}" ]] && [[ -d "$BRF_REPORTS_DIR" ]]; then
        mkdir -p "$BRF_REPORTS_DIR"
        local name=$(jq -r '.name' "$contract_file" 2>/dev/null || echo "$process_id")
        cat > "$BRF_REPORTS_DIR/eta-progress.json" << EOF
{"process_id":"$process_id","name":"$name","progress_pct":$progress_pct,"eta_seconds":$eta_seconds,"state":"$state","timestamp":"$timestamp"}
EOF
    fi

    # Also emit to system metrics (if available)
    if command -v prometheus-textfile >/dev/null 2>&1; then
        cat >> "/var/lib/node_exporter/textfile_collector/brf.prom" << EOF
# HELP brf_process_progress Progress percentage for bounded process
# TYPE brf_process_progress gauge
brf_process_progress{process_id="$process_id"} $progress_pct

# HELP brf_process_eta Estimated time remaining for bounded process
# TYPE brf_process_eta gauge
brf_process_eta{process_id="$process_id"} $eta_seconds

# HELP brf_process_steps_remaining Number of steps remaining
# TYPE brf_process_steps_remaining gauge
brf_process_steps_remaining{process_id="$process_id"} $steps_remaining
EOF
    fi
}

# Get current status of all processes
get_all_status() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo -e "${BLUE}BOUNDED REASONING FRAMEWORK STATUS${NC}"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""

    printf "%-20s %-10s %-10s %-10s %-10s %-15s\n" "PROCESS" "PROGRESS" "ETA" "STEPS" "STATE" "LAST UPDATE"
    echo "─────────────────────────────────────────────────────────────────"

    for contract in "$CONTRACTS_DIR"/*.json; do
        if [[ -f "$contract" ]]; then
            local process_id=$(jq -r '.process_id' "$contract" 2>/dev/null || echo "error")
            local progress=$(jq -r '.progress_pct' "$contract" 2>/dev/null || echo "error")
            local eta=$(jq -r '.eta_seconds' "$contract" 2>/dev/null || echo "error")
            local steps=$(jq -r '.steps_remaining' "$contract" 2>/dev/null || echo "error")
            local state=$(jq -r '.state' "$contract" 2>/dev/null || echo "error")
            local last_update=$(jq -r '.last_update' "$contract" 2>/dev/null || echo "error" | cut -dT -f1 | cut -d. -f1)

            # Color coding
            local color=$NC
            case $state in
                "RUNNING") color=$BLUE ;;
                "COMPLETED") color=$GREEN ;;
                "FAILED") color=$RED ;;
                "INIT") color=$YELLOW ;;
            esac

            # Format ETA
            if [[ "$eta" != "null" && "$eta" -gt 0 ]]; then
                if [[ $eta -lt 60 ]]; then
                    eta="${eta}s"
                elif [[ $eta -lt 3600 ]]; then
                    eta="$((eta / 60))m"
                else
                    eta="$((eta / 3600))h"
                fi
            else
                eta="N/A"
            fi

            printf "%-20s ${color}%-10.1f%%${NC} %-10s %-10s ${color}%-15s${NC} %s\n" \
                "$process_id" "$progress" "$eta" "$steps" "$state" "$last_update"
        fi
    done

    echo ""
}

# =============================================================================
# Integration Helpers
# =============================================================================

# Wrap any command with bounded reasoning
run_bounded() {
    local process_id="$1"
    local name="$2"
    local max_steps="$3"
    local max_duration="$4"
    shift 4

    # Create contract
    create_contract "$process_id" "$name" "$max_steps" "$max_duration"

    # Start process
    start_process "$process_id"

    # Run with timeout and progress tracking
    local exit_code=0
    local step_interval=$((max_duration / max_steps))

    # Run command in background with timeout
    timeout "$max_duration" "$@" &
    local cmd_pid=$!

    # Monitor progress
    local step=0
    while kill -0 $cmd_pid 2>/dev/null; do
        step=$((step + 1))
        if [[ $step -le $max_steps ]]; then
            update_progress "$process_id" "step_$step" 1 "RUNNING"
        fi
        sleep "$step_interval"
    done

    # Check result
    wait $cmd_pid || exit_code=$?

    # Complete
    if [[ $exit_code -eq 0 ]]; then
        complete_process "$process_id" true
    else
        complete_process "$process_id" false
    fi

    return $exit_code
}

# =============================================================================
# Main CLI Interface
# =============================================================================

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    case "${1:-help}" in
        "create")
            create_contract "$2" "$3" "${4:-100}" "${5:-300}" "${6:-}"
            ;;
        "start")
            start_process "$2"
            ;;
        "update")
            update_progress "$2" "$3" "${4:-1}" "${5:-RUNNING}"
            ;;
        "complete")
            complete_process "$2" "${3:-true}"
            ;;
        "status")
            get_all_status
            ;;
        "run")
            run_bounded "$2" "$3" "$4" "$5" "${@:6}"
            ;;
        "help"|*)
            echo "Bounded Reasoning Framework v$FRAMEWORK_VERSION"
            echo ""
            echo "Usage: $0 <command> [args...]"
            echo ""
            echo "Commands:"
            echo "  create <id> <name> [max_steps] [max_duration] [deps]  Create contract"
            echo "  start <id>                                           Mark as started"
            echo "  update <id> <step> [weight] [state]                  Update progress"
            echo "  complete <id> [success]                              Mark as complete"
            echo "  status                                               Show all status"
            echo "  run <id> <name> <steps> <duration> <command>         Run with bounds"
            echo ""
            echo "Examples:"
            echo "  $0 create tunnel1 'Start tunnel' 10 60"
            echo "  $0 start tunnel1"
            echo "  $0 update tunnel1 'checking_port' 1"
            echo "  $0 complete tunnel1"
            echo "  $0 run email1 'Send email' 5 120 ./send-email.sh"
            ;;
    esac
fi
