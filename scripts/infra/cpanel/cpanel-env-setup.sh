#!/bin/bash
# scripts/cpanel-env-setup.sh
# Purpose: Synchronize .env configuration across the ecosystem.
#          Also serves as the AISP env loader — single source of truth for
#          AISP_ENV, AISP_T_STAGE, workspace roots, domains, case IDs, lanes.
# Usage:   ./scripts/cpanel-env-setup.sh [--all]
#          source scripts/cpanel-env-setup.sh  (to load AISP vars into shell)

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# ===========================================================================
# AISP Environment Configuration Block
# All scripts (ay.sh, advocate, cascade-tunnel.sh) source this for env truth.
# ===========================================================================

# Environment & temporality
export AISP_ENV="${AISP_ENV:-dev}"          # dev | stg | prod
export AISP_T_STAGE="${AISP_T_STAGE:-T0}"  # T0 (in-cycle) | T1 (end-of-cycle) | T2 (iteration) | T3 (PI)

# Workspace roots (multi-root)
export AISP_WORKSPACE_ROOT="${AISP_WORKSPACE_ROOT:-$PROJECT_ROOT}"
export LEGAL_ROOT="${LEGAL_ROOT:-$HOME/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL}"

# Domains & cases
export AISP_DOMAINS="${AISP_DOMAINS:-legal,housing,income,tech}"
export AISP_PRIMARY_DOMAIN="${AISP_PRIMARY_DOMAIN:-legal}"
export LEGAL_CASE_IDS="${LEGAL_CASE_IDS:-26CV005596-590,26CV007491-590}"

# Lane (script-specific, can be overridden)
export AISP_LANE="${AISP_LANE:-governance}"
export AISP_MODE_DEFAULT="${AISP_MODE_DEFAULT:-SA}"  # SA (Semi-Auto) | FA (Full-Auto) | M (Manual)

# Exit codes & status
export EXIT_CODES_REGISTRY="${EXIT_CODES_REGISTRY:-$PROJECT_ROOT/_SYSTEM/_AUTOMATION/exit-codes-robust.sh}"
export AISP_STATUS_PATH="${AISP_STATUS_PATH:-$PROJECT_ROOT/reports/aisp-status.json}"

# --- Source guard: when sourced, only export AISP vars above and return ---
# source cpanel-env-setup.sh → exports AISP_* only, skips interactive setup (CPANEL_NONINTERACTIVE implicitly honored)
# ./cpanel-env-setup.sh       → runs full interactive setup (python + secrets) unless CPANEL_NONINTERACTIVE=1
if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
    return 0 2>/dev/null || true
fi

echo "--- cPanel Environment Setup ---"

# @business-context WSJF-42: non-interactive mode for CI/agent runners
# Auto-force non-interactive mode when no TTY is available.
# This prevents governance/status runners from stalling on secret prompts.
if [[ ! -t 0 ]]; then
    export CPANEL_NONINTERACTIVE=1
fi

# Non-interactive mode: skip secrets prompts, just export AISP vars (verified per plan Phase 5.2)
if [[ "${CPANEL_NONINTERACTIVE:-0}" == "1" ]]; then
    echo "ℹ️  Non-interactive mode (CPANEL_NONINTERACTIVE=1) — skipping secrets setup"
    echo "   AISP vars exported. Run without CPANEL_NONINTERACTIVE for full setup."
    exit 0
fi

# 1. Update local agentic-flow environment
echo "Updating local .env in $PROJECT_ROOT..."

# CSQBM Governance Constraint: Trace CPanel Environment Configuration Synchronization
mkdir -p "$PROJECT_ROOT/.agentic_logs"
echo "[CSQBM_TRACE] [NEXT: DAY] CPanel Environment Configuration Synchronization at $(date -u +'%Y-%m-%dT%H:%M:%SZ') binding ecosystem parameters to CSQBM boundary" >> "$PROJECT_ROOT/.agentic_logs/daemon.log"

python3 "$SCRIPT_DIR/generate_env_config.py"
"$SCRIPT_DIR/setup_secrets.sh"

# 2. Propagate if requested
if [[ "$1" == "--all" ]]; then
    echo ""
    echo "--- Propagating Configuration ---"

    # Target 1: agentic-flow-core (Sibling at root level)
    CORE_DIR="$PROJECT_ROOT/../../agentic-flow-core"
    if [ -d "$CORE_DIR" ]; then
        echo "Syncing to agentic-flow-core..."
        cp "$PROJECT_ROOT/.env" "$CORE_DIR/.env"
        # Optional: Generate example there too if needed, but copying .env is the request
    else
        echo "Warning: agentic-flow-core directory not found at $CORE_DIR"
    fi

    # Target 2: config (Root config directory)
    # Assuming investing/agentic-flow -> investing -> code -> config
    CONFIG_DIR="$PROJECT_ROOT/../../config"
    if [ -d "$CONFIG_DIR" ]; then
        echo "Syncing to global config..."
        cp "$PROJECT_ROOT/.env" "$CONFIG_DIR/.env"
    else
        echo "Warning: Global config directory not found at $CONFIG_DIR"
    fi

    echo "Propagation complete."
fi

echo "Environment setup finished."
