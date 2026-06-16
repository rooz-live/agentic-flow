#!/usr/bin/env bash
# disk-space-monitor.sh — Proactive disk space management
#
# Monitors internal drive free space and automatically cleans safe targets
# when thresholds are breached. Designed to prevent the 96%-full emergency.
#
# Usage: ./disk-space-monitor.sh [--auto-clean] [--dry-run]
#   --auto-clean  Automatically clean safe targets when WARNING threshold hit
#   --dry-run     Show what would be cleaned without doing it
#
# Thresholds (configurable below):
#   OK:       > 100 GB free
#   WARNING:  50-100 GB free  → clean caches
#   CRITICAL: < 50 GB free    → clean caches + TM snapshots + old logs
#
# Safe to run via launchd every 4 hours alongside drift-check.
set -uo pipefail

# ─── Configuration ────────────────────────────────────────────────────────────
WARN_GB=100    # Below this: warning
CRIT_GB=50     # Below this: critical
AUTO_CLEAN=false
DRY_RUN=false
LOG_FILE="${HOME}/Documents/code/investing/agentic-flow/scripts/infra/logs/disk-space.log"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --auto-clean) AUTO_CLEAN=true; shift ;;
        --dry-run)    DRY_RUN=true; AUTO_CLEAN=true; shift ;;
        *)            echo "Unknown: $1"; exit 1 ;;
    esac
done

log() {
    local msg="[$(date -u '+%Y-%m-%d %H:%M:%S')] $*"
    echo "$msg"
    mkdir -p "$(dirname "$LOG_FILE")"
    echo "$msg" >> "$LOG_FILE"
}

run_or_dry() {
    if $DRY_RUN; then
        echo "  [DRY-RUN] $*"
    else
        eval "$@"
    fi
}

# ─── Check free space ─────────────────────────────────────────────────────────
FREE_BYTES=$(df -k /System/Volumes/Data 2>/dev/null | tail -1 | awk '{print $4}')
FREE_GB=$((FREE_BYTES / 1048576))
USED_PCT=$(df -h /System/Volumes/Data 2>/dev/null | tail -1 | awk '{print $5}' | tr -d '%')

if [[ $FREE_GB -gt $WARN_GB ]]; then
    STATUS="OK"
elif [[ $FREE_GB -gt $CRIT_GB ]]; then
    STATUS="WARNING"
else
    STATUS="CRITICAL"
fi

log "Disk: ${FREE_GB} GB free (${USED_PCT}% used) — ${STATUS}"

if [[ "$STATUS" == "OK" ]]; then
    echo "  ✓ ${FREE_GB} GB free — no action needed"
    exit 0
fi

# ─── Inventory reclaimable space ──────────────────────────────────────────────
echo ""
log "Scanning reclaimable targets..."

RECLAIM_TOTAL=0

check_target() {
    local name="$1" path="$2"
    if [[ -d "$path" ]]; then
        local size_kb
        size_kb=$(du -sk "$path" 2>/dev/null | cut -f1)
        local size_gb=$((size_kb / 1048576))
        local size_mb=$((size_kb / 1024))
        if [[ $size_mb -gt 100 ]]; then
            echo "  ${name}: ${size_gb}G (${size_mb} MB)"
            RECLAIM_TOTAL=$((RECLAIM_TOTAL + size_mb))
        fi
    fi
}

check_target "npm cache" "${HOME}/.npm/_cacache"
check_target "brew cache" "${HOME}/Library/Caches/Homebrew"
check_target "pip cache" "${HOME}/Library/Caches/pip"
check_target "Xcode DerivedData" "${HOME}/Library/Developer/Xcode/DerivedData"
check_target "iOS Simulators (inactive)" "${HOME}/Library/Developer/CoreSimulator/Caches"

TM_SNAPSHOTS=$(tmutil listlocalsnapshots / 2>/dev/null | grep -c 'com.apple' || echo "0")
if [[ "$TM_SNAPSHOTS" -gt 0 ]]; then
    echo "  TM local snapshots: ${TM_SNAPSHOTS} snapshot(s)"
fi

echo ""
log "Potential reclaimable: ~${RECLAIM_TOTAL} MB from caches"

# ─── Auto-clean if enabled ────────────────────────────────────────────────────
if ! $AUTO_CLEAN; then
    echo ""
    echo "Run with --auto-clean to clean, or --dry-run to preview"
    exit 1
fi

CLEANED=0
echo ""
log "Cleaning safe targets..."

# Always safe: package manager caches
if [[ -d "${HOME}/.npm" ]]; then
    log "  Cleaning npm cache..."
    run_or_dry "npm cache clean --force 2>/dev/null"
    CLEANED=$((CLEANED + 1))
fi

if command -v brew &>/dev/null; then
    log "  Cleaning brew cache..."
    run_or_dry "brew cleanup --prune=all -s 2>/dev/null"
    CLEANED=$((CLEANED + 1))
fi

if [[ -d "${HOME}/Library/Caches/pip" ]]; then
    log "  Cleaning pip cache..."
    run_or_dry "pip3 cache purge 2>/dev/null"
    CLEANED=$((CLEANED + 1))
fi

# WARNING level: also clean DerivedData
if [[ "$STATUS" == "WARNING" || "$STATUS" == "CRITICAL" ]]; then
    if [[ -d "${HOME}/Library/Developer/Xcode/DerivedData" ]]; then
        log "  Cleaning Xcode DerivedData..."
        run_or_dry "rm -rf '${HOME}/Library/Developer/Xcode/DerivedData'/*"
        CLEANED=$((CLEANED + 1))
    fi
fi

# CRITICAL level: also clean TM snapshots and old logs
if [[ "$STATUS" == "CRITICAL" ]]; then
    if [[ "$TM_SNAPSHOTS" -gt 0 ]]; then
        # Only delete if TM is not actively running
        TM_RUNNING=$(tmutil status 2>/dev/null | grep 'Running = 1' || true)
        if [[ -z "$TM_RUNNING" ]]; then
            log "  Deleting ${TM_SNAPSHOTS} TM local snapshots..."
            tmutil listlocalsnapshots / 2>/dev/null | grep 'com.apple' | sed 's/com.apple.TimeMachine.//' | sed 's/.local//' | while read -r snap; do
                run_or_dry "sudo tmutil deletelocalsnapshots '$snap' 2>/dev/null"
            done
            CLEANED=$((CLEANED + 1))
        else
            log "  Skipping TM snapshots — backup in progress"
        fi
    fi

    # Clean simulator caches (not full runtimes)
    if [[ -d "${HOME}/Library/Developer/CoreSimulator/Caches" ]]; then
        log "  Cleaning simulator caches..."
        run_or_dry "rm -rf '${HOME}/Library/Developer/CoreSimulator/Caches'/*"
        CLEANED=$((CLEANED + 1))
    fi
fi

# ─── Post-clean status ────────────────────────────────────────────────────────
echo ""
if ! $DRY_RUN; then
    NEW_FREE_BYTES=$(df -k /System/Volumes/Data 2>/dev/null | tail -1 | awk '{print $4}')
    NEW_FREE_GB=$((NEW_FREE_BYTES / 1048576))
    GAINED=$((NEW_FREE_GB - FREE_GB))
    log "After cleanup: ${NEW_FREE_GB} GB free (+${GAINED} GB recovered)"
else
    log "Dry run complete — ${CLEANED} actions would execute"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ "$STATUS" == "CRITICAL" ]]; then
    echo "⚠  STILL CRITICAL — consider moving large data to Echo 13:"
    echo "   ~/Pictures (Photos), ~/.lmstudio (models), ~/Dropbox (smart sync)"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
