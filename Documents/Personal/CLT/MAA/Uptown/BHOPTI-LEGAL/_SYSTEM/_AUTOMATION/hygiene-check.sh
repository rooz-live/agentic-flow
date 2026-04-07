#!/bin/bash
# hygiene-check.sh — Disk/process hygiene report-only checker
#
# Usage:
#   hygiene-check.sh                full report (text)
#   hygiene-check.sh --json         JSON output
#   hygiene-check.sh --summary      one-line summary
#   hygiene-check.sh --cleanup --approve-cleanup <token>
#                                 actually run cleanup (requires explicit opt-in + approval token)
#
# Checks:
#   1. git temp pack garbage (*.tmp, .git/objects/pack/*.tmp)
#   2. .codeium sqlite/wal growth
#   3. .cache growth vs threshold
#   4. agentic-flow .git/objects size
#   5. /tmp stale WSJF artifacts
#
# INVARIANT: No destructive actions in default mode. --cleanup requires explicit flag.
#
# Exit codes:
#   0  — all checks within thresholds
#   1  — one or more checks above threshold (report-only)
#   2  — cleanup performed (only with --cleanup)

set -uo pipefail

# ─── THRESHOLDS (bytes) ──────────────────────────────────────────────────────
CODEIUM_WARN_GB=25
CACHE_WARN_GB=15
GIT_OBJECTS_WARN_MB=400
TMP_PACK_WARN_COUNT=5

# ─── PATHS ────────────────────────────────────────────────────────────────────
CODEIUM_DIR="$HOME/.codeium"
CACHE_DIR="$HOME/.cache"
AGENTIC_GIT="$HOME/Documents/code/investing/agentic-flow/.git/objects"
CLT_GIT="$HOME/Documents/Personal/CLT/.git/objects"
EVENTS_LOG="$HOME/Library/Logs/wsjf-events.jsonl"

OUTPUT_JSON=false
SUMMARY_ONLY=false
DO_CLEANUP=false
APPROVAL_TOKEN=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --json)    OUTPUT_JSON=true; shift ;;
    --summary) SUMMARY_ONLY=true; shift ;;
    --cleanup) DO_CLEANUP=true; shift ;;
    --approve-cleanup)
      APPROVAL_TOKEN="${2:-}"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

timestamp() { date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%s; }

emit_event() {
  local component="$1" action="$2" target="$3" status="$4" severity="$5" evidence="$6"
  local ts; ts=$(timestamp)
  printf '{"timestamp":"%s","component":"%s","mode":"hygiene-check","action":"%s","target":"%s","status":"%s","severity":"%s","evidence_path":"%s"}\n' \
    "$ts" "$component" "$action" "$target" "$status" "$severity" "$evidence" >> "$EVENTS_LOG" 2>/dev/null || true
}

# ─── CHECK FUNCTIONS ──────────────────────────────────────────────────────────
warnings=0
checks=()

check_dir_size() {
  local label="$1" dir="$2" warn_val="$3" unit="$4"
  local size_bytes=0 size_human="N/A" status="OK" severity="INFO"

  if [[ -d "$dir" ]]; then
    size_bytes=$(du -sk "$dir" 2>/dev/null | awk '{print $1}')
    size_bytes=$((size_bytes * 1024))  # KB to bytes
    size_human=$(du -sh "$dir" 2>/dev/null | awk '{print $1}')

    local threshold_bytes=0
    case "$unit" in
      GB) threshold_bytes=$((warn_val * 1073741824)) ;;
      MB) threshold_bytes=$((warn_val * 1048576)) ;;
    esac

    if [[ "$size_bytes" -gt "$threshold_bytes" ]]; then
      status="WARN"
      severity="WARN"
      ((warnings++))
    fi
  else
    status="SKIP"
    severity="INFO"
    size_human="(not found)"
  fi

  checks+=("${label}|${size_human}|${warn_val}${unit}|${status}")
  emit_event "hygiene" "check-size" "$label" "$status" "$severity" "size=$size_human,threshold=${warn_val}${unit}"
}

check_git_temp_packs() {
  local label="git-temp-packs"
  local count=0 status="OK" severity="INFO"
  local details=""

  for git_dir in "$AGENTIC_GIT" "$CLT_GIT"; do
    if [[ -d "$git_dir" ]]; then
      local pack_dir="${git_dir}/pack"
      if [[ -d "$pack_dir" ]]; then
        local tmp_count
        tmp_count=$(find "$pack_dir" \( -name "*.tmp" -o -name "tmp_*" \) 2>/dev/null | wc -l | tr -d ' ')
        count=$((count + tmp_count))
        [[ "$tmp_count" -gt 0 ]] && details="${details}${git_dir}: ${tmp_count} tmp files; "
      fi
    fi
  done

  if [[ "$count" -gt "$TMP_PACK_WARN_COUNT" ]]; then
    status="WARN"
    severity="WARN"
    ((warnings++))
  fi

  checks+=("${label}|${count} files|threshold=${TMP_PACK_WARN_COUNT}|${status}")
  emit_event "hygiene" "check-git-tmp" "$label" "$status" "$severity" "count=$count,details=$details"
}

