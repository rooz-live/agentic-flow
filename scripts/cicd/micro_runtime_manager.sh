#!/usr/bin/env bash
# micro_runtime_manager.sh — Measure, learn, iterate: track loop budgets and ROAM risk indicators.
set -euo pipefail

cd "$(dirname "$0")/../.."
REPO_ROOT="$PWD"
source "$REPO_ROOT/scripts/cicd/lib/cls_common.sh"

echo "====================================================================="
echo "📊 MICRO-RUNTIME METRICS & COH_GOVERNANCE REPORT"
echo "====================================================================="

# 1. Measure Loop Ticks
TICKS="${LOOP_TICK_COUNT:-0}"
echo "Current Session Ticks: $TICKS"

# Read thresholds from config/cicd/loop_prompts.yaml
SWEET_SPOT=3
RESET_LIMIT=5
MAX_LIMIT=7

if [[ $TICKS -eq 0 ]]; then
  echo "🟢 Status: Session fresh. Ready to run first perceive/remediate cycle."
elif [[ $TICKS -lt $SWEET_SPOT ]]; then
  echo "🟢 Status: Within sweet spot ($TICKS/$SWEET_SPOT). Continue iteration."
elif [[ $TICKS -eq $SWEET_SPOT ]]; then
  echo "🟡 Status: Sweet spot threshold reached ($TICKS). Session summary recommended."
elif [[ $TICKS -lt $RESET_LIMIT ]]; then
  echo "🟡 Status: Approaching context reset limit ($TICKS/$RESET_LIMIT)."
elif [[ $TICKS -ge $RESET_LIMIT ]]; then
  echo "🔴 Status: RESET REQUIRED ($TICKS >= $RESET_LIMIT). Branch merge or chat reset recommended to avoid token bloat."
fi

echo ""
# 2. Check Git status and Substrate queue
echo "--- Working Substrate Queue Status ---"
if git status -sb | grep -q "ahead"; then
  echo "⚠️ Workspace is ahead of remote origin (unpushed commits)."
else
  echo "✓ Workspace branch status is clean / synchronized."
fi

UC_BLOCKING=0
UC_SUBSTRATE=0
if [[ -x "$REPO_ROOT/scripts/cicd/perceive_tick.sh" ]]; then
  # Get untracked counts safely
  read -r UC_BLOCKING UC_SUBSTRATE < <(cls_untracked_counts 2>/dev/null || echo "0 0")
fi
echo "Untracked Critical (Blocking): $UC_BLOCKING"
echo "Untracked Substrate (Advisory): $UC_SUBSTRATE"
if [[ $UC_SUBSTRATE -gt 0 ]]; then
  SLICES_REMAINING=$(( (UC_SUBSTRATE + 24) / 25 ))
  echo "📂 Projected Substrate Slices Remaining: $SLICES_REMAINING (≤25 files/slice)"
fi

echo ""
# 3. Read ROAM Risk Overlays
echo "--- Active ROAM Edge Risks ---"
ROAM_FILE="$REPO_ROOT/.goalie/ROAM_TRACKER_COG.yaml"
if [[ -f "$ROAM_FILE" ]]; then
  grep -A 3 "id: " "$ROAM_FILE" | grep -E "id:|roam:" || echo "No active risks parsed."
else
  echo "⚠️ ROAM Tracker file missing."
fi

echo ""
# 4. Next PI Planning & Ceremony Directives
echo "--- Next Value Stream Directives ---"
if [[ $TICKS -ge 5 ]]; then
  echo "👉 Action: Merge branch, clear your chat thread, and start a fresh session."
else
  echo "👉 Action: Run next tick:"
  echo "   export LOOP_TICK_COUNT=$((TICKS + 1))"
  echo "   LOOP_ITEM=P1-INDEX-02 bash scripts/cicd/run_loop_tick.sh"
fi
echo "====================================================================="
