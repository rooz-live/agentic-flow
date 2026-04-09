#!/usr/bin/env bash
set -euo pipefail

# AY Hook: Run QE Fleet after each episode completion
# Usage: Called by ay-yo.sh after an episode finishes.
# Emits a post-episode QE scan and stores the report for CI/ROAM.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

QE_REPORT_DIR="$PROJECT_ROOT/.ay/qe-reports"
EPISODE_ID="${1:-$(date +%s)}"
mkdir -p "$QE_REPORT_DIR"

echo "[AY Hook] Episode $EPISODE_ID complete → running QE Fleet..."

# Run QE Fleet and capture output
QE_OUTPUT="$QE_REPORT_DIR/qe-fleet-episode-$EPISODE_ID.json"
npm run qe:fleet > "$QE_OUTPUT" 2>&1

# Optional: auto-fix if configured
AUTO_FIX="${AY_AUTO_FIX:-false}"
if [[ "$AUTO_FIX" == "true" ]]; then
  echo "[AY Hook] Auto-fix enabled → running QE Fix..."
  npm run qe:fix > "$QE_REPORT_DIR/qe-fix-episode-$EPISODE_ID.json" 2>&1
fi

echo "[AY Hook] QE Fleet report written to $QE_OUTPUT"
echo "[AY Hook] Use ROAM to track: governance score, test coverage %, visual UI %"

# Emit a lightweight event for downstream dashboards
EVENT="{\"type\":\"episode_complete\",\"episode_id\":\"$EPISODE_ID\",\"qe_report\":\"$QE_OUTPUT\"}"
echo "$EVENT" >> "$PROJECT_ROOT/.ay/events.log"