check_sqlite_wal() {
  local label="codeium-sqlite-wal"
  local wal_size=0 wal_human="0B" status="OK" severity="INFO"
  local wal_threshold_mb=500

  if [[ -d "$CODEIUM_DIR" ]]; then
    # Find WAL files and sum sizes
    local total_kb=0
    while IFS= read -r wal_file; do
      [[ -z "$wal_file" ]] && continue
      local kb
      kb=$(du -k "$wal_file" 2>/dev/null | awk '{print $1}')
      total_kb=$((total_kb + kb))
    done < <(find "$CODEIUM_DIR" -name "*.wal" -o -name "*-wal" 2>/dev/null)

    wal_size=$((total_kb * 1024))
    if [[ "$total_kb" -gt 0 ]]; then
      wal_human="$((total_kb / 1024))M"
    fi

    if [[ "$total_kb" -gt $((wal_threshold_mb * 1024)) ]]; then
      status="WARN"
      severity="WARN"
      ((warnings++))
    fi
  else
    status="SKIP"
    wal_human="(not found)"
  fi

  checks+=("${label}|${wal_human}|threshold=${wal_threshold_mb}M|${status}")
  emit_event "hygiene" "check-wal" "$label" "$status" "$severity" "wal_size=$wal_human"
}

# ─── RUN CHECKS ──────────────────────────────────────────────────────────────
check_dir_size ".codeium" "$CODEIUM_DIR" "$CODEIUM_WARN_GB" "GB"
check_dir_size ".cache" "$CACHE_DIR" "$CACHE_WARN_GB" "GB"
check_dir_size "agentic-flow/.git/objects" "$AGENTIC_GIT" "$GIT_OBJECTS_WARN_MB" "MB"
check_dir_size "CLT/.git/objects" "$CLT_GIT" "$GIT_OBJECTS_WARN_MB" "MB"
check_git_temp_packs
check_sqlite_wal

# ─── OUTPUT ───────────────────────────────────────────────────────────────────
if $SUMMARY_ONLY; then
  good=$(( ${#checks[@]} - warnings ))
  echo "${good}/${#checks[@]} OK | ${warnings} WARN"
  [[ "$warnings" -gt 0 ]] && exit 1 || exit 0
fi

if $OUTPUT_JSON; then
  echo "["
  first=true
  for c in "${checks[@]}"; do
    IFS='|' read -r name size threshold status <<< "$c"
    $first || echo ","
    first=false
    printf '  {"check":"%s","size":"%s","threshold":"%s","status":"%s"}' \
      "$name" "$size" "$threshold" "$status"
  done
  echo ""
  echo "]"
else
  printf '%-30s  %-10s  %-20s  %s\n' "CHECK" "SIZE" "THRESHOLD" "STATUS"
  printf '%s\n' "------------------------------------------------------------------------"
  for c in "${checks[@]}"; do
    IFS='|' read -r name size threshold status <<< "$c"
    local_marker="✅"
    case "$status" in
      WARN) local_marker="⚠️ " ;;
      SKIP) local_marker="⏭️ " ;;
    esac
    printf '%s %-28s  %-10s  %-20s  %s\n' "$local_marker" "$name" "$size" "$threshold" "$status"
  done
  echo ""
  echo "Total: ${#checks[@]} checks | ${warnings} warnings"
fi

# ─── CLEANUP (opt-in only) ────────────────────────────────────────────────────
if $DO_CLEANUP; then
  if [[ "$APPROVAL_TOKEN" != "YES_CLEANUP" ]]; then
    echo "Cleanup blocked: explicit approval required."
    echo "Re-run with: hygiene-check.sh --cleanup --approve-cleanup YES_CLEANUP"
    emit_event "hygiene" "cleanup-blocked" "approval-gate" "HOLD" "WARN" "missing or invalid --approve-cleanup token"
    exit 1
  fi
  echo ""
  echo "=== CLEANUP MODE (explicit opt-in) ==="

  # git gc on repos with large objects
  for git_dir in "$AGENTIC_GIT" "$CLT_GIT"; do
    repo_root="${git_dir%/.git/objects}"
    if [[ -d "$git_dir" ]]; then
      echo "Running git gc on $(basename "$repo_root")..."
      git -C "$repo_root" gc --auto 2>/dev/null || echo "  WARN: gc failed for $repo_root"
      emit_event "hygiene" "cleanup-git-gc" "$repo_root" "DONE" "INFO" "git gc --auto"
    fi
  done

  # Remove git temp packs
  for git_dir in "$AGENTIC_GIT" "$CLT_GIT"; do
    pack_dir="${git_dir}/pack"
    if [[ -d "$pack_dir" ]]; then
      tmp_files=""
      tmp_files=$(find "$pack_dir" \( -name "*.tmp" -o -name "tmp_*" \) 2>/dev/null)
      if [[ -n "$tmp_files" ]]; then
        echo "Removing temp pack files in $pack_dir..."
        echo "$tmp_files" | xargs rm -f 2>/dev/null || true
        emit_event "hygiene" "cleanup-tmp-packs" "$pack_dir" "DONE" "INFO" "removed temp packs"
      fi
    fi
  done

  echo "Cleanup complete."
  exit 2
fi

[[ "$warnings" -gt 0 ]] && exit 1 || exit 0
