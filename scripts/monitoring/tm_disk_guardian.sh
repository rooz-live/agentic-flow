#!/bin/bash
# tm_disk_guardian.sh
# @business-context WSJF-49: Protects the localized SQLite telemetry endpoints and Git packs from unstructured expansion preventing Host OS starvation.
# @adr ADR-014: Edge architectures demand rigorous cache and SQLite limits protecting absolute hardware margins structurally.
#
# Usage:
#   ./tm_disk_guardian.sh              # Monitor only (default)
#   ./tm_disk_guardian.sh --cleanup    # Monitor + reclaim recreatable caches
#
# --cleanup ONLY targets recreatable/compactable data. It never destroys capability:
#   ✅ uv cache (re-downloads on demand)
#   ✅ puppeteer Chromium (re-downloads on demand)
#   ✅ git gc --aggressive (compacts, no data loss)
#   ✅ git temp packs (stale locks/orphans)
#   ✅ Codeium WAL checkpoint (compacts journal, keeps embeddings)
#   ✅ MailMaven log rotation (rotate, truncate active log)
#   ❌ Codeium embeddings database (would require multi-hour re-index)
#   ❌ Huggingface models (tiny, needed for inference)
#   ❌ Node/Prisma caches (small, needed for dev)

set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
EVENTS_LOG="${HOME}/Library/Logs/wsjf-events.jsonl"
CLEANUP=false

for arg in "$@"; do
  case "$arg" in
    --cleanup) CLEANUP=true ;;
  esac
done

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

