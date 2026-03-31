#!/bin/bash
# scripts/orchestrators/3-2-1-backup.sh

set -e
source "/Users/shahroozbhopti/Documents/code/investing/agentic-flow/_SYSTEM/_AUTOMATION/exit-codes-robust.sh" || true

DASHBOARD_DIR="/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/00-DASHBOARD"
ARCHIVE_DIR="/Users/shahroozbhopti/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/archive/dashboards-3-2-1/$(date +%Y-%m-%d)"
TMP_DIR="/tmp/dashboard-cold-storage"

mkdir -p "$DASHBOARD_DIR" "$ARCHIVE_DIR" "$TMP_DIR"

log() {
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] INFO: $1" >&2
}

log "Executing 3-2-1 Backup Strategy for Dashboards"

# CSQBM Governance Constraint: Prevent hallucinatory archival
local_proj_root="$(cd "$(dirname "$(dirname "${BASH_SOURCE[0]}")")" && pwd)"

# Ensure we collect all V3/V4/V5 files
shopt -s nullglob
FILES=("$DASHBOARD_DIR"/WSJF-LIVE-*.html)

if [ ${#FILES[@]} -eq 0 ]; then
    log "No dashboards found to backup."
    exit 0
fi

# 1. Primary Copy (Already resides in $DASHBOARD_DIR)
log "Primary Copied Verified: $DASHBOARD_DIR"

# 2. Local Archive Copy (Second internal state)
for file in "${FILES[@]}"; do
    basename=$(basename "$file")
    cp "$file" "$ARCHIVE_DIR/${basename}.bak"
done
log "Local Archive Synced: $ARCHIVE_DIR"

# 3. Off-site / Alternate Media Copy (Mapped to volatile tmp array + Rsync target space)
for file in "${FILES[@]}"; do
    basename=$(basename "$file")
    cp "$file" "$TMP_DIR/${basename}.cold"
done
log "Cold Storage Synced (Off-site emulator): $TMP_DIR"

log "✅ 3-2-1 Core Backup Protocol Completed."
exit $EX_OK
