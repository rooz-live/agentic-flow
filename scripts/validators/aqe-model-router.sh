#!/bin/bash
# aqe-model-router.sh
# Tri-Model Architecture Quality Enforcement (AQE) Router (v3.7.14 compliance)
# Usage: source aqe-model-router.sh && select_model "TASK_TYPE"

# Enforce the Tri-Model QE workflow:
# 1. Primary Analyst (Depth/Accuracy): Opus 4.6

# Reality-Binder for logic gap closure
_PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
[ -f "$_PROJECT_ROOT/scripts/validation-core.sh" ] && source "$_PROJECT_ROOT/scripts/validation-core.sh"
PRIMARY_MODEL="claude-3-opus-20240229"

# 2. Challenger/Reviewer (Severity Pushback/Verification): GLM-5
CHALLENGER_MODEL="0xSero/GLM-4.7-REAP-50-W4A16"

# 3. Filtered Alarm Communication (High FP Risk): Qwen 3.5 Plus
# RESTRICTED: Do not use for automated blocking decisions.
ALARM_MODEL="qwen-3.5-plus"

# 4. Local Darwin Gödel Machine (DGM) Synthesis & Max Scope Tasks: Gemma 4
# TARGETED HARDWARE: M3 Ultra (256GB RAM) natively running massive 262k token graphs without CI latency blocks.
GEMMA_COMPUTE_MODEL="gemma4-26b-q4-k-m"

# ADR-005 Governance: Dynamic Connectome Ceiling
export AQE_CONNECTOME_TOKEN_CEILING=$(compute_dynamic_token_ceiling 2>/dev/null || echo 4000)

select_model() {
    local task_type=$1
    local semantic_coverage=${2:-"-1"} # Optional arg: integer representing %. e.g., 90
    local selected_model=""

    # CSQBM Governance Constraint: Trace intelligent model selection
    local proj_root="$(cd "$(dirname "$(dirname "$(dirname "${BASH_SOURCE[0]}")")")" && pwd)"
    [ -f "$proj_root/scripts/validation-core.sh" ] && source "$proj_root/scripts/validation-core.sh" || true

    # Prod-Maturity Zero-Download Model Registry Execution
    # Ensure local heavy models like Gemma 4 are universally synced from LM Studio without re-downloading.
    if [ -x "$proj_root/scripts/system/sync-universal-models.sh" ] && [ "$task_type" == "dgm_synthesis" ]; then
        bash "$proj_root/scripts/system/sync-universal-models.sh" > /dev/null 2>&1 &
    fi

    # Enforce agentdb >96h staleness constraint natively (ADR-005)
    local agentdb_path="$proj_root/agentdb.db"
    if [ -f "$agentdb_path" ]; then
        if [[ -n "$(find "$agentdb_path" -mmin +5760 2>/dev/null)" ]]; then
            echo -e "ROUTING ERROR: CSQBM Governance Halt. agentdb.db staleness >96h. Task blocked via TurboQuant-DGM Physical Bounds (ADR-005)." >&2
            exit 150
        fi
    fi

    if [ -f "$proj_root/scripts/validators/project/check-csqbm.sh" ]; then
        if ! bash "$proj_root/scripts/validators/project/check-csqbm.sh" --deep-why > /dev/null 2>&1; then
            echo -e "ROUTING ERROR: CSQBM Deep-Why Violation. Task blocked via TurboQuant-DGM Physical Bounds (ADR-005)." >&2
            exit 150
        fi
    fi

    # Semantic Coverage Optimization Bounds
    # If the user provides a Semantic Confidence % from `confidence-scoring.py`:
    if [[ "$semantic_coverage" -ge 0 ]]; then
        if [[ "$semantic_coverage" -ge 90 ]]; then
            # > 90% Coverage: Logic is extremely sound. Fast telemetry via Qwen to save execution cost.
            echo "ROUTING: Semantic Coverage ($semantic_coverage%) > 90%. Optimizing velocity. Target => QWEN ($ALARM_MODEL)." >&2
            echo "$ALARM_MODEL"
            return 0
        elif [[ "$semantic_coverage" -lt 75 ]]; then
            # < 75% Coverage: Logic gap detected. Massive Synthesis required to rebuild state.
            echo "ROUTING: Semantic Coverage ($semantic_coverage%) < 75%. Gap Detected. Activating heavy compute DGM Synthesis => GEMMA4 ($GEMMA_COMPUTE_MODEL)." >&2
            echo "$GEMMA_COMPUTE_MODEL"
            return 0
        else
            echo "ROUTING: Semantic Coverage ($semantic_coverage%) Stable. Routing to standard matrix..." >&2
        fi
    fi

    case "$task_type" in
        "deep_analysis"|"architecture"|"core_logic")
            selected_model="$PRIMARY_MODEL"
            echo "ROUTING: Selected PRIMARY ($PRIMARY_MODEL) for high-accuracy depth tracking." >&2
            ;;
        "review"|"verification"|"severity_check"|"challenge")
            selected_model="$CHALLENGER_MODEL"
            echo "ROUTING: Selected CHALLENGER ($CHALLENGER_MODEL) for severity pushback." >&2
            ;;
        "telemetry"|"openstack_stx"|"agentic_qe_bridge")
            selected_model="$PRIMARY_MODEL"
            echo "ROUTING: Selected PRIMARY ($PRIMARY_MODEL) for deterministic OpenStack/STX Telemetry extraction." >&2
            ;;
        "alarm"|"notification"|"informational_summaries")
            selected_model="$ALARM_MODEL"
            echo "ROUTING: Selected ALARM ($ALARM_MODEL). WARNING: Output must be filtered; do not block CI." >&2
            ;;
        "dgm_synthesis"|"local_max_scope"|"self_improvement")
            selected_model="$GEMMA_COMPUTE_MODEL"
            echo "ROUTING: Selected GEMMA COMPUTE ($GEMMA_COMPUTE_MODEL). Unlocking local 262K native memory limit." >&2
            ;;
        *)
            # Fallback to Primary for safety
            selected_model="$PRIMARY_MODEL"
            echo "ROUTING: Defaulted to PRIMARY ($PRIMARY_MODEL) for unrecognized task '$task_type'." >&2
            echo "ADR-005 CONSTRAINT LOGGED: Enforcing strict Connectome Upper Bound: $AQE_CONNECTOME_TOKEN_CEILING tokens." >&2
            ;;
    esac

    echo "$selected_model"
}

# Example wrapper for execution if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    if [[ -z "$1" ]]; then
        echo "Usage: $0 <task_type> [semantic_coverage_percentage]"
        exit 1
    fi
    select_model "$1" "${2:-}"
fi
