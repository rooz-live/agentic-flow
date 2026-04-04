#!/bin/bash
# _SYSTEM/_AUTOMATION/bootstrap_session.sh
# Idempotency wrapper for executing initial workspace hydration conditionally.
# Mitigates repetitive massive operations (e.g., npx agentic-qe init).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Configuration
LOCK_FILE="$PROJECT_ROOT/.agentic-qe/.session-bootstrapped"
LOCK_TTL_HOURS=24

log() { echo -e "\033[0;32m[✓]\033[0m $*"; }
info() { echo -e "\033[0;34m[INFO]\033[0m $*"; }
warn() { echo -e "\033[1;33m[⚠]\033[0m $*"; }
error() { echo -e "\033[0;31m[✗]\033[0m $*"; }

check_idempotency() {
    if [[ -f "$LOCK_FILE" ]]; then
        local lock_mtime
        lock_mtime=$(stat -f %m "$LOCK_FILE" 2>/dev/null || stat -c %Y "$LOCK_FILE" 2>/dev/null)
        local current_time
        current_time=$(date +%s)
        
        local age_seconds=$((current_time - lock_mtime))
        local age_hours=$((age_seconds / 3600))
        
        if (( age_hours < LOCK_TTL_HOURS )); then
            info "Workspace is already bootstrapped (lock age: ${age_hours}h). Bypassing heavy hydration."
            exit 0
        else
            warn "Bootstrap lock is stale (> ${LOCK_TTL_HOURS}h). Re-hydrating workspace."
            rm "$LOCK_FILE"
        fi
    fi
}

hydrate_workspace() {
    info "Hydrating workspace constraints..."
    
    # 1. AQE Init
    if command -v npx >/dev/null; then
        info "Running agentic-qe init --auto..."
        cd "$PROJECT_ROOT" && npx -y agentic-qe@latest init --auto || warn "agentic-qe init failed"
    fi
    
    # 2. Ruvector Verification
    if ! command -v ruvector >/dev/null && command -v npm >/dev/null; then
        info "Installing ruvector..."
        npm install -g ruvector || warn "ruvector install failed"
    fi
    
    # 3. Create fresh lock
    mkdir -p "$(dirname "$LOCK_FILE")"
    date -u +"%Y-%m-%dT%H:%M:%SZ" > "$LOCK_FILE"
    log "Workspace successfully hydrated and locked."
}

# --- Execution ---
check_idempotency
hydrate_workspace
