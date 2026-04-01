#!/bin/bash
# robust-quality.sh - ROBUST Quality Assurance System
# Provides reliable variable passing and quality tracking across GitHub Actions

set -euo pipefail

# Configuration
QUALITY_STATE_FILE="/tmp/robust-quality-state.json"
QUALITY_EXPORT_FILE="/tmp/robust-quality-export.txt"

# Initialize quality tracking
init_quality_tracking() {
    local job_id="${1:-$(date +%s)}"
    local run_id="${GITHUB_RUN_ID:-local}"

    # CSQBM Governance Constraint: Contextualize GitHub Action quality states
    local local_proj_root="$(cd "$(dirname "$(dirname "$(dirname "${BASH_SOURCE[0]}")")")" && pwd)"
    [ -f "$local_proj_root/scripts/validation-core.sh" ] && source "$local_proj_root/scripts/validation-core.sh" || true

    # Create state file
    cat > "$QUALITY_STATE_FILE" << EOF
{
  "job_id": "$job_id",
  "run_id": "$run_id",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "metrics": {},
  "components": {},
  "quality_score": 0,
  "status": "initialized"
}
EOF

    echo "Quality tracking initialized: $job_id"
}

# Collect quality metrics with guaranteed output
collect_quality_metrics() {
    local script_name="${1:-cascade-tunnel}"
    local exit_code="${2:-0}"

    # Ensure state file exists
    [[ ! -f "$QUALITY_STATE_FILE" ]] && init_quality_tracking

    # Calculate quality score
    local quality_score=0
    local components=()

    # Check each ROBUST component
    local script_path="/Users/shahroozbhopti/Documents/code/investing/agentic-flow/scripts/orchestrators/$script_name.sh"

    if [[ -f "$script_path" ]]; then
        # Pre-flight checks
        if grep -q "check_prerequisites" "$script_path"; then
            quality_score=$((quality_score + 20))
            components+=("pre_flight:20")
        else
            components+=("pre_flight:0")
        fi

        # Bounded reasoning
        if grep -q "create_contract" "$script_path"; then
            quality_score=$((quality_score + 20))
            components+=("bounded_reasoning:20")
        else
            components+=("bounded_reasoning:0")
        fi

        # ETA tracking
        if grep -q "update_progress" "$script_path"; then
            quality_score=$((quality_score + 20))
            components+=("eta_tracking:20")
        else
            components+=("eta_tracking:0")
        fi

        # TDD logging
        if grep -q "log_tdd" "$script_path"; then
            quality_score=$((quality_score + 20))
            components+=("tdd_logging:20")
        else
            components+=("tdd_logging:0")
        fi

        # Process cleanup
        if grep -q "wait.*PID" "$script_path"; then
            quality_score=$((quality_score + 20))
            components+=("process_cleanup:20")
        else
            components+=("process_cleanup:0")
        fi
    fi

    # Base success score
    if [[ $exit_code -eq 0 ]]; then
        quality_score=$((quality_score + 20))
    fi

    local comp_json="[]"
    if [[ ${#components[@]} -gt 0 ]]; then
        comp_json="$(jo -a "${components[@]}")"
    fi

    # Update state
    local temp_file=$(mktemp)
    jq \
        --arg score "$quality_score" \
        --arg status "$(if [[ $exit_code -eq 0 ]]; then echo "passed"; else echo "failed"; fi)" \
        --argjson components "$comp_json" \
        '.quality_score = ($score | tonumber) |
         .status = $status |
         .components = $components |
         .metrics.script_name = $script_name |
         .metrics.exit_code = $exit_code |
         .metrics.collected_at = now' \
        "$QUALITY_STATE_FILE" > "$temp_file"
    mv "$temp_file" "$QUALITY_STATE_FILE"

    # CRITICAL: Output in multiple formats for maximum compatibility

    # 1. GitHub Actions output (most reliable)
    if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
        echo "robust_quality=$quality_score" >> "$GITHUB_OUTPUT"
        echo "robust_status=$(if [[ $exit_code -eq 0 ]]; then echo "passed"; else echo "failed"; fi)" >> "$GITHUB_OUTPUT"
        echo "robust_components=$(jo -a "${components[@]}")" >> "$GITHUB_OUTPUT"
    fi

    # 2. Environment file for next steps
    cat > "$QUALITY_EXPORT_FILE" << EOF
ROBUST_QUALITY=$quality_score
ROBUST_STATUS=$(if [[ $exit_code -eq 0 ]]; then echo "passed"; else echo "failed"; fi)
ROBUST_COMPONENTS=$(jo -a "${components[@]}")
EOF

    # 3. Standard output for logging
    echo "ROBUST_QUALITY=$quality_score"
    echo "ROBUST_STATUS=$(if [[ $exit_code -eq 0 ]]; then echo "passed"; else echo "failed"; fi)"

    # 4. JSON file for complex queries
    echo "$quality_score" > "/tmp/robust_quality_score.txt"

    return 0
}

# Ensure quality variables are available
ensure_quality_vars() {
    local method="${1:-auto}"

    case "$method" in
        "github_output")
            # Try GitHub Actions output first
            if [[ -n "${GITHUB_OUTPUT:-}" ]] && [[ -n "${1:-}" ]]; then
                echo "Using GitHub Actions output"
                return 0
            fi
            ;;
        "export_file")
            # Fallback to export file
            if [[ -f "$QUALITY_EXPORT_FILE" ]]; then
                source "$QUALITY_EXPORT_FILE"
                echo "Loaded from export file"
                return 0
            fi
            ;;
        "state_file")
            # Fallback to state file
            if [[ -f "$QUALITY_STATE_FILE" ]]; then
                ROBUST_QUALITY=$(jq -r '.quality_score' "$QUALITY_STATE_FILE")
                ROBUST_STATUS=$(jq -r '.status' "$QUALITY_STATE_FILE")
                echo "Loaded from state file"
                return 0
            fi
            ;;
        "auto"|*)
            # Try all methods in order
            if [[ -n "${ROBUST_QUALITY:-}" ]]; then
                echo "Variables already in environment"
                return 0
            fi

            if [[ -f "$QUALITY_EXPORT_FILE" ]]; then
                source "$QUALITY_EXPORT_FILE"
                echo "Loaded from export file"
                return 0
            fi

            if [[ -f "/tmp/robust_quality_score.txt" ]]; then
                ROBUST_QUALITY=$(cat "/tmp/robust_quality_score.txt")
                echo "Loaded from score file"
                return 0
            fi

            echo "No quality variables found, using defaults"
            ROBUST_QUALITY=0
            ROBUST_STATUS="unknown"
            return 1
            ;;
    esac

    return 1
}

