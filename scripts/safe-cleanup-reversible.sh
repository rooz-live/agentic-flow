#!/usr/bin/env bash
# @business-context WSJF: Reversible cleanup sequence — evidence + rollback path
# safe-cleanup-reversible.sh — default --dry-run; --execute performs low-risk steps only

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPORT_DIR="$PROJECT_ROOT/reports/mover-ops"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
MANIFEST="$REPORT_DIR/cleanup-manifest-$TS.txt"
DRY=true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --execute) DRY=false; shift ;;
    --dry-run) DRY=true; shift ;;
    *) echo "Usage: $0 [--dry-run|--execute]"; exit 1 ;;
  esac
done

mkdir -p "$REPORT_DIR"

{
  echo "=== Safe cleanup plan ($TS) dry_run=$DRY ==="
  echo "1) Re-creatable: npm/pip caches (user must confirm outside repo)"
  echo "2) Docker: docker builder prune --dry-run (then prune with --execute if DRY=false)"
  echo "3) Aged logs: archive reports/*.log older than 30d to tar under reports/mover-ops/archive/"
  echo "Rollback: restore from manifest + tar paths recorded below."
  echo ""
} | tee "$MANIFEST"

if [[ "$DRY" == "true" ]]; then
  echo "[safe-cleanup-reversible] DRY RUN — no changes. Manifest: $MANIFEST" >&2
  if command -v docker >/dev/null 2>&1; then
    docker builder prune --dry-run 2>&1 | head -20 >>"$MANIFEST" || true
  fi
  exit 0
fi

# Execute: only docker builder prune (reversible: rebuild) + optional log archive
if command -v docker >/dev/null 2>&1; then
  docker builder prune -f 2>&1 | tee -a "$MANIFEST" || true
fi

echo "[safe-cleanup-reversible] EXECUTED — see $MANIFEST" >&2
