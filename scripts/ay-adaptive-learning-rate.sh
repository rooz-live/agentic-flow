#!/usr/bin/env bash
# scripts/ay-adaptive-learning-rate.sh
# Adaptive learning rate based on convergence metrics and reward variance

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ═══════════════════════════════════════════════════════════════════════════
# Calculate Adaptive Learning Rate
# ═══════════════════════════════════════════════════════════════════════════

calculate_learning_rate() {
    local circle="$1"
    local ceremony="$2"
    local base_lr="${3:-0.01}"
    
    local agentdb_path="$PROJECT_ROOT/agentdb.db"
    
    if [[ ! -f "$agentdb_path" ]]; then
        echo "$base_lr"
        return
    fi
    
    # Get reward variance from recent episodes
    local stats=$(sqlite3 "$agentdb_path" <<SQL
SELECT 
    AVG(reward) as mean_reward,
    COUNT(*) as episode_count,
    (MAX(reward) - MIN(reward)) as reward_range
FROM (
    SELECT reward 
    FROM episodes
    WHERE circle = '$circle' AND ceremony = '$ceremony'
    ORDER BY ts DESC
    LIMIT 20
);
SQL
)
    
    local mean_reward=$(echo "$stats" | cut -d'|' -f1)
    local episode_count=$(echo "$stats" | cut -d'|' -f2)
    local reward_range=$(echo "$stats" | cut -d'|' -f3)
    
    if [[ -z "$mean_reward" ]] || [[ "$episode_count" -lt 10 ]]; then
        # Insufficient data: use high exploration rate
        echo "scale=6; $base_lr * 2.0" | bc
        return
    fi
    
    # Calculate coefficient of variation
    local cv=$(echo "scale=4; $reward_range / $mean_reward" | bc 2>/dev/null || echo "1.0")
    
    # Adaptive strategy:
    # - High variance (cv > 0.3): increase learning rate for faster adaptation
    # - Low variance (cv < 0.1): decrease learning rate for fine-tuning
    # - Medium variance: use base rate
    
    local adaptive_lr
    if (( $(echo "$cv > 0.3" | bc -l) )); then
        # High variance: increase learning rate
        adaptive_lr=$(echo "scale=6; $base_lr * (1.5 + $cv)" | bc)
    elif (( $(echo "$cv < 0.1" | bc -l) )); then
        # Low variance (converging): decrease learning rate
        adaptive_lr=$(echo "scale=6; $base_lr * 0.5" | bc)
    else
        # Medium variance: use base rate with slight adjustment
        adaptive_lr=$(echo "scale=6; $base_lr * (1.0 + $cv * 0.5)" | bc)
    fi
    
    # Clamp to reasonable bounds [0.001, 0.1]
    if (( $(echo "$adaptive_lr > 0.1" | bc -l) )); then
        adaptive_lr="0.1"
    elif (( $(echo "$adaptive_lr < 0.001" | bc -l) )); then
        adaptive_lr="0.001"
    fi
    
    echo "$adaptive_lr"
}

# ═══════════════════════════════════════════════════════════════════════════
# Get Learning Rate Schedule
# ═══════════════════════════════════════════════════════════════════════════

get_learning_schedule() {
    local circle="$1"
    local ceremony="$2"
    local total_episodes="${3:-100}"
    
    local current_lr=$(calculate_learning_rate "$circle" "$ceremony" 0.01)
    local decay_rate="0.95"
    
    echo "current_lr=$current_lr|decay_rate=$decay_rate|schedule=exponential"
}

main() {
    local command="${1:-calculate}"
    shift || true
    
    case "$command" in
        calculate)
            calculate_learning_rate "$@"
            ;;
        schedule)
            get_learning_schedule "$@"
            ;;
        *)
            cat <<EOF
Usage: $0 <command> [options]

Commands:
  calculate <circle> <ceremony> [base_lr]
  schedule <circle> <ceremony> [total_episodes]

Examples:
  $0 calculate orchestrator standup 0.01
  $0 schedule orchestrator standup 100
EOF
            ;;
    esac
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