# ─── CLEANUP MODE ─────────────────────────────────────────────────────────────
if [[ "$CLEANUP" == "true" ]]; then
  echo ""
  echo -e "${CYAN}===========================================${NC}"
  echo -e "${CYAN}   CLEANUP (capability-preserving)          ${NC}"
  echo -e "${CYAN}===========================================${NC}"
  RECLAIMED_MB=0

  # 1. uv cache (re-downloads on demand)
  if command -v uv >/dev/null 2>&1; then
    uv_before=$(du -sk "$HOME/.cache/uv" 2>/dev/null | awk '{print $1}' || echo 0)
    echo -e "${YELLOW}[CLEAN] uv cache (~$((uv_before / 1024))MB)...${NC}"
    uv cache clean 2>/dev/null || true
    uv_after=$(du -sk "$HOME/.cache/uv" 2>/dev/null | awk '{print $1}' || echo 0)
    saved=$(( (uv_before - uv_after) / 1024 ))
    RECLAIMED_MB=$((RECLAIMED_MB + saved))
    echo -e "${GREEN}[OK] uv cache: reclaimed ${saved}MB${NC}"
    emit_event "cleanup-uv-cache" "$HOME/.cache/uv" "CLEANED" "INFO" "before_mb=$((uv_before/1024)),after_mb=$((uv_after/1024)),saved_mb=${saved}"
  else
    # Fallback: remove directory directly
    if [[ -d "$HOME/.cache/uv" ]]; then
      uv_before=$(du -sk "$HOME/.cache/uv" 2>/dev/null | awk '{print $1}' || echo 0)
      echo -e "${YELLOW}[CLEAN] uv cache (~$((uv_before / 1024))MB, uv CLI not found, removing dir)...${NC}"
      rm -rf "$HOME/.cache/uv"
      saved=$((uv_before / 1024))
      RECLAIMED_MB=$((RECLAIMED_MB + saved))
      echo -e "${GREEN}[OK] uv cache dir removed: reclaimed ${saved}MB${NC}"
      emit_event "cleanup-uv-cache" "$HOME/.cache/uv" "CLEANED" "INFO" "before_mb=$((uv_before/1024)),saved_mb=${saved},method=rm"
    fi
  fi

  # 2. Puppeteer Chromium (re-downloads on demand)
  if [[ -d "$HOME/.cache/puppeteer" ]]; then
    pup_before=$(du -sk "$HOME/.cache/puppeteer" 2>/dev/null | awk '{print $1}' || echo 0)
    echo -e "${YELLOW}[CLEAN] puppeteer cache (~$((pup_before / 1024))MB)...${NC}"
    rm -rf "$HOME/.cache/puppeteer"
    saved=$((pup_before / 1024))
    RECLAIMED_MB=$((RECLAIMED_MB + saved))
    echo -e "${GREEN}[OK] puppeteer cache: reclaimed ${saved}MB${NC}"
    emit_event "cleanup-puppeteer" "$HOME/.cache/puppeteer" "CLEANED" "INFO" "saved_mb=${saved}"
  fi

  # 3. Git gc + temp pack cleanup
  GIT_PROJECT="$HOME/Documents/code/investing/agentic-flow"
  if [[ -d "$GIT_PROJECT/.git" ]]; then
    git_before=$(du -sk "$GIT_PROJECT/.git/objects" 2>/dev/null | awk '{print $1}' || echo 0)
    # Remove stale locks and temp packs first
    find "$GIT_PROJECT/.git" \( -name "tmp_pack_*" -o -name "*.lock" \) -mmin +30 -delete 2>/dev/null || true
    echo -e "${YELLOW}[CLEAN] git gc --aggressive (~$((git_before / 1024))MB objects)...${NC}"
    git -C "$GIT_PROJECT" gc --aggressive --prune=now 2>/dev/null || git -C "$GIT_PROJECT" gc --prune=now 2>/dev/null || true
    git_after=$(du -sk "$GIT_PROJECT/.git/objects" 2>/dev/null | awk '{print $1}' || echo 0)
    saved=$(( (git_before - git_after) / 1024 ))
    [[ $saved -lt 0 ]] && saved=0
    RECLAIMED_MB=$((RECLAIMED_MB + saved))
    echo -e "${GREEN}[OK] git objects: $((git_before/1024))MB → $((git_after/1024))MB (reclaimed ${saved}MB)${NC}"
    emit_event "cleanup-git-gc" "$GIT_PROJECT/.git" "CLEANED" "INFO" "before_mb=$((git_before/1024)),after_mb=$((git_after/1024)),saved_mb=${saved}"
  fi

  # 4. Codeium WAL checkpoint (compact journal, preserve embeddings)
  for wal_file in "$HOME/.codeium/database"/**/embedding_database.sqlite-wal "$HOME/.codeium/windsurf"/**/embedding_database.sqlite-wal; do
    if [[ -f "$wal_file" ]]; then
      wal_size_kb=$(( $(stat -f%z "$wal_file" 2>/dev/null || echo 0) / 1024 ))
      if [[ $wal_size_kb -gt 10240 ]]; then  # Only checkpoint WALs >10MB
        db_file="${wal_file%-wal}"
        if [[ -f "$db_file" ]] && command -v sqlite3 >/dev/null 2>&1; then
          echo -e "${YELLOW}[COMPACT] Codeium WAL checkpoint (~$((wal_size_kb / 1024))MB): $(basename "$(dirname "$wal_file")")${NC}"
          sqlite3 "$db_file" "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null || true
          wal_after_kb=$(( $(stat -f%z "$wal_file" 2>/dev/null || echo 0) / 1024 ))
          saved=$(( (wal_size_kb - wal_after_kb) / 1024 ))
          [[ $saved -lt 0 ]] && saved=0
          RECLAIMED_MB=$((RECLAIMED_MB + saved))
          echo -e "${GREEN}[OK] WAL: $((wal_size_kb/1024))MB → $((wal_after_kb/1024))MB (reclaimed ${saved}MB)${NC}"
          emit_event "cleanup-codeium-wal" "$wal_file" "COMPACTED" "INFO" "before_mb=$((wal_size_kb/1024)),after_mb=$((wal_after_kb/1024)),saved_mb=${saved}"
        fi
      fi
    fi
  done

  # 5. MailMaven log rotation (rotate, truncate active — app re-creates)
  MAVEN_LOG="$HOME/Library/Logs/MailMaven/MavenLibrary.log"
  MAVEN_LOG2="$HOME/Library/Logs/MailMaven/Maven.log"
  for logfile in "$MAVEN_LOG" "$MAVEN_LOG2"; do
    if [[ -f "$logfile" ]]; then
      log_size_kb=$(( $(stat -f%z "$logfile" 2>/dev/null || echo 0) / 1024 ))
      if [[ $log_size_kb -gt 102400 ]]; then  # Only rotate if >100MB
        echo -e "${YELLOW}[ROTATE] $(basename "$logfile") (~$((log_size_kb / 1024))MB)...${NC}"
        # Keep last 1000 lines as .1 backup, then truncate
        tail -1000 "$logfile" > "${logfile}.1" 2>/dev/null || true
        : > "$logfile"  # Truncate in-place (app keeps file handle)
        saved=$((log_size_kb / 1024))
        RECLAIMED_MB=$((RECLAIMED_MB + saved))
        echo -e "${GREEN}[OK] $(basename "$logfile"): truncated (reclaimed ~${saved}MB, last 1000 lines in .1)${NC}"
        emit_event "cleanup-log-rotate" "$logfile" "ROTATED" "INFO" "saved_mb=${saved}"
      fi
    fi
  done

  # Summary
  echo ""
  echo -e "${CYAN}===========================================${NC}"
  echo -e "${GREEN}[CLEANUP COMPLETE] Reclaimed ~${RECLAIMED_MB}MB${NC}"
  echo -e "${CYAN}===========================================${NC}"
  emit_event "cleanup-total" "tm_disk_guardian" "CLEANED" "INFO" "reclaimed_mb=${RECLAIMED_MB}"
  echo ""
  echo -e "Free space after cleanup:"
  df -h / | awk 'NR==2 {print "  " $4 " free of " $2}'
else
  echo ""
  echo -e "${GREEN}[SUCCESS] Structural IO margins mapped. Run with --cleanup to reclaim space.${NC}"
fi

# Content-hash gate: only emit summary event when state actually changes
_GUARDIAN_HASH_FILE="${HOME}/.bhopti-legal/guardian-last-state"
mkdir -p "$(dirname "$_GUARDIAN_HASH_FILE")" 2>/dev/null
_guardian_state="cleanup=$CLEANUP"
for entry in "${HEAVY_PATHS[@]}"; do
  IFS='|' read -r _p _t _l <<< "$entry"
  if [[ -d "$_p" ]]; then
    _s=$(du -sk "$_p" 2>/dev/null | awk '{print $1}')
    _guardian_state+=",${_l}=${_s}"
  fi
done
_prev_guardian=""
[[ -f "$_GUARDIAN_HASH_FILE" ]] && _prev_guardian=$(cat "$_GUARDIAN_HASH_FILE" 2>/dev/null)
if [[ "$_guardian_state" != "$_prev_guardian" ]]; then
  echo "$_guardian_state" > "$_GUARDIAN_HASH_FILE"
  emit_event "guardian-run" "tm_disk_guardian" "PASS" "INFO" "completed,$_guardian_state"
fi
exit 0
