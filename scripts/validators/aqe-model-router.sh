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

# ADR-005 Governance: Dynamic Connectome Ceiling
export AQE_CONNECTOME_TOKEN_CEILING=$(compute_dynamic_token_ceiling 2>/dev/null || echo 4000)

select_model() {
    local task_type=$1
    local selected_model=""

    # CSQBM Governance Constraint: Trace intelligent model selection
    local proj_root="$(cd "$(dirname "$(dirname "$(dirname "${BASH_SOURCE[0]}")")")" && pwd)"
    [ -f "$proj_root/scripts/validation-core.sh" ] && source "$proj_root/scripts/validation-core.sh" || true

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
        echo "Usage: $0 <task_type>"
        exit 1
    fi
    select_model "$1"
fi
