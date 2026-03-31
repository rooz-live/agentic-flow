#!/bin/bash
# Spawn 10 Swarms of AF Prod-Cycle to Improve Production Maturity
# Each swarm runs in parallel with different circles and depths

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/.goalie/swarm_logs"

# Create log directory
mkdir -p "$LOG_DIR"

echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║           Spawning 10 Prod-Cycle Swarms                          ║"
echo "║           Improving Production Maturity                           ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# Define swarm configurations (circle, iterations, depth)
declare -a SWARMS=(
    "orchestrator:5:2"
    "analyst:5:2"
    "innovator:5:3"
    "assessor:5:2"
    "intuitive:3:1"
    "seeker:3:1"
    "testing:8:2"
    "orchestrator:3:3"
    "analyst:4:2"
    "innovator:4:2"
)

# Spawn swarms in background
PIDS=()
START_TIME=$(date +%s)

for i in "${!SWARMS[@]}"; do
    IFS=':' read -r circle iterations depth <<< "${SWARMS[$i]}"
    swarm_id=$((i + 1))
    log_file="$LOG_DIR/swarm_${swarm_id}_${circle}.log"
    
    echo "🚀 Swarm $swarm_id: circle=$circle, iterations=$iterations, depth=$depth"
    
    # Run prod-cycle in background
    (
        echo "=== Swarm $swarm_id Started at $(date) ===" > "$log_file"
        AF_PROD_CYCLE_MODE=mutate python3 "$SCRIPT_DIR/cmd_prod_cycle_enhanced.py" \
            --iterations "$iterations" \
            --circle "$circle" \
            --depth "$depth" \
            --no-replenish \
            >> "$log_file" 2>&1
        exit_code=$?
        echo "=== Swarm $swarm_id Finished at $(date) with exit code $exit_code ===" >> "$log_file"
        exit $exit_code
    ) &
    
    PIDS+=($!)
    
    # Stagger starts slightly to avoid resource contention
    sleep 0.5
done

echo ""
echo "✅ All 10 swarms spawned!"
echo ""
echo "Swarm PIDs: ${PIDS[*]}"
echo "Logs: $LOG_DIR/swarm_*.log"
echo ""
echo "Waiting for swarms to complete..."
echo ""

# Wait for all swarms and track results
SUCCESS_COUNT=0
FAILURE_COUNT=0
EARLY_STOP_COUNT=0

for i in "${!PIDS[@]}"; do
    pid=${PIDS[$i]}
    swarm_id=$((i + 1))
    IFS=':' read -r circle iterations depth <<< "${SWARMS[$i]}"
    
    if wait "$pid"; then
        echo "✅ Swarm $swarm_id ($circle) completed successfully"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        exit_code=$?
        echo "⚠️  Swarm $swarm_id ($circle) exited with code $exit_code"
        FAILURE_COUNT=$((FAILURE_COUNT + 1))
    fi
    
    # Check for early stops in log
    log_file="$LOG_DIR/swarm_${swarm_id}_${circle}.log"
    if grep -q "Early stop" "$log_file" 2>/dev/null; then
        EARLY_STOP_COUNT=$((EARLY_STOP_COUNT + 1))
    fi
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                    Swarm Results Summary                          ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""
echo "Duration: ${DURATION}s"
echo "Success: $SUCCESS_COUNT/10"
echo "Failures: $FAILURE_COUNT/10"
echo "Early Stops: $EARLY_STOP_COUNT/10"
echo ""
echo "Logs available at: $LOG_DIR/"
echo ""

# Analyze results
echo "Analyzing pattern metrics..."
if [ -f "$PROJECT_ROOT/.goalie/pattern_metrics.jsonl" ]; then
    TOTAL_EVENTS=$(wc -l < "$PROJECT_ROOT/.goalie/pattern_metrics.jsonl")
    GUARDRAIL_EVENTS=$(grep -c "guardrail" "$PROJECT_ROOT/.goalie/pattern_metrics.jsonl" || echo "0")
    BUDGET_EVENTS=$(grep -c "iteration_budget" "$PROJECT_ROOT/.goalie/pattern_metrics.jsonl" || echo "0")
    
    echo "📊 Pattern Metrics:"
    echo "   Total Events: $TOTAL_EVENTS"
    echo "   Guardrail Events: $GUARDRAIL_EVENTS"
    echo "   Budget Events: $BUDGET_EVENTS"
    echo ""
fi

# Generate swarm report
REPORT_FILE="$LOG_DIR/swarm_report_$(date +%Y%m%d_%H%M%S).txt"
{
    echo "Swarm Execution Report"
    echo "======================"
    echo ""
    echo "Execution Time: $(date)"
    echo "Duration: ${DURATION}s"
    echo "Success Rate: $SUCCESS_COUNT/10 ($(( SUCCESS_COUNT * 10 ))%)"
    echo ""
    echo "Swarm Details:"
    for i in "${!SWARMS[@]}"; do
        swarm_id=$((i + 1))
        IFS=':' read -r circle iterations depth <<< "${SWARMS[$i]}"
        echo "  Swarm $swarm_id: $circle (${iterations} iterations, depth ${depth})"
    done
    echo ""
    echo "Log Files:"
    ls -lh "$LOG_DIR"/swarm_*.log | tail -10
} > "$REPORT_FILE"

echo "📄 Full report: $REPORT_FILE"
echo ""
echo "🎉 Swarm execution complete!"
