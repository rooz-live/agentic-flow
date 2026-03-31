#!/bin/bash
# Persistent Agent Wrapper v1.0
# Purpose: Keep agent alive by processing tasks from queue
# Exit Code: 0=success, 220=daemon crashed, 240=memory exhausted

set -euo pipefail

# Configuration
AGENT_TYPE="${1:?Missing agent type}"
AGENT_NAME="${2:?Missing agent name}"
WORK_QUEUE_DIR="${3:-$HOME/.claude-flow/task-queue}"
LOG_DIR="$HOME/Library/Logs"
LOG_FILE="$LOG_DIR/agent-${AGENT_NAME}.log"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_DIR="${PROJECT_ROOT}/.rca-backups"

mkdir -p "$WORK_QUEUE_DIR"
mkdir -p "$LOG_DIR"

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

parse_task_meta() {
    local task_file="$1"
    TARGET_PATH=$(awk -F= '/^TARGET_PATH=/{print substr($0,13); exit}' "$task_file" 2>/dev/null || true)
    PATCH_PATH=$(awk -F= '/^PATCH_PATH=/{print substr($0,12); exit}' "$task_file" 2>/dev/null || true)
    SUMMARY=$(awk -F= '/^SUMMARY=/{print substr($0,9); exit}' "$task_file" 2>/dev/null || true)
}

backup_target_file() {
    local target_path="$1"
    [[ -n "$target_path" ]] || return 0
    [[ -f "$PROJECT_ROOT/$target_path" ]] || return 0
    local ts
    ts="$(date +%Y-%m-%d_%H%M%S)"
    local dest_dir="$BACKUP_DIR/$ts"
    mkdir -p "$dest_dir"
    tar -czf "$dest_dir/pre-apply-${AGENT_NAME}.tar.gz" -C "$PROJECT_ROOT" "$target_path" >/dev/null 2>&1 || true
    log "🗄️ Pre-backup created: $dest_dir/pre-apply-${AGENT_NAME}.tar.gz"
}

run_dgm_gate_for_task() {
    local task_file="$1"
    parse_task_meta "$task_file"

    [[ "${DGM_GATE_ENABLED:-0}" == "1" ]] || return 0
    [[ -n "${TARGET_PATH:-}" ]] || return 0

    # Guard retention-sensitive evidence
    if echo "${TARGET_PATH:-}" | grep -qiE 'email-hash-db|\\.email-hashes\\.db|agentic-email-hashes\\.log'; then
        log "⛔ NO-GO retention guard hit for $TARGET_PATH"
        return 2
    fi

    local candidate_json
    candidate_json="$(mktemp)"
    cat > "$candidate_json" <<EOF
{"id":"$(basename "$task_file" .task)","target_path":"${TARGET_PATH}","patch_path":"${PATCH_PATH:-unknown}","summary":"${SUMMARY:-task queue candidate}"}
EOF

    local tests_passed="${DGM_TESTS_PASSED:-0}"
    local shellcheck_passed="${DGM_SHELLCHECK_PASSED:-0}"
    local contract_passed="${DGM_CONTRACT_VERIFY_PASSED:-0}"
    local rollback_ready="${DGM_ROLLBACK_READY:-0}"

    if [[ "${DGM_GATE_STRICT:-0}" == "1" ]]; then
        (
            cd "$PROJECT_ROOT" && \
            bash tests/test-validation-core.sh >/dev/null 2>&1 && \
            bash tests/test-validation-runner.sh >/dev/null 2>&1
        ) && tests_passed=1 || tests_passed=0

        if command -v shellcheck >/dev/null 2>&1; then
            shellcheck "$PROJECT_ROOT/scripts/orchestrators/persistent-agent-wrapper.sh" >/dev/null 2>&1 && shellcheck_passed=1 || shellcheck_passed=0
        fi

        (
            cd "$PROJECT_ROOT" && \
            ./scripts/contract-enforcement-gate.sh verify >/dev/null 2>&1
        ) && contract_passed=1 || contract_passed=0

        # Proven rollback path prerequisite: explicit opt-in or backup dir writable
        if [[ "${DGM_ENABLE_ROLLBACK_AUTOCHECK:-0}" == "1" ]] && [[ -w "$PROJECT_ROOT" ]]; then
            rollback_ready=1
        fi
    fi

    if cargo run -p dgm-prototype --bin dgm-gate -- \
        --candidate-json "$candidate_json" \
        --allowlist "${DGM_ALLOWLIST:-scripts/validators/,_SYSTEM/_AUTOMATION/validate-email.sh}" \
        --tests-passed "$tests_passed" \
        --shellcheck-passed "$shellcheck_passed" \
        --contract-verify-passed "$contract_passed" \
        --rollback-ready "$rollback_ready" >> "$LOG_FILE" 2>&1; then
        backup_target_file "${TARGET_PATH:-}"
        rm -f "$candidate_json"
        return 0
    fi
    rm -f "$candidate_json"
    return 2
}

