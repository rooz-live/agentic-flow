#!/usr/bin/env bash
# cache-auto-update.sh - Automated cache updates with scheduling
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${CYAN}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[✓]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[⚠]${NC} $*"; }
log_error() { echo -e "${RED}[✗]${NC} $*"; }

# Configuration
CACHE_DIR="$ROOT_DIR/.cache/skills"
UPDATE_INTERVAL="${CACHE_UPDATE_INTERVAL:-3600}"  # Default: 1 hour
MAX_CACHE_AGE="${MAX_CACHE_AGE:-86400}"           # Default: 24 hours
PID_FILE="/tmp/cache-auto-update.pid"
LOG_FILE="/tmp/cache-auto-update.log"

# Check if cache needs update
needs_update() {
    local metadata_file="$CACHE_DIR/_metadata.json"
    
    if [ ! -f "$metadata_file" ]; then
        return 0  # No metadata = needs update
    fi
    
    # Check age
    local exported_at=$(jq -r '.exported_at' "$metadata_file" 2>/dev/null || echo "")
    if [ -z "$exported_at" ]; then
        return 0
    fi
    
    local now=$(date +%s)
    local exported_ts=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$exported_at" +%s 2>/dev/null || echo "0")
    local age=$((now - exported_ts))
    
    if [ $age -gt $MAX_CACHE_AGE ]; then
        log_info "Cache is $((age / 3600)) hours old (max: $((MAX_CACHE_AGE / 3600))h)"
        return 0
    fi
    
    return 1
}

# Update cache
update_cache() {
    log_info "Updating skills cache..."
    
    if "$SCRIPT_DIR/mcp-health-check.sh" 2>/dev/null; then
        if "$SCRIPT_DIR/export-skills-cache.sh" 2>&1 | tee -a "$LOG_FILE"; then
            log_success "Cache updated successfully"
            return 0
        else
            log_error "Cache update failed"
            return 1
        fi
    else
        log_warn "MCP offline - skipping cache update"
        return 1
    fi
}

# Daemon mode - continuous updates
daemon_mode() {
    log_info "Starting cache auto-update daemon (interval: ${UPDATE_INTERVAL}s)"
    
    # Write PID
    echo $$ > "$PID_FILE"
    
    # Trap signals
    trap 'log_info "Stopping daemon..."; rm -f "$PID_FILE"; exit 0' SIGINT SIGTERM
    
    while true; do
        if needs_update; then
            update_cache
        else
            log_info "Cache is fresh - skipping update"
        fi
        
        log_info "Next check in $((UPDATE_INTERVAL / 60)) minutes..."
        sleep "$UPDATE_INTERVAL"
    done
}

# One-shot update
oneshot_mode() {
    if needs_update; then
        update_cache
        exit $?
    else
        log_success "Cache is already fresh"
        exit 0
    fi
}

# Status check
status_mode() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            log_success "Daemon running (PID: $pid)"
            
            # Show last update
            if [ -f "$CACHE_DIR/_metadata.json" ]; then
                local exported_at=$(jq -r '.exported_at' "$CACHE_DIR/_metadata.json" 2>/dev/null)
                local skills_total=$(jq -r '.skills_total' "$CACHE_DIR/_metadata.json" 2>/dev/null)
                echo "  Last update: $exported_at"
                echo "  Total skills: $skills_total"
            fi
        else
            log_error "Daemon not running (stale PID file)"
            rm -f "$PID_FILE"
        fi
    else
        log_info "Daemon not running"
    fi
    
    # Check cache freshness
    if [ -f "$CACHE_DIR/_metadata.json" ]; then
        local exported_at=$(jq -r '.exported_at' "$CACHE_DIR/_metadata.json" 2>/dev/null || echo "")
        if [ -n "$exported_at" ]; then
            local now=$(date +%s)
            local exported_ts=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$exported_at" +%s 2>/dev/null || echo "0")
            local age=$((now - exported_ts))
            local hours=$((age / 3600))
            
            if [ $hours -lt 24 ]; then
                log_success "Cache is fresh ($hours hours old)"
            else
                log_warn "Cache is stale ($hours hours old)"
            fi
        fi
    else
        log_warn "No cache metadata found"
    fi
}

# Stop daemon
stop_mode() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            log_info "Stopping daemon (PID: $pid)..."
            kill "$pid"
            rm -f "$PID_FILE"
            log_success "Daemon stopped"
        else
            log_error "Daemon not running"
            rm -f "$PID_FILE"
        fi
    else
        log_info "Daemon not running"
    fi
}

# Usage
usage() {
    cat <<EOF
Usage: $0 <command>

Commands:
  daemon     Start continuous cache update daemon
  oneshot    Update cache once (if needed)
  status     Show daemon and cache status
  stop       Stop daemon
  force      Force update regardless of age

Environment Variables:
  CACHE_UPDATE_INTERVAL   Seconds between checks (default: 3600)
  MAX_CACHE_AGE          Max cache age in seconds (default: 86400)

Examples:
  $0 daemon                              # Start background daemon
  $0 oneshot                             # Update if needed
  CACHE_UPDATE_INTERVAL=600 $0 daemon    # 10-minute updates

EOF
    exit 1
}

# Main
case "${1:-}" in
    daemon)
        daemon_mode
        ;;
    oneshot)
        oneshot_mode
        ;;
    status)
        status_mode
        ;;
    stop)
        stop_mode
        ;;
    force)
        update_cache
        ;;
    *)
        usage
        ;;
esac
