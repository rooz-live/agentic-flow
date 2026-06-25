#!/usr/bin/env bash
# storage_cleanup_cron.sh
# @purpose: Cron wrapper that invokes storage_cleanup.sh and captures its output
#           to a rotating log file suitable for unattended cron execution.
#
# Installation (add one of these to your crontab via `crontab -e`):
#
#   # Run every 20 minutes:
#   */20 * * * * /Users/shahroozbhopti/Documents/code/scripts/monitoring/storage_cleanup_cron.sh
#
#   # Run every 20 minutes with a custom threshold:
#   */20 * * * * STORAGE_CLEANUP_THRESHOLD=90 /Users/shahroozbhopti/Documents/code/scripts/monitoring/storage_cleanup_cron.sh
#
# Quick-install helper (run once from the terminal):
#
#   SCRIPT="$(realpath "$(dirname "$0")/storage_cleanup_cron.sh")"
#   (crontab -l 2>/dev/null; echo "*/20 * * * * $SCRIPT") | crontab -
#
# The cron wrapper:
#   - Resolves absolute paths so it works regardless of cron's working directory.
#   - Redirects stdout+stderr to a rolling log (max ~1 MB via truncation guard).
#   - Propagates the exit code of storage_cleanup.sh so cron mail is sent on failure.
#
# Environment variables forwarded to storage_cleanup.sh:
#   STORAGE_CLEANUP_THRESHOLD   (default 85)
#   STORAGE_CLEANUP_DRY_RUN     (default 0)
#   STORAGE_CLEANUP_THIN_BYTES  (default 2000000000000)
#   STORAGE_CLEANUP_LOG_DIR     (default <repo>/.goalie/evidence/storage_cleanup)

set -uo pipefail

# ─── Paths ──────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLEANUP_SCRIPT="$SCRIPT_DIR/storage_cleanup.sh"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CRON_LOG_DIR="$PROJECT_ROOT/.goalie/evidence/storage_cleanup"
CRON_LOG="$CRON_LOG_DIR/storage_cleanup_cron.log"
MAX_LOG_BYTES=1048576  # 1 MB rolling guard

# ─── Validate main script exists ────────────────────────────────────────────
if [[ ! -x "$CLEANUP_SCRIPT" ]]; then
  echo "[storage_cleanup_cron] ERROR: Cannot find or execute: $CLEANUP_SCRIPT" >&2
  exit 1
fi

# ─── Ensure log directory exists ────────────────────────────────────────────
mkdir -p "$CRON_LOG_DIR"

# ─── Rolling log guard (truncate if > 1 MB) ─────────────────────────────────
if [[ -f "$CRON_LOG" ]]; then
  log_size=$(stat -f%z "$CRON_LOG" 2>/dev/null || stat -c%s "$CRON_LOG" 2>/dev/null || echo 0)
  if (( log_size > MAX_LOG_BYTES )); then
    # Keep last 500 lines to preserve recent context
    tail -500 "$CRON_LOG" > "${CRON_LOG}.tmp" && mv "${CRON_LOG}.tmp" "$CRON_LOG" || true
  fi
fi

# ─── Run the cleanup script, tee output to log ──────────────────────────────
{
  echo "--- [$(date -u +%Y-%m-%dT%H:%M:%SZ)] storage_cleanup_cron invoked ---"
  # Forward optional env overrides if callers set them; `set -u` is active so
  # we use parameter expansion with defaults to avoid unbound-variable errors.
  export STORAGE_CLEANUP_THRESHOLD="${STORAGE_CLEANUP_THRESHOLD:-85}"
  export STORAGE_CLEANUP_DRY_RUN="${STORAGE_CLEANUP_DRY_RUN:-0}"
  export STORAGE_CLEANUP_THIN_BYTES="${STORAGE_CLEANUP_THIN_BYTES:-2000000000000}"

  bash "$CLEANUP_SCRIPT"
  CLEANUP_EXIT=$?

  echo "--- [$(date -u +%Y-%m-%dT%H:%M:%SZ)] exit_code=$CLEANUP_EXIT ---"
  exit "$CLEANUP_EXIT"
} 2>&1 | tee -a "$CRON_LOG"

# Propagate exit code (tee always exits 0; capture via PIPESTATUS)
exit "${PIPESTATUS[0]}"
