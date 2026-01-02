#!/bin/bash
set -e

# Directory for logs
mkdir -p .goalie/swarm_exp
echo "Starting Swarm Experiment (5, 25, 50, 100, 250 iterations)..."
echo "TS: $(date -Iseconds)" > .goalie/swarm_exp/manifest.txt

declare -a ITERS=(5 25 50 100 250)
PIDS=()

for iter in "${ITERS[@]}"; do
    RID=$(uuidgen | tr '[:upper:]' '[:lower:]')
    echo "Launching Agent for $iter iterations (RUN_ID: $RID)..."

    # Save mapping
    echo "$iter $RID" >> .goalie/swarm_exp/ids.txt

    # Run in background
    AF_RUN_ID="$RID" ./scripts/af prod-cycle \
        --circle testing \
        --mode advisory \
        --iterations "$iter" \
        > ".goalie/swarm_exp/${iter}.log" 2>&1 &

    PIDS+=($!)
done

echo "Agents launched. PIDs: ${PIDS[*]}"
echo "Waiting for completion..."

# Wait for all
for pid in "${PIDS[@]}"; do
    wait "$pid"
done

echo "Swarm execution complete."
