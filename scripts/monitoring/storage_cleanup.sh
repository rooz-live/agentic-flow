#!/usr/bin/env bash
# storage_cleanup.sh
# @purpose: Monitor disk usage on / and reclaim Time Machine local snapshots when
#           usage crosses a configurable threshold.
# @business-context: Prevents host OS storage starvation by proactively thinning
#           Time Machine local snapshots before disk fills completely.
#
# Usage:
#   ./storage_cleanup.sh                       # Uses STORAGE_CLEANUP_THRESHOLD (default 85)
#   STORAGE_CLEANUP_THRESHOLD=90 ./storage_cleanup.sh
#
# Environment variables:
#   STORAGE_CLEANUP_THRESHOLD  — integer %, default 85. Trigger cleanup when usage >= this.
#   STORAGE_CLEANUP_LOG_DIR    — directory for JSONL log (default: <repo-root>/.goalie/evidence/storage_cleanup)
#   STORAGE_CLEANUP_DRY_RUN    — if set to "1", do not call tmutil; log action_taken=dry-run
#   TMUTIL_BIN                 — override path to tmutil (used in tests for monkeypatching)
#
# Exit codes:
#   0  — disk is below threshold OR cleanup ran and succeeded
#   1  — cleanup ran but tmutil exited non-zero (failed to reclaim)
#
# Idempotency:
#   Running this script multiple times is safe. If disk is below threshold the script
#   logs action_taken=none and exits 0. tmutil thinlocalsnapshots is itself idempotent.
#
# Log format (one JSON object per line in .goalie/evidence/storage_cleanup/storage_cleanup.jsonl):
#   {
#     "timestamp":      "2026-06-19T12:00:00Z",
#     "threshold":      85,
#     "usage_percent":  78,
#     "action_taken":   "none" | "tmutil_thin" | "dry-run" | "error",
#     "bytes_reclaimed": 2000000000000,   # present only when tmutil ran
#     "exit_code":      0
#   }

set -uo pipefail

# ─── Configuration ──────────────────────────────────────────────────────────
THRESHOLD="${STORAGE_CLEANUP_THRESHOLD:-85}"
DRY_RUN="${STORAGE_CLEANUP_DRY_RUN:-0}"
TMUTIL="${TMUTIL_BIN:-tmutil}"
# Amount of bytes to ask tmutil to thin (2 TB)
THIN_BYTES="${STORAGE_CLEANUP_THIN_BYTES:-2000000000000}"

# Locate project root relative to this script so the log lands in the repo even
# when the script is invoked from a cron job with a different CWD.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

LOG_DIR="${STORAGE_CLEANUP_LOG_DIR:-$PROJECT_ROOT/.goalie/evidence/storage_cleanup}"
LOG_FILE="$LOG_DIR/storage_cleanup.jsonl"

# ─── Helpers ────────────────────────────────────────────────────────────────
_ts() {
  date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u +%s
}

_log() {
  # Append a single JSONL record.  All arguments are key=value pairs except
  # the last, which may be followed by additional k=v pairs.
  local timestamp threshold usage_percent action_taken exit_code
  timestamp="$1"
  threshold="$2"
  usage_percent="$3"
  action_taken="$4"
  exit_code="$5"
  local bytes_reclaimed_field=""
  if [[ -n "${6:-}" ]]; then
    bytes_reclaimed_field=",\"bytes_reclaimed\":${6}"
  fi

  mkdir -p "$LOG_DIR"
  printf '{"timestamp":"%s","threshold":%s,"usage_percent":%s,"action_taken":"%s"%s,"exit_code":%s}\n' \
    "$timestamp" "$threshold" "$usage_percent" "$action_taken" \
    "$bytes_reclaimed_field" "$exit_code" \
    >> "$LOG_FILE"
}

_get_usage_percent() {
  # Parse the Use% column from `df -h /`.
  # Handles both macOS ("85%") and Linux ("85%") output.
  # Outputs an integer, e.g. 85.
  df -h / 2>/dev/null \
    | awk 'NR==2 {
        for(i=1;i<=NF;i++) {
          if ($i ~ /^[0-9]+%$/) {
            gsub(/%/, "", $i);
            print $i;
            exit
          }
        }
      }'
}

# ─── Main ───────────────────────────────────────────────────────────────────
main() {
  local ts
  ts="$(_ts)"

  # Validate threshold is a positive integer
  if ! [[ "$THRESHOLD" =~ ^[0-9]+$ ]]; then
    echo "[storage_cleanup] ERROR: STORAGE_CLEANUP_THRESHOLD must be a positive integer, got: $THRESHOLD" >&2
    _log "$ts" "\"$THRESHOLD\"" "null" "error" 1
    exit 1
  fi

  # Get current disk usage
  local usage_percent
  usage_percent="$(_get_usage_percent)"

  if [[ -z "$usage_percent" ]]; then
    echo "[storage_cleanup] ERROR: Could not parse disk usage from df -h /" >&2
    _log "$ts" "$THRESHOLD" "null" "error" 1
    exit 1
  fi

  echo "[storage_cleanup] Disk usage: ${usage_percent}%  threshold: ${THRESHOLD}%"

  # ── Below threshold — nothing to do ──────────────────────────────────────
  if (( usage_percent < THRESHOLD )); then
    echo "[storage_cleanup] OK — usage ${usage_percent}% is below threshold ${THRESHOLD}%. No action needed."
    _log "$ts" "$THRESHOLD" "$usage_percent" "none" 0
    exit 0
  fi

  # ── At or above threshold — thin Time Machine local snapshots ─────────────
  echo "[storage_cleanup] WARN — usage ${usage_percent}% >= threshold ${THRESHOLD}%. Thinning local snapshots..."

  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[storage_cleanup] DRY-RUN: would run: $TMUTIL thinlocalsnapshots / $THIN_BYTES"
    _log "$ts" "$THRESHOLD" "$usage_percent" "dry-run" 0 "$THIN_BYTES"
    exit 0
  fi

  # Capture tmutil output to attempt bytes_reclaimed extraction.
  # We must NOT use "|| true" here — we need the real exit code.
  local tmutil_output tmutil_exit
  set +e
  tmutil_output="$("$TMUTIL" thinlocalsnapshots / "$THIN_BYTES" 2>&1)"
  tmutil_exit=$?
  set -e

  # Attempt to parse "Reclaimed X bytes" from tmutil output (not always present)
  local bytes_reclaimed=""
  bytes_reclaimed="$(echo "$tmutil_output" | grep -oE '[0-9]+ bytes' | grep -oE '[0-9]+' | head -1 || true)"

  if [[ $tmutil_exit -eq 0 ]]; then
    echo "[storage_cleanup] SUCCESS — tmutil thinlocalsnapshots completed (exit 0)."
    [[ -n "$bytes_reclaimed" ]] && echo "[storage_cleanup] Bytes reclaimed: $bytes_reclaimed"
    _log "$ts" "$THRESHOLD" "$usage_percent" "tmutil_thin" 0 "${bytes_reclaimed:-}"
    exit 0
  else
    echo "[storage_cleanup] ERROR — tmutil exited $tmutil_exit. Output:" >&2
    echo "$tmutil_output" >&2
    _log "$ts" "$THRESHOLD" "$usage_percent" "error" 1 "${bytes_reclaimed:-}"
    exit 1
  fi
}

main "$@"
