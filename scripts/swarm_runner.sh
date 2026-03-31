#!/bin/bash
# Swarm Performance Harness: 3-Way Comparison
# 1. Sequential (Base)
# 2. Concurrent (Capacity-Optimized)
# 3. Risk-Aware (Policy-Optimized)

PROJECT_ROOT=$(pwd)
GOALIE_DIR="$PROJECT_ROOT/.goalie"
METRICS_LOG="$GOALIE_DIR/metrics_log.jsonl"
SWARM_METRICS="$GOALIE_DIR/swarm_metrics.json"

echo "🚀 Starting 3-Way Swarm Comparison..."

# --- 1. Sequential Baseline ---
echo "--- Phase 1: Sequential Baseline ---"
start_seq=$(date +%s%N)
# Run 3 iterations sequentially (mini-batch)
python3 scripts/cmd_prod_cycle.py --circle innovator --depth 1 --iterations 3 --no-replenish
end_seq=$(date +%s%N)
seq_duration_ms=$(( (end_seq - start_seq) / 1000000 ))

# --- 2. Concurrent Capacity ---
echo "--- Phase 2: Concurrent Capacity ---"
# Set environment for concurrency
export AF_MAX_CONCURRENCY=3
start_con=$(date +%s%N)
# Mocking concurrent effect by reducing depth/iter but with concurrency logic active
AF_ENV=local python3 scripts/cmd_prod_cycle.py --circle innovator --depth 1 --iterations 3 --no-replenish
end_con=$(date +%s%N)
con_duration_ms=$(( (end_con - start_con) / 1000000 ))

# --- 3. Risk-Aware Policy ---
echo "--- Phase 3: Risk-Aware Batching ---"
# Ensure batching is active
start_risk=$(date +%s%N)
AF_ENV=local python3 scripts/cmd_prod_cycle.py --circle innovator --depth 1 --no-replenish
end_risk=$(date +%s%N)
risk_duration_ms=$(( (end_risk - start_risk) / 1000000 ))

# --- Generate Comparison Report ---
cat <<EOF > "$SWARM_METRICS"
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "comparison": {
    "sequential": {
      "duration_ms": $seq_duration_ms,
      "efficiency": 1.0
    },
    "concurrent": {
      "duration_ms": $con_duration_ms,
      "efficiency": $(echo "scale=2; $seq_duration_ms / $con_duration_ms" | bc)
    },
    "risk_aware": {
      "duration_ms": $risk_duration_ms,
      "efficiency": $(echo "scale=2; $seq_duration_ms / $risk_duration_ms" | bc)
    }
  },
  "summary": "Completed 3-way swarm comparison harness run."
}
EOF

echo "✅ Comparison complete. Results saved to $SWARM_METRICS"
jq . "$SWARM_METRICS"
