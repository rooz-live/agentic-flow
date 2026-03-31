#!/usr/bin/env bash
# scripts/ay-ceremony-order-optimizer.sh
# Dynamic ceremony execution order based on AgentDB causal patterns

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# ═══════════════════════════════════════════════════════════════════════════
# Query AgentDB for Optimal Ceremony Order
# ═══════════════════════════════════════════════════════════════════════════

get_ceremony_order() {
    local circle="$1"
    local context="${2:-}"
    
    # Query AgentDB for ceremony effectiveness patterns
    local db_path="$PROJECT_ROOT/agentdb.db"
    
    if [[ ! -f "$db_path" ]]; then
        echo "standup wsjf review retro refine replenish synthesis"
        return
    fi
    
    # Get ceremony performance metrics from episodes
    local ceremony_scores=$(sqlite3 "$db_path" <<SQL
SELECT 
    ceremony,
    AVG(reward) as avg_reward,
    COUNT(*) as episode_count,
    MAX(ts) as last_execution
FROM episodes
WHERE circle = '$circle'
GROUP BY ceremony
ORDER BY avg_reward DESC, last_execution ASC;
SQL
)
    
    if [[ -z "$ceremony_scores" ]]; then
        # No historical data - use default order
        echo "standup wsjf review retro refine replenish synthesis"
        return
    fi
    
    # Extract ordered ceremonies
    local ordered_ceremonies=$(echo "$ceremony_scores" | cut -d'|' -f1 | tr '\n' ' ')
    
    # Ensure all standard ceremonies are included (fallback for new ones)
    local all_ceremonies="standup wsjf review retro refine replenish synthesis"
    local final_order=""
    
    # Add high-performing ceremonies first
    for ceremony in $ordered_ceremonies; do
        final_order="$final_order $ceremony"
    done
    
    # Add missing ceremonies at the end
    for ceremony in $all_ceremonies; do
        if ! echo "$final_order" | grep -q "$ceremony"; then
            final_order="$final_order $ceremony"
        fi
    done
    
    echo "$final_order" | xargs
}

# ═══════════════════════════════════════════════════════════════════════════
# Query AgentDB Causal Edges for Ceremony Dependencies
# ═══════════════════════════════════════════════════════════════════════════

get_ceremony_dependencies() {
    local circle="$1"
    local ceremony="$2"
    
    # Query causal edges to find prerequisites
    if command -v npx >/dev/null 2>&1; then
        npx agentdb causal query "$circle::$ceremony" --min-confidence 0.7 2>/dev/null | \
            jq -r '.[].treatment' 2>/dev/null || echo ""
    else
        echo ""
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# Context-Based Ceremony Selection
# ═══════════════════════════════════════════════════════════════════════════

select_ceremonies_for_context() {
    local circle="$1"
    local context="$2"  # e.g., "high_load", "learning_mode", "production"
    
    case "$context" in
        high_load)
            # Skip expensive ceremonies under high load
            echo "standup review"
            ;;
        learning_mode)
            # Include all ceremonies for maximum learning
            echo "standup wsjf review retro refine replenish synthesis"
            ;;
        production)
            # Focus on high-value ceremonies
            get_ceremony_order "$circle" | head -n 5 | tr '\n' ' '
            ;;
        quick)
            # Minimal set for rapid iteration
            echo "standup review"
            ;;
        *)
            # Default: all ceremonies in optimal order
            get_ceremony_order "$circle"
            ;;
    esac
}

# ═══════════════════════════════════════════════════════════════════════════
# Multi-Circle Load Balancing
# ═══════════════════════════════════════════════════════════════════════════

get_circle_load_scores() {
    local db_path="$PROJECT_ROOT/agentdb.db"
    
    if [[ ! -f "$db_path" ]]; then
        echo "orchestrator|0|0"
        echo "assessor|0|0"
        echo "analyst|0|0"
        return
    fi
    
    # Get episode counts and recent activity per circle
    sqlite3 "$db_path" <<SQL
SELECT 
    circle,
    COUNT(*) as total_episodes,
    SUM(CASE WHEN datetime(timestamp) > datetime('now', '-1 hour') THEN 1 ELSE 0 END) as recent_episodes
FROM episodes
GROUP BY circle
ORDER BY recent_episodes ASC, total_episodes ASC;
SQL
}

select_least_loaded_circle() {
    local load_scores=$(get_circle_load_scores)
    
    if [[ -z "$load_scores" ]]; then
        echo "orchestrator"
        return
    fi
    
    # Return circle with lowest recent activity
    echo "$load_scores" | head -1 | cut -d'|' -f1
}

# ═══════════════════════════════════════════════════════════════════════════
# System Load Detection
# ═══════════════════════════════════════════════════════════════════════════

get_system_load() {
    # Get 1-minute load average
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sysctl -n vm.loadavg | awk '{print $2}'
    else
        uptime | awk -F'load average:' '{print $2}' | awk -F',' '{print $1}' | xargs
    fi
}

get_cpu_count() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sysctl -n hw.ncpu
    else
        nproc
    fi
}

determine_context_from_load() {
    local load=$(get_system_load)
    local cpus=$(get_cpu_count)
    
    # Calculate load per CPU
    local load_per_cpu=$(echo "scale=2; $load / $cpus" | bc)
    
    if (( $(echo "$load_per_cpu > 0.8" | bc -l) )); then
        echo "high_load"
    elif (( $(echo "$load_per_cpu < 0.3" | bc -l) )); then
        echo "production"
    else
        echo "learning_mode"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# CLI Interface
# ═══════════════════════════════════════════════════════════════════════════

main() {
    local command="${1:-order}"
    shift || true
    
    case "$command" in
        order)
            local circle="${1:-orchestrator}"
            local context="${2:-}"
            get_ceremony_order "$circle" "$context"
            ;;
        select)
            local circle="${1:-orchestrator}"
            local context="${2:-auto}"
            
            if [[ "$context" == "auto" ]]; then
                context=$(determine_context_from_load)
            fi
            
            select_ceremonies_for_context "$circle" "$context"
            ;;
        dependencies)
            local circle="${1:-orchestrator}"
            local ceremony="${2:-standup}"
            get_ceremony_dependencies "$circle" "$ceremony"
            ;;
        load-balance)
            select_least_loaded_circle
            ;;
        context)
            determine_context_from_load
            ;;
        *)
            cat <<EOF
Usage: $0 <command> [options]

Commands:
  order <circle> [context]           Get optimal ceremony order for circle
  select <circle> [context]          Select ceremonies based on context
  dependencies <circle> <ceremony>   Get ceremony dependencies
  load-balance                       Select least loaded circle
  context                            Determine context from system load

Contexts:
  high_load      - Minimal ceremonies (standup, review)
  learning_mode  - All ceremonies for maximum learning
  production     - High-value ceremonies only
  quick          - Rapid iteration (standup, review)
  auto           - Determined from system load

Examples:
  $0 order orchestrator
  $0 select orchestrator auto
  $0 dependencies orchestrator standup
  $0 load-balance
  $0 context
EOF
            ;;
    esac
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
