#!/usr/bin/env bash
# Pattern telemetry logging helper
# Production Cycle 42 - ensures required fields per pattern

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PATTERN_LOG="${PATTERN_LOG:-$REPO_ROOT/.goalie/pattern_metrics.jsonl}"

# Required fields by pattern
declare -A PATTERN_FIELDS=(
    [safe_degrade]="triggers,actions,recovery_cycles"
    [circle_risk_focus]="top_owner,extra_iterations,roam_reduction"
    [guardrail_lock]="enforced,health_state,user_requests"
    [iteration_budget]="requested,enforced,autocommit_runs"
    [observability_first]="metrics_written,missing_signals,suggestion_made"
)

log_pattern_event() {
    local pattern="$1"
    local payload="$2"  # JSON string with data fields
    
    # Validate pattern is recognized
    if [[ ! -v PATTERN_FIELDS[$pattern] ]]; then
        echo "[WARN] Unknown pattern: $pattern - logging anyway" >&2
    fi

    # Duration semantics:
    # - If caller provides duration_ms, treat it as measured.
    # - Otherwise, default to 1ms and mark as not measured.
    payload=$(echo "$payload" | jq -c 'if has("duration_ms") then . + {duration_measured:true} else . + {duration_ms:1, duration_measured:false} end')
    
    # Generate base event
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    local run_id="${AF_RUN_ID:-$(uuidgen | tr '[:upper:]' '[:lower:]')}"
    local correlation_id="${AF_CORRELATION_ID:-$(uuidgen | tr '[:upper:]' '[:lower:]')}"
    local circle="${AF_CIRCLE:-unknown}"
    local depth="${AF_DEPTH:-0}"
    local mode="${AF_PROD_CYCLE_MODE:-advisory}"
    
    # Validate required fields if pattern is known
    if [[ -v PATTERN_FIELDS[$pattern] ]]; then
        IFS=',' read -ra required <<< "${PATTERN_FIELDS[$pattern]}"
        local missing=()
        
        for field in "${required[@]}"; do
            if ! echo "$payload" | jq -e ".${field}" > /dev/null 2>&1; then
                missing+=("$field")
            fi
        done
        
        if [ ${#missing[@]} -gt 0 ]; then
            echo "[WARN] Pattern '$pattern' missing required fields: ${missing[*]}" >&2
            echo "[WARN] Event will be logged but may fail coverage checks" >&2
        fi
    fi
    
    # Build full event (compact JSON on one line)
    jq -nc \
        --arg ts "$timestamp" \
        --arg run "$run_id" \
        --arg corr "$correlation_id" \
        --arg pattern "$pattern" \
        --arg circle "$circle" \
        --argjson depth "$depth" \
        --arg mode "$mode" \
        --argjson data "$payload" \
        '{timestamp:$ts,run_id:$run,correlation_id:$corr,pattern:$pattern,circle:$circle,depth:$depth,mode:$mode,data:$data}' \
        >> "$PATTERN_LOG"
}

# Export for use in other scripts
export -f log_pattern_event

# Allow direct invocation
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    if [ $# -lt 2 ]; then
        echo "Usage: $0 PATTERN PAYLOAD_JSON" >&2
        echo "" >&2
        echo "Example:" >&2
        echo '  $0 safe_degrade '"'"'{"triggers":1,"actions":"degrade_to_read_only","recovery_cycles":0}'"'"'' >&2
        echo "" >&2
        echo "Required fields by pattern:" >&2
        for pat in "${!PATTERN_FIELDS[@]}"; do
            echo "  $pat: ${PATTERN_FIELDS[$pat]}" >&2
        done
        exit 1
    fi
    
    log_pattern_event "$1" "$2"
fi
