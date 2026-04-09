#!/usr/bin/env bash
set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Progress tracking via TypeScript
PROGRESS_PID=""

# Cleanup on exit
cleanup() {
    if [ -n "$PROGRESS_PID" ] && kill -0 "$PROGRESS_PID" 2>/dev/null; then
        kill "$PROGRESS_PID" 2>/dev/null || true
    fi
}
trap cleanup EXIT

# ============================================================================
# Multi-Circle Runner with Progress Tracking
# ============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 ay-prod: Running All Circle Ceremonies with Progress Tracking"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create progress tracking state file
PROGRESS_STATE="/tmp/ay-prod-progress-$$.json"
cat > "$PROGRESS_STATE" <<EOF
{
  "runner": {
    "started": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "pipelines": {
      "orchestrator": {"phase": "waiting", "progress": 0, "total": 100},
      "assessor": {"phase": "waiting", "progress": 0, "total": 100},
      "analyst": {"phase": "waiting", "progress": 0, "total": 100},
      "innovator": {"phase": "waiting", "progress": 0, "total": 100}
    }
  }
}
EOF

# Start progress monitor in background (disabled - script not found)
# "$SCRIPT_DIR/ay-prod-progress-monitor.sh" "$PROGRESS_STATE" &
# PROGRESS_PID=$!

echo "📊 Progress tracking initialized"
echo ""

# Function to update progress
update_progress() {
    local circle="$1"
    local phase="$2"
    local progress="$3"
    
    if [ -f "$PROGRESS_STATE" ] && command -v jq &>/dev/null; then
        local tmp_file="${PROGRESS_STATE}.tmp"
        if jq ".runner.pipelines.${circle}.phase = \"${phase}\" | .runner.pipelines.${circle}.progress = ${progress}" \
            "$PROGRESS_STATE" > "$tmp_file" 2>/dev/null; then
            mv "$tmp_file" "$PROGRESS_STATE" 2>/dev/null || rm -f "$tmp_file"
        fi
    fi
}

# ============================================================================
# Run circles in parallel with progress tracking
# ============================================================================

# Array to track background jobs
declare -a PIDS

# Orchestrator - standup
(
    update_progress "orchestrator" "starting" 10
    "$SCRIPT_DIR/ay-prod-cycle.sh" orchestrator standup advisory > "/tmp/ay-prod-orchestrator-$$.log" 2>&1
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        update_progress "orchestrator" "completed" 100
    else
        update_progress "orchestrator" "failed" 0
    fi
    
    exit $EXIT_CODE
) &
PIDS+=($!)

sleep 0.5

# Assessor - wsjf
(
    update_progress "assessor" "starting" 10
    "$SCRIPT_DIR/ay-prod-cycle.sh" assessor wsjf advisory > "/tmp/ay-prod-assessor-$$.log" 2>&1
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        update_progress "assessor" "completed" 100
    else
        update_progress "assessor" "failed" 0
    fi
    
    exit $EXIT_CODE
) &
PIDS+=($!)

sleep 0.5

# Analyst - refine
(
    update_progress "analyst" "starting" 10
    "$SCRIPT_DIR/ay-prod-cycle.sh" analyst refine advisory > "/tmp/ay-prod-analyst-$$.log" 2>&1
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        update_progress "analyst" "completed" 100
    else
        update_progress "analyst" "failed" 0
    fi
    
    exit $EXIT_CODE
) &
PIDS+=($!)

sleep 0.5

# Innovator - retro
(
    update_progress "innovator" "starting" 10
    "$SCRIPT_DIR/ay-prod-cycle.sh" innovator retro advisory > "/tmp/ay-prod-innovator-$$.log" 2>&1
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        update_progress "innovator" "completed" 100
    else
        update_progress "innovator" "failed" 0
    fi
    
    exit $EXIT_CODE
) &
PIDS+=($!)

echo "✅ All 4 circle ceremonies launched in parallel"
echo ""
echo "Running:"
echo "  • orchestrator/standup (PID: ${PIDS[0]})"
echo "  • assessor/wsjf (PID: ${PIDS[1]})"
echo "  • analyst/refine (PID: ${PIDS[2]})"
echo "  • innovator/retro (PID: ${PIDS[3]})"
echo ""
echo "📊 Watch live progress below..."
echo ""

# Wait for all to complete
FAILED=0
for i in "${!PIDS[@]}"; do
    PID=${PIDS[$i]}
    if wait "$PID"; then
        echo "✅ Circle $i completed successfully"
    else
        echo "❌ Circle $i failed"
        FAILED=$((FAILED + 1))
    fi
done

# Stop progress monitor
if [ -n "$PROGRESS_PID" ] && kill -0 "$PROGRESS_PID" 2>/dev/null; then
    kill "$PROGRESS_PID" 2>/dev/null || true
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Final Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Logs:"
echo "  • orchestrator: /tmp/ay-prod-orchestrator-$$.log"
echo "  • assessor: /tmp/ay-prod-assessor-$$.log"
echo "  • analyst: /tmp/ay-prod-analyst-$$.log"
echo "  • innovator: /tmp/ay-prod-innovator-$$.log"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "✅ All ceremonies completed successfully!"
    exit 0
else
    echo "⚠️  $FAILED ceremonies failed"
    exit 1
fi
