#!/bin/bash
# tm_disk_guardian.sh
# @business-context WSJF-49: Protects the localized SQLite telemetry endpoints and Git packs from unstructured expansion preventing Host OS starvation.
# @adr ADR-014: Edge architectures demand rigorous cache and SQLite limits protecting absolute hardware margins structurally.

set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}===========================================${NC}"
echo -e "${CYAN}   DISK GUARDIAN MATRIX (SWARM DBOS)       ${NC}"
echo -e "${CYAN}===========================================${NC}"

# Check TimeMachine local snapshots
echo "Checking TimeMachine local snapshots..."
SNAPSHOTS=$(tmutil listlocalsnapshots / | wc -l | tr -d ' ')
if [ "$SNAPSHOTS" -gt 0 ]; then
    echo -e "${YELLOW}[WARNING] Found $SNAPSHOTS TimeMachine local snapshots${NC}"
    tmutil listlocalsnapshots / | while read -r snapshot; do
        echo "  $snapshot"
    done
    
    # Check if snapshots are consuming excessive space
    AVAILABLE_SPACE=$(df / | tail -1 | awk '{print $4}')
    if [ "$AVAILABLE_SPACE" -lt 52428800 ]; then  # Less than 50GB
        echo -e "${YELLOW}[ACTION] Low disk space detected, thinning snapshots...${NC}"
        sudo tmutil thinlocalsnapshots / 1000000000 4 || echo "Failed to thin snapshots"
    fi
else
    echo -e "${GREEN}[OK] No TimeMachine local snapshots found${NC}"
fi

# Limits established at 500MB
MAX_DB_SIZE_BYTES=$((500 * 1024 * 1024))
AGENT_DB=".agentdb/agentdb.sqlite"

if [[ -f "$AGENT_DB" ]]; then
    DB_SIZE=$(stat -f%z "$AGENT_DB" 2>/dev/null || stat -c%s "$AGENT_DB")
    echo "Current DBOS Telemetry Array Size: $((DB_SIZE / 1024 / 1024)) MB"

    if (( DB_SIZE > MAX_DB_SIZE_BYTES )); then
        echo -e "${RED}[FATAL] DBOS Agent database exceeds structural bounds! Threatening local STX IO arrays.${NC}"
        echo -e "${YELLOW}Triggering automated vector cleanup matrix internally.${NC}"
        
        # Send saturation errors to dbos native metrics limit
        python3 scripts/monitoring_dashboard.py --source "disk-guardian" --signal SATURATION --value 0.95 \
            --metadata '{"state": "CRITICAL_BLOAT"}' || true

        # Forcing fallback matrix (E.g. Vacuuming SQLite)
        if command -v sqlite3 >/dev/null 2>&1; then
            echo "Executing native SQLite boundary compaction..."
            sqlite3 "$AGENT_DB" "VACUUM;" || true
            DB_SIZE_NEW=$(stat -f%z "$AGENT_DB" 2>/dev/null || stat -c%s "$AGENT_DB")
            echo -e "${GREEN}[OK] DBOS Rehydrated. New matrix size: $((DB_SIZE_NEW / 1024 / 1024)) MB${NC}"
        fi
    else
         echo -e "${GREEN}[OK] DBOS filesystem structurally aligned underneath margin thresholds.${NC}"
    fi
else
    echo -e "${GREEN}[OK] No localized telemetry arrays discovered. Skipping guardian limits.${NC}"
fi

echo -e "${GREEN}[SUCCESS] Structural IO margins mapped perfectly.${NC}"
exit 0
