#!/usr/bin/env bash
set -euo pipefail
# Fail if newest docs/ROAM*.md is older than MAX_DAYS (default 3)
MAX_DAYS=${MAX_DAYS:-3}
DOCS_DIR="docs"

if [ ! -d "$DOCS_DIR" ]; then
  echo "[ROAM] docs/ missing"
  exit 2
fi

newest=0
found=0
for f in "$DOCS_DIR"/*ROAM*.md "$DOCS_DIR"/*roam*.md; do
  [ -e "$f" ] || continue
  found=1
  mt=$(stat -f %m "$f" 2>/dev/null || stat -c %Y "$f" 2>/dev/null || echo 0)
  if [ "$mt" -gt "$newest" ]; then newest="$mt"; fi
done

if [ "$found" -eq 0 ]; then
  echo "[ROAM] no ROAM*.md files found"
  exit 2
fi

age_days=$(( ( $(date +%s) - newest ) / 86400 ))
echo "[ROAM] newest doc age: ${age_days}d (limit ${MAX_DAYS}d)"
if [ "$age_days" -gt "$MAX_DAYS" ]; then
  echo "[ROAM] stale (> ${MAX_DAYS}d)"
  exit 2
fi
exit 0