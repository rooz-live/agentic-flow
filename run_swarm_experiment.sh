#!/bin/bash
set -e

# Swarm Experiment - Build, Measure, Learn, CI/CD Iteration
# Invoked downstream by scripts/ay-authorize-budget.ts after financial authorization.

echo "================================================================"
echo "🐝  Swarm Experiment: Build, Measure, Learn Pipeline"
echo "================================================================"

mkdir -p .goalie/swarm_exp
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "TS: $TS" > .goalie/swarm_exp/manifest.txt

# Matrix matched against the Authorized OPEX bounds
declare -a ITERS=(5 25 50 100 250)
declare -a SCENARIOS=("baseline" "adverse" "severe" "critical" "extreme")
PIDS=()

echo "Starting Simulation Matrix (Adverse/Severe/Critical)..."

for i in "${!ITERS[@]}"; do
    iter="${ITERS[$i]}"
    scenario="${SCENARIOS[$i]}"
    RID=$(uuidgen | tr '[:upper:]' '[:lower:]')
    
    echo "  → Launching Agent for '$scenario' ($iter iterations) [RUN_ID: $RID]..."
    echo "$scenario,$iter,$RID" >> .goalie/swarm_exp/ids.txt

    # Simulate running the node loop (Out-Of-Repo limits)
    AF_RUN_ID="$RID" ./scripts/af prod-cycle \
        --circle testing \
        --mode advisory \
        --scenario "$scenario" \
        --iterations "$iter" \
        > ".goalie/swarm_exp/${scenario}_${iter}.log" 2>&1 &

    PIDS+=($!)
done

echo ""
echo "[MEASURE] Agents actively collecting telemetry. PIDs: ${PIDS[*]}"
echo "Waiting for completion bounds..."

for pid in "${PIDS[@]}"; do
    wait "$pid"
done

echo ""
echo "[LEARN] Swarm matrix execution complete."
echo "        Telemetry output collected in .goalie/swarm_exp/*.log"
echo "        Awaiting Synthesis into RFC-THEMES-LOG.md for single-threaded commit pipeline."
