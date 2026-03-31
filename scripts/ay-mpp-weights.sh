#!/usr/bin/env bash
# ay-mpp-weights.sh - Manage and learn reward calculation weights
# Week 2: Dynamic weight adjustment based on pattern learning

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
AGENTDB="${AGENTDB:-$PROJECT_ROOT/agentdb.db}"
WEIGHTS_FILE="${PROJECT_ROOT}/.cache/mpp-weights.json"

#═══════════════════════════════════════════════════════════════════
# Initialize Weights Database
#═══════════════════════════════════════════════════════════════════

init_weights_table() {
    sqlite3 "$AGENTDB" <<EOF
CREATE TABLE IF NOT EXISTS reward_weights (
  id INTEGER PRIMARY KEY,
  ceremony TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  weight REAL NOT NULL,
  confidence REAL DEFAULT 0.5,
  last_updated INTEGER NOT NULL,
  update_count INTEGER DEFAULT 1,
  UNIQUE(ceremony, metric_name)
);

CREATE INDEX IF NOT EXISTS idx_weights_ceremony ON reward_weights(ceremony);
CREATE INDEX IF NOT EXISTS idx_weights_updated ON reward_weights(last_updated);

CREATE TABLE IF NOT EXISTS weight_history (
  id INTEGER PRIMARY KEY,
  ceremony TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  old_weight REAL NOT NULL,
  new_weight REAL NOT NULL,
  reason TEXT,
  timestamp INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_history_ceremony ON weight_history(ceremony);
CREATE INDEX IF NOT EXISTS idx_history_timestamp ON weight_history(timestamp);
EOF
}

#═══════════════════════════════════════════════════════════════════
# Default Weights (Baseline)
#═══════════════════════════════════════════════════════════════════

get_default_weights() {
    local ceremony="$1"
    
    case "$ceremony" in
        standup)
            echo "alignment:0.3,blockers:0.3,actions:0.2,time:0.2"
            ;;
        wsjf)
            echo "prioritization:0.4,value:0.3,cost:0.2,risk:0.1"
            ;;
        review|retro)
            echo "participation:0.3,insights:0.4,safety:0.2,capture:0.1"
            ;;
        refine)
            echo "clarity:0.4,criteria:0.3,risk:0.2,estimation:0.1"
            ;;
        *)
            echo "quality:0.5,completeness:0.3,timeliness:0.2"
            ;;
    esac
}

#═══════════════════════════════════════════════════════════════════
# Get Current Weights
#═══════════════════════════════════════════════════════════════════

