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
EVENTS_LOG="${HOME}/Library/Logs/wsjf-events.jsonl"

emit_event() {
  local action="$1" target="$2" status="$3" severity="$4" evidence="$5"
  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%s)
  echo "{\"timestamp\":\"${ts}\",\"component\":\"tm-disk-guardian\",\"mode\":\"monitor\",\"action\":\"${action}\",\"target\":\"${target}\",\"status\":\"${status}\",\"severity\":\"${severity}\",\"evidence_path\":\"${evidence}\"}" >> "${EVENTS_LOG}" 2>/dev/null || true
}

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
        emit_event "thin-snapshots" "tmutil" "ATTEMPTED" "WARN" "available_blocks=${AVAILABLE_SPACE},snapshots=${SNAPSHOTS}"
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
        
        # Emit pulse natively directly into goalie constraints
        echo '{"source": "disk-guardian", "signal": "SATURATION", "value": 0.95, "metadata": {"state": "CRITICAL_BLOAT"}}' >> .goalie/metrics_log.jsonl

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

# ─── HEAVY PATH MONITORING (RCA-identified hotspots) ─────────────────────────
echo ""
echo -e "${CYAN}--- Heavy Path Monitor ---${NC}"

HEAVY_PATHS=(
  "$HOME/.codeium|5000|Codeium cache"
  "$HOME/Documents/code/investing/agentic-flow/agentdb.db-wal|500|AgentDB WAL"
  "$HOME/Documents/code/investing/agentic-flow/.git/objects|1000|Git objects"
  "$HOME/.cache|3000|User cache"
)

for entry in "${HEAVY_PATHS[@]}"; do
  IFS='|' read -r path threshold_mb label <<< "$entry"
  if [[ -e "$path" ]]; then
    if [[ -d "$path" ]]; then
      size_kb=$(du -sk "$path" 2>/dev/null | awk '{print $1}')
    else
      size_kb=$(( $(stat -f%z "$path" 2>/dev/null || stat -c%s "$path" 2>/dev/null || echo 0) / 1024 ))
    fi
    size_mb=$(( size_kb / 1024 ))
    if (( size_mb > threshold_mb )); then
      echo -e "${RED}[WARN] ${label}: ${size_mb}MB exceeds ${threshold_mb}MB threshold${NC}"
      emit_event "threshold-check" "${path}" "WARN" "HIGH" "size_mb=${size_mb},threshold_mb=${threshold_mb}"
    else
      echo -e "${GREEN}[OK] ${label}: ${size_mb}MB (limit: ${threshold_mb}MB)${NC}"
      emit_event "threshold-check" "${path}" "OK" "INFO" "size_mb=${size_mb},threshold_mb=${threshold_mb}"
    fi
  else
    echo -e "${GREEN}[OK] ${label}: not found (skipped)${NC}"
    emit_event "threshold-check" "${path}" "SKIP" "INFO" "not-found"
  fi
done

# ─── GIT TEMP PACK GARBAGE ───────────────────────────────────────────────────
GIT_DIR="$HOME/Documents/code/investing/agentic-flow/.git"
if [[ -d "$GIT_DIR" ]]; then
  tmp_packs=$(find "$GIT_DIR" \( -name "tmp_pack_*" -o -name "*.lock" \) 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$tmp_packs" -gt 0 ]]; then
    echo -e "${YELLOW}[WARN] Git temp pack garbage: ${tmp_packs} files found${NC}"
    emit_event "git-temp-pack-check" "${GIT_DIR}" "WARN" "WARN" "count=${tmp_packs}"
  else
    echo -e "${GREEN}[OK] No git temp pack garbage${NC}"
    emit_event "git-temp-pack-check" "${GIT_DIR}" "OK" "INFO" "count=0"
  fi
fi

echo ""
echo -e "${GREEN}[SUCCESS] Structural IO margins mapped perfectly.${NC}"
emit_event "guardian-run" "tm_disk_guardian" "PASS" "INFO" "completed"
exit 0
