#!/bin/bash
set -e

# Swarm Next Larger Increment + Scenarios Framework
# Iterations tailored for fast Build-Measure-Learn cycle (BML)
declare -a ITERS=(50 250 500)
declare -a SCENARIOS=("baseline" "adverse" "severe" "critical" "wildcard")

# Directory for logs
mkdir -p .goalie/swarm_exp/scenarios
echo "Starting Swarm Increment & Scenario Matrix..."
echo "TS: $(date -Iseconds)" > .goalie/swarm_exp/scenarios/manifest.txt
echo "Scenarios: ${SCENARIOS[*]}" >> .goalie/swarm_exp/scenarios/manifest.txt
echo "Increments: ${ITERS[*]}" >> .goalie/swarm_exp/scenarios/manifest.txt

for scenario in "${SCENARIOS[@]}"; do
    SCENARIO_UPPER=$(echo "$scenario" | tr '[:lower:]' '[:upper:]')
    echo "--- Initiating Scenario: $SCENARIO_UPPER ---"
    case $scenario in
        "baseline")
            export AF_MOCK_FAILURE_RATE="0.0"
            export AF_MOCK_LATENCY_MULT="1.0"
            export AF_NODE_DROP="0"
            ;;
        "adverse")
            export AF_MOCK_FAILURE_RATE="0.15"
            export AF_MOCK_LATENCY_MULT="2.0"
            export AF_NODE_DROP="0"
            ;;
        "severe")
            export AF_MOCK_FAILURE_RATE="0.30"
            export AF_MOCK_LATENCY_MULT="3.0"
            export AF_NODE_DROP="1"
            ;;
        "critical")
            export AF_MOCK_FAILURE_RATE="0.50"
            export AF_MOCK_LATENCY_MULT="5.0"
            export AF_NODE_DROP="2"
            ;;
        "wildcard")
            export AF_MOCK_FAILURE_RATE="0.05"
            export AF_MOCK_LATENCY_MULT="10.0"
            export AF_MOCK_CHAOS_MODE="1"
            ;;
    esac

    for iter in "${ITERS[@]}"; do
        RID=$(uuidgen | tr '[:upper:]' '[:lower:]')
        echo "  -> Launching ${iter} iterations (RUN_ID: $RID)..."

        # Save mapping
        echo "$scenario $iter $RID" >> .goalie/swarm_exp/scenarios/ids.txt

        # Run serially to ensure telemetry isn't overlap-distorted for capacity metrics
        ./af prod-swarm \
            --mode normal \
            --variant-a-iters "$iter" \
            > ".goalie/swarm_exp/scenarios/${scenario}_${iter}.log" 2>&1
        
        echo "  -> Finished ${iter} iterations for $scenario (exit code: $?)"
    done
done

echo "Swarm Execution Complete."
echo "Analyze with 'python3 analyze_swarm_results.py --scenarios'"
