#!/bin/bash
# ROAM State Persistence Pattern (Beads-inspired)
# Manages ROAM tracker state with persistence and recovery

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# State persistence configuration
STATE_DIR="$PROJECT_ROOT/.roam-state"
ROAM_TRACKER="$PROJECT_ROOT/ROAM_TRACKER.yaml"
STATE_BACKUP="$STATE_DIR/roam-tracker-backup.yaml"
STATE_LOG="$STATE_DIR/roam-state.log"
LOCK_FILE="$STATE_DIR/roam.lock"

# Ensure state directory exists
mkdir -p "$STATE_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$STATE_LOG"
}

# Acquire lock for state operations
acquire_lock() {
    local timeout="${1:-30}"
    local count=0
    
    while [[ -f "$LOCK_FILE" ]] && [[ $count -lt $timeout ]]; do
        sleep 1
        ((count++))
    done
    
    if [[ $count -ge $timeout ]]; then
        log "ERROR: Failed to acquire lock after ${timeout}s"
        return 1
    fi
    
    echo $$ > "$LOCK_FILE"
    log "Lock acquired (PID: $$)"
}

# Release lock
release_lock() {
    if [[ -f "$LOCK_FILE" ]]; then
        rm -f "$LOCK_FILE"
        log "Lock released (PID: $$)"
    fi
}

# Trap to ensure lock is released
trap release_lock EXIT

# Create state snapshot
create_snapshot() {
    local snapshot_name="${1:-$(date '+%Y%m%d-%H%M%S')}"
    local snapshot_file="$STATE_DIR/snapshot-$snapshot_name.yaml"
    
    if [[ -f "$ROAM_TRACKER" ]]; then
        cp "$ROAM_TRACKER" "$snapshot_file"
        log "Snapshot created: $snapshot_file"
        
        # Keep only last 10 snapshots
        ls -t "$STATE_DIR"/snapshot-*.yaml 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
    else
        log "WARNING: ROAM tracker not found for snapshot"
        return 1
    fi
}

# Restore from snapshot
restore_snapshot() {
    local snapshot_name="$1"
    local snapshot_file="$STATE_DIR/snapshot-$snapshot_name.yaml"
    
    if [[ -f "$snapshot_file" ]]; then
        cp "$snapshot_file" "$ROAM_TRACKER"
        log "Restored from snapshot: $snapshot_name"
    else
        log "ERROR: Snapshot not found: $snapshot_name"
        return 1
    fi
}

# List available snapshots
list_snapshots() {
    echo "Available ROAM state snapshots:"
    ls -la "$STATE_DIR"/snapshot-*.yaml 2>/dev/null | awk '{print $9, $6, $7, $8}' | sed 's|.*/snapshot-||; s|\.yaml||' || echo "No snapshots found"
}

# Backup current state
backup_state() {
    if [[ -f "$ROAM_TRACKER" ]]; then
        cp "$ROAM_TRACKER" "$STATE_BACKUP"
        log "State backed up to: $STATE_BACKUP"
    fi
}

# Restore from backup
restore_backup() {
    if [[ -f "$STATE_BACKUP" ]]; then
        cp "$STATE_BACKUP" "$ROAM_TRACKER"
        log "State restored from backup"
    else
        log "ERROR: No backup found"
        return 1
    fi
}

# Validate ROAM state integrity
validate_state() {
    if [[ ! -f "$ROAM_TRACKER" ]]; then
        log "ERROR: ROAM tracker not found"
        return 1
    fi
    
    # Check YAML syntax
    if ! python3 -c "import yaml; yaml.safe_load(open('$ROAM_TRACKER'))" 2>/dev/null; then
        log "ERROR: ROAM tracker has invalid YAML syntax"
        return 1
    fi
    
    # Check required fields
    local required_fields=("resolved" "owned" "accepted" "mitigated")
    for field in "${required_fields[@]}"; do
        if ! grep -q "^$field:" "$ROAM_TRACKER"; then
            log "WARNING: Missing required field: $field"
        fi
    done
    
    log "ROAM state validation passed"
    return 0
}

# Get state statistics
state_stats() {
    if [[ ! -f "$ROAM_TRACKER" ]]; then
        echo "ROAM tracker not found"
        return 1
    fi
    
    local age_hours=$(( ($(date +%s) - $(stat -f "%m" "$ROAM_TRACKER")) / 3600 ))
    local file_size=$(stat -f "%z" "$ROAM_TRACKER")
    local line_count=$(wc -l < "$ROAM_TRACKER")
    
    echo "ROAM State Statistics:"
    echo "  Age: ${age_hours}h"
    echo "  Size: ${file_size} bytes"
    echo "  Lines: ${line_count}"
    echo "  Status: $([ $age_hours -lt 96 ] && echo "FRESH" || echo "STALE")"
}

# Main command interface
case "${1:-help}" in
    snapshot)
        acquire_lock
        create_snapshot "${2:-}"
        ;;
    restore)
        if [[ -z "${2:-}" ]]; then
            echo "Usage: $0 restore <snapshot-name>"
            exit 1
        fi
        acquire_lock
        restore_snapshot "$2"
        ;;
    list)
        list_snapshots
        ;;
    backup)
        acquire_lock
        backup_state
        ;;
    restore-backup)
        acquire_lock
        restore_backup
        ;;
    validate)
        validate_state
        ;;
    stats)
        state_stats
        ;;
    help|--help)
        cat << EOF
ROAM State Persistence (Beads-inspired pattern)

USAGE:
  $0 snapshot [name]     Create state snapshot
  $0 restore <name>      Restore from snapshot
  $0 list                List available snapshots
  $0 backup              Backup current state
  $0 restore-backup      Restore from backup
  $0 validate            Validate state integrity
  $0 stats               Show state statistics

EXAMPLES:
  $0 snapshot pre-arbitration
  $0 restore 20260308-120000
  $0 validate
EOF
        ;;
    *)
        echo "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
