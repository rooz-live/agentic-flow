#!/usr/bin/env bash
set -euo pipefail

# Prune old learning retros and rotate transmission log
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RETRO_DIR="$PROJECT_ROOT/.cache"
REPORTS_DIR="$PROJECT_ROOT/reports"
DAYS_TO_KEEP="${DAYS_TO_KEEP:-14}"

mkdir -p "$RETRO_DIR" "$REPORTS_DIR"

echo "[cleanup] pruning retros older than ${DAYS_TO_KEEP}d in $RETRO_DIR"
find "$RETRO_DIR" -name 'learning-retro-*.json' -type f -mtime +"$DAYS_TO_KEEP" -print -delete || true

LOG_FILE="$REPORTS_DIR/learning-transmission.log"
if [ -f "$LOG_FILE" ]; then
  TS=$(date +%Y%m%d-%H%M%S)
  gzip -c "$LOG_FILE" > "$REPORTS_DIR/learning-transmission-$TS.log.gz" || true
  # keep last 500 lines
  tail -n 500 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
  echo "[cleanup] rotated learning-transmission.log → $REPORTS_DIR/learning-transmission-$TS.log.gz"
else
  echo "[cleanup] no transmission log to rotate"
fi