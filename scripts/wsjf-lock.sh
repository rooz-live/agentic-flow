#!/bin/bash
# wsjf-lock.sh - Enforce single-thread WSJF cycle execution

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WSJF_LOCK="$PROJECT_ROOT/.wsjf_active"

# Usage
usage() {
    echo "Usage: $0 {lock|unlock|status|try-lock}"
    echo ""
    echo "Commands:"
    echo "  lock     - Acquire WSJF lock (fail if already locked)"
    echo "  unlock   - Release WSJF lock"
    echo "  status   - Show lock status"
    echo "  try-lock - Try to acquire lock, show who holds it if locked"
}

# Lock status
status() {
    if [[ -f "$WSJF_LOCK" ]]; then
        LOCK_CONTENT=$(cat "$WSJF_LOCK")
        LOCK_PID=$(echo "$LOCK_CONTENT" | cut -d: -f1)
        LOCK_THREAD=$(echo "$LOCK_CONTENT" | cut -d: -f2)
        LOCK_TIME=$(echo "$LOCK_CONTENT" | cut -d: -f3)
        LOCK_HOST=$(echo "$LOCK_CONTENT" | cut -d: -f4)
        
        # Check if process still exists
        if kill -0 "$LOCK_PID" 2>/dev/null; then
            echo -e "${RED}WSJF lock is ACTIVE${NC}"
            echo "  Thread: $LOCK_THREAD"
            echo "  PID: $LOCK_PID"
            echo "  Host: $LOCK_HOST"
            echo "  Time: $LOCK_TIME"
            return 1
        else
            echo -e "${YELLOW}WSJF lock is STALE (process $LOCK_PID no longer exists)${NC}"
            echo "Removing stale lock..."
            rm -f "$WSJF_LOCK"
            return 0
        fi
    else
        echo -e "${GREEN}WSJF lock is FREE${NC}"
        return 0
    fi
}

# Acquire lock
lock() {
    if status >/dev/null 2>&1; then
        # Lock is free or stale was removed
        LOCK_CONTENT="$$:$(date +%s):$(hostname):${1:-unknown}"
        echo "$LOCK_CONTENT" > "$WSJF_LOCK"
        echo -e "${GREEN}WSJF lock acquired${NC}"
        echo "  Thread: ${1:-unknown}"
        echo "  PID: $$"
        echo "  Host: $(hostname)"
    else
        echo -e "${RED}Cannot acquire WSJF lock${NC}"
        status
        exit 1
    fi
}

# Try lock (don't fail)
try_lock() {
    if status >/dev/null 2>&1; then
        lock "${1:-}"
    else
        echo -e "${YELLOW}WSJF lock already held${NC}"
        status
        return 1
    fi
}

# Release lock
unlock() {
    if [[ -f "$WSJF_LOCK" ]]; then
        LOCK_CONTENT=$(cat "$WSJF_LOCK")
        LOCK_PID=$(echo "$LOCK_CONTENT" | cut -d: -f1)
        
        if [[ "$LOCK_PID" == "$$" ]]; then
            rm -f "$WSJF_LOCK"
            echo -e "${GREEN}WSJF lock released${NC}"
        else
            echo -e "${RED}Cannot release WSJF lock - not owned by this process${NC}"
            echo "Lock owner PID: $LOCK_PID"
            echo "Current PID: $$"
            exit 1
        fi
    else
        echo -e "${YELLOW}WSJF lock is not held${NC}"
    fi
}

# Main
case "${1:-}" in
    lock)
        lock "${2:-}"
        ;;
    unlock)
        unlock
        ;;
    status)
        status
        ;;
    try-lock)
        try_lock "${2:-}"
        ;;
    *)
        usage
        exit 1
        ;;
esac
