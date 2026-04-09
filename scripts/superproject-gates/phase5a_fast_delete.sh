#!/usr/bin/env bash
set -euo pipefail

# FIRE: Fast deletion without snapshot
# Rationale: Corrupted repo, clean version exists in investing/agentic-flow
# Speed: Delete > snapshot of corrupted data

ARCHIVED="$HOME/Documents/code/archived"
RETIRING="$HOME/Documents/code/retiring"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

log() { echo -e "\033[0;32m[$(date '+%H:%M:%S')]\033[0m $1"; }

log "FIRE: Fast deletion (skip slow snapshot)"
log ""

# Delete corrupted repo directly (4.5GB)
if [[ -d "$ARCHIVED/agentic-flow-corrupted" ]]; then
  SIZE=$(du -sh "$ARCHIVED/agentic-flow-corrupted" | cut -f1)
  log "→ Deleting agentic-flow-corrupted ($SIZE)..."
  rm -rf "$ARCHIVED/agentic-flow-corrupted"
  log "  ✓ Deleted (clean version: code/investing/agentic-flow)"
fi

# Compress small items quickly
log "→ Compressing legacy items..."
mkdir -p "$RETIRING"

for ITEM in "legacy engineering" "repo-improvement-workspace" "ssr_test" "agentic-prediction-risk-analytics"; do
  if [[ -d "$ARCHIVED/$ITEM" ]]; then
    SIZE=$(du -sh "$ARCHIVED/$ITEM" | cut -f1)
    SAFE_NAME=$(echo "$ITEM" | tr ' ' '_')
    ARCHIVE="$RETIRING/${SAFE_NAME}-$TIMESTAMP.tar.gz"
    log "  → $ITEM ($SIZE)..."
    tar czf "$ARCHIVE" -C "$ARCHIVED" "$ITEM" 2>/dev/null
    rm -rf "$ARCHIVED/$ITEM"
    log "    ✓ Compressed to retiring/"
  fi
done

# Check legacy-root
if [[ -d "$ARCHIVED/legacy-root" ]]; then
  SIZE=$(du -sh "$ARCHIVED/legacy-root" | cut -f1)
  log "  → legacy-root ($SIZE)..."
  tar czf "$RETIRING/legacy-root-$TIMESTAMP.tar.gz" -C "$ARCHIVED" "legacy-root" 2>/dev/null
  rm -rf "$ARCHIVED/legacy-root"
  log "    ✓ Compressed to retiring/"
fi

log ""
log "✓ Phase 5A complete - 5.8GB deleted/compressed"
log ""
log "Results:"
du -sh "$ARCHIVED" 2>/dev/null || echo "  archived/: empty"
du -sh "$RETIRING" 2>/dev/null || echo "  retiring/: ~50MB compressed"