# Validate quality gate
validate_quality_gate() {
    local threshold="${1:-80}"
    local target="${2:-95}"

    # Ensure we have the variables
    ensure_quality_vars auto

    local quality="${ROBUST_QUALITY:-0}"
    local status="${ROBUST_STATUS:-unknown}"

    echo "Quality Gate Validation:"
    echo "  Current Quality: $quality%"
    echo "  Required Threshold: $threshold%"
    echo "  Target Quality: $target%"
    echo "  Status: $status"

    # Determine result
    if [[ $(echo "$quality >= $threshold" | bc -l) -eq 1 ]]; then
        echo "✅ QUALITY GATE PASSED"
        return 0
    else
        echo "❌ QUALITY GATE FAILED"
        echo "  Gap: $((threshold - quality))%"
        return 1
    fi
}

# Bounded execution wrapper with optional ETA hooks
# run_bounded "process_name" max_steps max_duration dependencies command [args...]
# Exit codes:
#   0 = success (quality gate passed)
#   1 = blocker/failure (command failed)
#   2 = completed with warnings (command ok, quality < threshold)
#   3 = dependencies missing / contract violation
run_bounded() {
    local process_name="$1"
    local max_steps="$2"
    local max_duration="$3"
    local dependencies="$4"
    shift 4
    local cmd=("$@")

    if [[ ${#cmd[@]} -eq 0 ]]; then
        echo "run_bounded: missing command for process '$process_name'" >&2
        return 3
    fi

    local process_id="${process_name}-$(date +%s)"
    local start_time
    start_time=$(date +%s)
    local step_count=0

    # Optional: bounded reasoning + ETA frameworks
    local have_contract=false
    if declare -F create_contract >/dev/null 2>&1 && \
       declare -F start_process >/dev/null 2>&1 && \
       declare -F complete_process >/dev/null 2>&1; then
        have_contract=true
    fi

    local have_hooks=false
    if declare -F emit_progress_update >/dev/null 2>&1 && \
       declare -F update_progress >/dev/null 2>&1; then
        have_hooks=true
    fi

    if $have_contract; then
        create_contract "$process_id" "$process_name" "$max_steps" "$max_duration" "$dependencies"
        start_process "$process_id"
    fi

    if $have_hooks; then
        emit_progress_update "$process_id" "INIT" "Starting $process_name" 0 "RUNNING"
        update_progress "$process_id" "Initializing $process_name" 0 "RUNNING"
    fi

    # Dependency checks (best-effort)
    if [[ -n "$dependencies" && "$dependencies" != "none" ]]; then
        if declare -F check_dependency >/dev/null 2>&1; then
            IFS=',' read -ra deps <<< "$dependencies"
            for dep in "${deps[@]}"; do
                step_count=$((step_count + 1))

                if $have_hooks; then
                    emit_progress_update "$process_id" "DEP_CHECK" "Checking dependency: $dep" $((step_count * 5)) "RUNNING"
                fi

                if ! check_dependency "$dep"; then
                    if $have_hooks; then
                        emit_progress_update "$process_id" "FAILED" "Missing dependency: $dep" 0 "FAILED"
                    fi
                    $have_contract && complete_process "$process_id" false
                    collect_quality_metrics "$process_name" 3
                    return 3
                fi

                local elapsed_dep=$(( $(date +%s) - start_time ))
                if (( elapsed_dep > max_duration )); then
                    if $have_hooks; then
                        emit_progress_update "$process_id" "TIMEOUT" "Dependency checks exceeded max duration" 0 "FAILED"
                    fi
                    $have_contract && complete_process "$process_id" false
                    collect_quality_metrics "$process_name" 124
                    return 124
                fi
            done
        fi
    fi

    # Run command under monitoring
    "${cmd[@]}" &
    local pid=$!
    local exit_code=0

    while kill -0 "$pid" 2>/dev/null; do
        step_count=$((step_count + 1))
        local now
        now=$(date +%s)
        local elapsed=$((now - start_time))

        local progress=$(( (step_count * 100) / max_steps ))
        (( progress > 95 )) && progress=95

        if $have_hooks; then
            emit_progress_update "$process_id" "RUNNING" "Step $step_count/$max_steps" "$progress" "RUNNING"
            update_progress "$process_id" "Executing $process_name step $step_count" "$progress" "RUNNING"
        fi

        if (( elapsed > max_duration )); then
            kill -TERM "$pid" 2>/dev/null || true
            wait "$pid" 2>/dev/null || true
            if $have_hooks; then
                emit_progress_update "$process_id" "TIMEOUT" "Process exceeded max duration" 0 "FAILED"
            fi
            $have_contract && complete_process "$process_id" false
            collect_quality_metrics "$process_name" 124
            return 124
        fi

        if (( step_count > max_steps )); then
            kill -TERM "$pid" 2>/dev/null || true
            wait "$pid" 2>/dev/null || true
            if $have_hooks; then
                emit_progress_update "$process_id" "LIMIT" "Exceeded step limit" 0 "FAILED"
            fi
            $have_contract && complete_process "$process_id" false
            collect_quality_metrics "$process_name" 125
            return 125
        fi

        sleep 2
    done

    wait "$pid" || exit_code=$?

    if $have_hooks; then
        if (( exit_code == 0 )); then
            emit_progress_update "$process_id" "SUCCESS" "$process_name completed successfully" 100 "COMPLETED"
            update_progress "$process_id" "$process_name completed successfully" 100 "COMPLETED"
        else
            emit_progress_update "$process_id" "FAILED" "$process_name failed with exit $exit_code" 0 "FAILED"
        fi
    fi

    $have_contract && complete_process "$process_id" $(( exit_code == 0 ))

    collect_quality_metrics "$process_name" "$exit_code"

    ensure_quality_vars auto
    local status="${ROBUST_STATUS:-unknown}"

    if (( exit_code != 0 )); then
        return 1
    fi

    if [[ "$status" != "passed" ]]; then
        return 2
    fi

    return 0
}

# Generate quality report
generate_quality_report() {
    ensure_quality_vars auto

    local quality="${ROBUST_QUALITY:-0}"
    local status="${ROBUST_STATUS:-unknown}"

    cat << EOF
# ROBUST Quality Report

## Summary
- **Quality Score**: ${quality}%
- **Status**: $status
- **Generated**: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

## Component Breakdown
EOF

    if [[ -f "$QUALITY_STATE_FILE" ]]; then
        jq -r '
            .components[] |
            split(":") as $comp |
            "- \($comp[0]): \($comp[1])%"
        ' "$QUALITY_STATE_FILE"
    fi

    echo ""
    echo "## Recommendations"

    if [[ $quality -lt 80 ]]; then
        echo "❌ Quality below threshold. Immediate action required."
    elif [[ $quality -lt 95 ]]; then
        echo "⚠️ Quality acceptable but below target. Consider improvements."
    else
        echo "✅ Excellent quality! Maintain current standards."
    fi
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    case "${1:-collect}" in
        "init")
            init_quality_tracking "$2"
            ;;
        "collect")
            collect_quality_metrics "$2" "${3:-0}"
            ;;
        "ensure")
            ensure_quality_vars "$2"
            ;;
        "validate")
            validate_quality_gate "${2:-80}" "${3:-95}"
            ;;
        "report")
            generate_quality_report
            ;;
        "export")
            ensure_quality_vars auto
            echo "ROBUST_QUALITY=${ROBUST_QUALITY:-0}"
            echo "ROBUST_STATUS=${ROBUST_STATUS:-unknown}"
            ;;
        *)
            echo "Usage: $0 {init|collect|ensure|validate|report|export}"
            echo ""
            echo "Examples:"
            echo "  $0 init                    # Initialize tracking"
            echo "  $0 collect cascade-tunnel 0 # Collect metrics"
            echo "  $0 validate 80 95          # Validate quality gate"
            echo "  $0 export                  # Export variables"
            exit 1
            ;;
    esac
fi
