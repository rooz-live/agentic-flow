#!/usr/bin/env bash
set -euo pipefail

# Progress monitor - reads state file and renders progress
STATE_FILE="${1:-/tmp/ay-prod-progress.json}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if state file exists
if [ ! -f "$STATE_FILE" ]; then
    echo "⚠️  Progress state file not found: $STATE_FILE"
    exit 1
fi

# Render loop
PREVIOUS_LINES=0

while true; do
    if [ ! -f "$STATE_FILE" ]; then
        break
    fi
    
    # Move cursor up to overwrite previous output
    if [ $PREVIOUS_LINES -gt 0 ]; then
        printf "\033[${PREVIOUS_LINES}A"
    fi
    
    # Read current state
    if command -v jq &>/dev/null; then
        STARTED=$(jq -r '.runner.started' "$STATE_FILE" 2>/dev/null || echo "unknown")
        
        # Calculate overall progress
        TOTAL_PROGRESS=0
        COUNT=0
        
        for circle in orchestrator assessor analyst innovator; do
            PROGRESS=$(jq -r ".runner.pipelines.${circle}.progress" "$STATE_FILE" 2>/dev/null || echo "0")
            TOTAL_PROGRESS=$((TOTAL_PROGRESS + PROGRESS))
            COUNT=$((COUNT + 1))
        done
        
        OVERALL=$((TOTAL_PROGRESS / COUNT))
        
        # Render progress tree
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "🚀 Overall Runner: ${OVERALL}% complete"
        
        # Progress bar
        BAR_WIDTH=40
        FILLED=$((OVERALL * BAR_WIDTH / 100))
        EMPTY=$((BAR_WIDTH - FILLED))
        printf "["
        printf '█%.0s' $(seq 1 $FILLED)
        printf '░%.0s' $(seq 1 $EMPTY)
        printf "] ${OVERALL}%%\n"
        echo ""
        
        # Individual circles
        for circle in orchestrator assessor analyst innovator; do
            PROGRESS=$(jq -r ".runner.pipelines.${circle}.progress" "$STATE_FILE" 2>/dev/null || echo "0")
            PHASE=$(jq -r ".runner.pipelines.${circle}.phase" "$STATE_FILE" 2>/dev/null || echo "waiting")
            
            # Status icon
            if [ "$PHASE" = "completed" ]; then
                ICON="✅"
                COLOR="\033[32m"
            elif [ "$PHASE" = "failed" ]; then
                ICON="❌"
                COLOR="\033[33m"
            elif [ "$PHASE" = "waiting" ]; then
                ICON="⏸️"
                COLOR="\033[90m"
            else
                ICON="🔄"
                COLOR="\033[36m"
            fi
            
            # Circle progress bar
            CIRCLE_BAR_WIDTH=30
            CIRCLE_FILLED=$((PROGRESS * CIRCLE_BAR_WIDTH / 100))
            CIRCLE_EMPTY=$((CIRCLE_BAR_WIDTH - CIRCLE_FILLED))
            
            printf "├─ ${COLOR}%-15s: %3d%% ${ICON}\033[0m\n" "$circle" "$PROGRESS"
            printf "│  ["
            printf '█%.0s' $(seq 1 $CIRCLE_FILLED)
            printf '░%.0s' $(seq 1 $CIRCLE_EMPTY)
            printf "]\n"
        done
        
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        PREVIOUS_LINES=14
    else
        echo "⚠️  jq not available for progress rendering"
        PREVIOUS_LINES=1
    fi
    
    sleep 1
done
