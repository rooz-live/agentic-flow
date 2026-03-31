#!/usr/bin/env bash
# Kill stale git and sudo processes
# Part of GIT-PROCESS-SPRAWL-001 action
# Circuit breaker: max 10 git processes system-wide

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="${PROJECT_ROOT}/logs/cleanup/git_process_cleanup.log"
METRICS_LOG="${PROJECT_ROOT}/.goalie/metrics_log.jsonl"

# Configuration
MAX_GIT_PROCESSES=10
MAX_GIT_UPTIME_HOURS=2
MAX_SUDO_UPTIME_MINUTES=30

mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] $*" | tee -a "$LOG_FILE"
}

count_git_processes() {
    ps aux | grep -E 'git|jj' | grep -v grep | wc -l | tr -d ' '
}

get_process_uptime_seconds() {
    local pid=$1
    ps -p "$pid" -o etime= | awk '{
        split($1, a, ":"); 
        if (length(a)==3) print a[1]*3600 + a[2]*60 + a[3]; 
        else if (length(a)==2) print a[1]*60 + a[2];
        else print a[1]
    }' 2>/dev/null || echo 0
}

kill_stale_git_processes() {
    local killed=0
    local max_uptime=$((MAX_GIT_UPTIME_HOURS * 3600))
    
    # Find git status processes older than threshold
    while IFS= read -r line; do
        local pid=$(echo "$line" | awk '{print $2}')
        local uptime=$(get_process_uptime_seconds "$pid")
        
        if [[ $uptime -gt $max_uptime ]]; then
            log "Killing stale git process: PID=$pid, uptime=${uptime}s (threshold=${max_uptime}s)"
            kill "$pid" 2>/dev/null && ((killed++)) || log "Failed to kill PID=$pid"
        fi
    done < <(ps aux | grep -E 'git (status|diff)' | grep -v grep)
    
    echo "$killed"
}

kill_orphaned_sudo_processes() {
    local killed=0
    local max_uptime=$((MAX_SUDO_UPTIME_MINUTES * 60))
    
    # Find sudo sh -c processes stuck on /etc/hosts
    while IFS= read -r line; do
        local pid=$(echo "$line" | awk '{print $2}')
        local uptime=$(get_process_uptime_seconds "$pid")
        
        if [[ $uptime -gt $max_uptime ]]; then
            log "Killing orphaned sudo process: PID=$pid, uptime=${uptime}s (threshold=${max_uptime}s)"
            sudo kill "$pid" 2>/dev/null && ((killed++)) || log "Failed to kill sudo PID=$pid"
        fi
    done < <(ps aux | grep 'sudo sh -c' | grep -E '/etc/hosts|echo' | grep -v grep)
    
    echo "$killed"
}

circuit_breaker_check() {
    local current_count=$1
    
    if [[ $current_count -gt $MAX_GIT_PROCESSES ]]; then
        log "⚠️  CIRCUIT BREAKER TRIGGERED: $current_count git processes (max: $MAX_GIT_PROCESSES)"
        
        # Kill newest git processes first (assume most are idle)
        local to_kill=$((current_count - MAX_GIT_PROCESSES))
        log "Killing $to_kill newest git processes to restore threshold"
        
        ps aux | grep -E 'git|jj' | grep -v grep | sort -k9 -r | head -n "$to_kill" | awk '{print $2}' | while read -r pid; do
            log "Circuit breaker kill: PID=$pid"
            kill "$pid" 2>/dev/null || log "Failed to kill PID=$pid"
        done
        
        return 1
    fi
    return 0
}

# Main execution
log "=== Git Process Cleanup - START ==="

git_count_before=$(count_git_processes)
log "Git process count (before): $git_count_before"

# Check circuit breaker
circuit_breaker_triggered=false
if ! circuit_breaker_check "$git_count_before"; then
    circuit_breaker_triggered=true
fi

# Kill stale processes
git_killed=$(kill_stale_git_processes)
sudo_killed=$(kill_orphaned_sudo_processes)

git_count_after=$(count_git_processes)
log "Git process count (after): $git_count_after"
log "Processes killed: git=$git_killed, sudo=$sudo_killed"

# Log metrics
cat >> "$METRICS_LOG" << EOF
{"timestamp":"$(date -u +"%Y-%m-%dT%H:%M:%SZ")","pattern":"git_process_sprawl","git_process_count_before":$git_count_before,"git_process_count_after":$git_count_after,"git_killed":$git_killed,"sudo_killed":$sudo_killed,"circuit_breaker_triggered":$circuit_breaker_triggered,"action_id":"GIT-PROCESS-SPRAWL-001"}
EOF

log "=== Git Process Cleanup - END ==="

# Exit with status based on final count
if [[ $git_count_after -le $MAX_GIT_PROCESSES ]]; then
    exit 0
else
    log "❌ Failed to reduce git process count below threshold"
    exit 1
fi
