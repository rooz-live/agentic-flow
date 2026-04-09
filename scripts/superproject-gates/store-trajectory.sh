#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# Trajectory Storage Script
# ============================================================================
# Purpose: Store episode trajectories in database for learning curve analysis
# Usage: ./store-trajectory.sh <episode_id> <outcome> <reward> <circle> <ceremony> <episode_file>
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Parse arguments
EPISODE_ID=$1
OUTCOME=$2  # success or failure
REWARD=$3   # 0.0 to 1.0
CIRCLE=${4:-"orchestrator"}
CEREMONY=${5:-"standup"}
EPISODE_FILE=$6  # Optional: path to episode JSON file

if [ -z "$EPISODE_ID" ] || [ -z "$OUTCOME" ] || [ -z "$REWARD" ]; then
    echo "Usage: $0 <episode_id> <outcome> <reward> [circle] [ceremony] [episode_file]"
    echo "  episode_id: unique identifier for this episode"
    echo "  outcome: success or failure"
    echo "  reward: 0.0 to 1.0"
    echo "  circle: orchestrator|assessor|innovator|analyst|seeker|intuitive (optional)"
    echo "  ceremony: standup|wsjf|review|retro|refine|replenish|synthesis (optional)"
    echo "  episode_file: path to episode JSON file (optional)"
    exit 1
fi

# If reward not provided, try auto-calculation from WSJF
if [ -z "$REWARD" ] && [ -n "${WSJF_CONTEXT:-}" ] && [ "$WSJF_CONTEXT" != "{}" ]; then
    # Extract WSJF confidence
    CONFIDENCE=$(echo "$WSJF_CONTEXT" | jq -r '.confidence // 0.50' 2>/dev/null || echo "0.50")
    SUCCESS_FLAG=1
    [ "$OUTCOME" = "failure" ] && SUCCESS_FLAG=0
    
    # Calculate reward using reward calculator
    if [ -f "$PROJECT_ROOT/.agentdb/reward-calculator.py" ]; then
        REWARD=$(python3 "$PROJECT_ROOT/.agentdb/reward-calculator.py" \
            --success "$SUCCESS_FLAG" \
            --wsjf-confidence "$CONFIDENCE" \
            --latency-ms 1000 2>/dev/null || echo "0.80")
    else
        # Fallback: simple calculation
        REWARD=$(awk "BEGIN {printf \"%.2f\", 0.6 + (0.4 * $CONFIDENCE)}")
    fi
fi

# Default if still not set
[ -z "$REWARD" ] && REWARD="0.80"

# Validate reward is numeric and in range
if [ -n "$REWARD" ]; then
    if ! [[ "$REWARD" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
        echo "⚠️  Invalid reward value: $REWARD (must be numeric 0.0-1.0)"
        REWARD="0.80"
    fi
    # Ensure reward is between 0 and 1
    if command -v bc &>/dev/null; then
        if (( $(echo "$REWARD > 1.0" | bc -l) )); then REWARD="1.0"; fi
        if (( $(echo "$REWARD < 0.0" | bc -l) )); then REWARD="0.60"; fi
    fi
fi

echo "📝 Storing trajectory for episode..."
echo "   Episode ID: $EPISODE_ID"
echo "   Outcome: $OUTCOME"
echo "   Reward: $REWARD"
echo "   Circle: $CIRCLE"
echo "   Ceremony: $CEREMONY"
echo ""

# Read episode JSON file to extract trajectory
if [ -z "$EPISODE_FILE" ]; then
    # Use episode ID as filename in tmp dir
    EPISODE_FILE="$TMP_DIR/${EPISODE_ID}.json"
fi

# Check if episode file exists
if [ ! -f "$EPISODE_FILE" ]; then
    echo "❌ Episode file not found: $EPISODE_FILE"
    exit 1
fi

# Extract trajectory from episode JSON
TRAJECTORY_EXISTS=$(jq -e '.trajectory' "$EPISODE_FILE" 2>/dev/null && echo "yes" || echo "no")
TRAJECTORY_LENGTH=$(jq '.trajectory | length' "$EPISODE_FILE" 2>/dev/null || echo "0")

# Build trajectory JSON array for storage
if [ "$TRAJECTORY_EXISTS" = "yes" ] && [ "$TRAJECTORY_LENGTH" -gt 0 ]; then
    # Extract existing trajectory and add new entry
    if [ -f "$SCRIPT_DIR/trajectory-storage.ts" ]; then
        # Use TypeScript to store trajectory
        TRAJECTORY_JSON=$(npx tsx -e "
            import { TrajectoryStorage } from '$SCRIPT_DIR/trajectory-storage.js';
            const storage = new TrajectoryStorage();
            await storage.initSchema();
            
            // Read existing trajectory
            const existingTrajectory = npx tsx -e \"
                const fs = await import('fs');
                const episodeData = JSON.parse(await fs.readFile('$EPISODE_FILE', 'utf-8'));
                const existingTraj = episodeData.trajectory || [];
                existingTraj.push({
                    state: 'Execution completed',
                    action: 'storeTrajectory',
                    reward: $REWARD
                });
                console.log(JSON.stringify(existingTraj, null, 2));
            " "$SCRIPT_DIR/trajectory-storage.js" "$EPISODE_ID" "$OUTCOME" "$REWARD" "$CIRCLE" "$CEREMONY"
        " 2>/dev/null || true
        )
        
        if [ $? -eq 0 ]; then
            echo "✅ Trajectory stored in database via TrajectoryStorage"
        else
            echo "⚠️  Trajectory storage failed, skipping database update"
        fi
    else
    echo "⚠️  Trajectory storage script not found"
fi

echo ""
echo "✅ Trajectory storage complete!"
echo "   Episode ID: $EPISODE_ID"