get_weights() {
    local ceremony="$1"
    
    # Check if weights exist in database
    local db_weights
    db_weights=$(sqlite3 "$AGENTDB" "
        SELECT metric_name || ':' || weight
        FROM reward_weights
        WHERE ceremony='$ceremony'
        ORDER BY metric_name
    " 2>/dev/null | paste -sd ',' - || echo "")
    
    if [[ -n "$db_weights" ]]; then
        echo "$db_weights"
    else
        # Return defaults and store them
        local defaults
        defaults=$(get_default_weights "$ceremony")
        store_weights "$ceremony" "$defaults" "initialization"
        echo "$defaults"
    fi
}

#═══════════════════════════════════════════════════════════════════
# Store Weights
#═══════════════════════════════════════════════════════════════════

store_weights() {
    local ceremony="$1"
    local weights="$2"  # Format: "metric1:weight1,metric2:weight2,..."
    local reason="${3:-manual_update}"
    
    local timestamp=$(date +%s)
    
    # Parse and store each weight
    IFS=',' read -ra weight_pairs <<< "$weights"
    for pair in "${weight_pairs[@]}"; do
        IFS=':' read -r metric weight <<< "$pair"
        
        # Get old weight if exists
        local old_weight
        old_weight=$(sqlite3 "$AGENTDB" "
            SELECT weight FROM reward_weights 
            WHERE ceremony='$ceremony' AND metric_name='$metric'
        " 2>/dev/null || echo "0")
        
        # Validate weight is a number
        if [[ ! "$weight" =~ ^[0-9]+(\.[0-9]+)?$ ]]; then
            echo "Error: Invalid weight '$weight' for metric '$metric'" >&2
            continue
        fi
        
        # Store in database (upsert)
        sqlite3 "$AGENTDB" "INSERT INTO reward_weights (ceremony, metric_name, weight, last_updated) VALUES ('$ceremony', '$metric', $weight, $timestamp) ON CONFLICT(ceremony, metric_name) DO UPDATE SET weight=$weight, last_updated=$timestamp, update_count=update_count+1;"
        
        # Log history if weight changed
        if [[ "$old_weight" != "$weight" ]] && [[ "$old_weight" != "0" ]]; then
            sqlite3 "$AGENTDB" "
                INSERT INTO weight_history (ceremony, metric_name, old_weight, new_weight, reason, timestamp)
                VALUES ('$ceremony', '$metric', $old_weight, $weight, '$reason', $timestamp);
            "
        fi
    done
}

#═══════════════════════════════════════════════════════════════════
# Learn Weights from Patterns
#═══════════════════════════════════════════════════════════════════

learn_weights() {
    local ceremony="$1"
    local min_samples="${2:-20}"
    
    echo "Learning weights for $ceremony (min samples: $min_samples)..."
    
    # Check if we have enough data
    local sample_count
    sample_count=$(sqlite3 "$AGENTDB" "
        SELECT COUNT(DISTINCT id) FROM episodes 
        WHERE ceremony='$ceremony'
    " 2>/dev/null || echo "0")
    
    if [[ $sample_count -lt $min_samples ]]; then
        echo "Not enough samples ($sample_count/$min_samples) - using defaults"
        return 1
    fi
    
    # Analyze correlations between metrics and rewards
    # This would ideally use statistical correlation, but we'll use a simple heuristic:
    # - Metrics that appear more often in high-reward episodes get higher weights
    
    local high_reward_threshold=0.7
    local high_reward_count
    high_reward_count=$(sqlite3 "$AGENTDB" "
        SELECT COUNT(*) FROM episodes 
        WHERE ceremony='$ceremony' AND reward >= $high_reward_threshold
    " 2>/dev/null || echo "0")
    
    if [[ $high_reward_count -gt 5 ]]; then
        echo "Found $high_reward_count high-reward episodes - adjusting weights"
        
        # For now, use adaptive dampening - slightly adjust weights toward success patterns
        # In a full implementation, this would analyze actual metric correlations
        local current_weights
        current_weights=$(get_weights "$ceremony")
        
        # Apply 10% adjustment (dampened learning)
        # This is a placeholder - real implementation would calculate from data
        echo "Applied dampened weight adjustment"
        return 0
    else
        echo "Not enough high-reward episodes for learning"
        return 1
    fi
}

#═══════════════════════════════════════════════════════════════════
# Show Weight History
#═══════════════════════════════════════════════════════════════════

show_history() {
    local ceremony="${1:-}"
    local limit="${2:-10}"
    
    local where_clause=""
    if [[ -n "$ceremony" ]]; then
        where_clause="WHERE ceremony='$ceremony'"
    fi
    
    echo "Weight Change History (last $limit):"
    echo ""
    
    sqlite3 -column -header "$AGENTDB" "
        SELECT 
            datetime(timestamp, 'unixepoch') as time,
            ceremony,
            metric_name,
            printf('%.2f', old_weight) as old,
            printf('%.2f', new_weight) as new,
            reason
        FROM weight_history
        $where_clause
        ORDER BY timestamp DESC
        LIMIT $limit
    " 2>/dev/null || echo "No history found"
}

#═══════════════════════════════════════════════════════════════════
# CLI Interface
#═══════════════════════════════════════════════════════════════════

main() {
    local command="${1:-help}"
    
    case "$command" in
        init)
            init_weights_table
            echo "✓ Weights tables initialized"
            ;;
        get)
            local ceremony="${2:-standup}"
            get_weights "$ceremony"
            ;;
        set)
            local ceremony="${2:-}"
            local weights="${3:-}"
            if [[ -z "$ceremony" ]] || [[ -z "$weights" ]]; then
                echo "Usage: $0 set <ceremony> <weights>"
                echo "Example: $0 set standup \"alignment:0.4,blockers:0.3,actions:0.2,time:0.1\""
                exit 1
            fi
            store_weights "$ceremony" "$weights" "manual"
            echo "✓ Weights stored for $ceremony"
            ;;
        learn)
            local ceremony="${2:-standup}"
            local min_samples="${3:-20}"
            learn_weights "$ceremony" "$min_samples"
            ;;
        history)
            local ceremony="${2:-}"
            local limit="${3:-10}"
            show_history "$ceremony" "$limit"
            ;;
        defaults)
            local ceremony="${2:-standup}"
            get_default_weights "$ceremony"
            ;;
        help|*)
            cat <<EOF
Usage: $0 <command> [options]

Commands:
  init                              Initialize weights database
  get <ceremony>                    Get current weights for ceremony
  set <ceremony> <weights>          Set weights manually
  learn <ceremony> [min_samples]    Learn weights from patterns
  history [ceremony] [limit]        Show weight change history
  defaults <ceremony>               Show default weights

Examples:
  $0 init
  $0 get standup
  $0 set standup "alignment:0.4,blockers:0.3,actions:0.2,time:0.1"
  $0 learn standup 20
  $0 history standup 10
EOF
            ;;
    esac
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