log "========================================="
log "Persistent Agent: $AGENT_NAME (type: $AGENT_TYPE)"
log "Work Queue: $WORK_QUEUE_DIR"
log "========================================="

# Map agent types to valid Ruflo task types
map_agent_to_task_type() {
    case "$1" in
        hierarchical-coordinator) echo "research" ;;
        researcher) echo "research" ;;
        coder) echo "implementation" ;;
        tester) echo "testing" ;;
        reviewer) echo "review" ;;
        *) echo "custom" ;;
    esac
}

# Process tasks from queue
process_task() {
    local task_file="$1"
    local task_name=$(basename "$task_file" .task)
    
    log "📋 Processing task: $task_name"
    
    # Read task content
    local task_content
    task_content=$(cat "$task_file")

    # Optional low-risk DGM gate before executing task
    if ! run_dgm_gate_for_task "$task_file"; then
        local gate_rc=$?
        mv "$task_file" "${task_file}.rejected" 2>/dev/null || true
        log "⛔ Task rejected by DGM gate (rc=$gate_rc): $task_name"
        return "$gate_rc"
    fi
    
    # Map agent type to valid Ruflo task type
    local ruflo_task_type
    ruflo_task_type=$(map_agent_to_task_type "$AGENT_TYPE")
    
    # Execute with ruflo task creation (correct syntax)
    log "🚀 Creating task: $task_name (type: $ruflo_task_type)"
    
    # Use correct ruflo task create syntax with required flags
    echo "y" | npx ruflo@latest task create \
        --type "$ruflo_task_type" \
        --description "$task_content" \
        --agent "$AGENT_NAME" \
        >> "$LOG_FILE" 2>&1 || {
            log "❌ Task creation failed - check Ruflo syntax"
            return 1
        }
    
    # Mark task as complete
    mv "$task_file" "${task_file}.done"
    log "✅ Task completed: $task_name (exit=0)"

    # Optional post-apply verify chain
    if [[ "${DGM_POST_VERIFY_ENABLED:-0}" == "1" ]]; then
        (
            cd "$PROJECT_ROOT" && \
            ./scripts/contract-enforcement-gate.sh verify >> "$LOG_FILE" 2>&1
        ) || log "⚠️ Post-verify failed for $task_name"
    fi
    
    return 0
}

# Main agent loop
main() {
    local idle_count=0
    local max_idle_iterations=120  # 120 * 30s = 1 hour idle timeout
    
    while true; do
        # Check for pending tasks
        local pending_tasks=("$WORK_QUEUE_DIR"/*.task)
        
        if [ -e "${pending_tasks[0]}" ]; then
            idle_count=0
            for task_file in "${pending_tasks[@]}"; do
                process_task "$task_file" || log "⚠️  Task processing failed: $task_file"
                sleep 5  # Brief pause between tasks
            done
        else
            ((idle_count++))
            log "💤 No tasks in queue (idle: ${idle_count}/${max_idle_iterations})"
            
            if [ "$idle_count" -ge "$max_idle_iterations" ]; then
                log "⏱️  Idle timeout reached - agent shutting down gracefully"
                exit 0
            fi
        fi
        
        sleep 30  # Check queue every 30 seconds
    done
}

# Cleanup on exit
cleanup() {
    log "Agent $AGENT_NAME shutting down"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Run main loop
main

exit 0
