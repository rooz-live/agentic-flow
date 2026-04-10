#!/bin/bash
# scripts/infra/cpanel/cpanel-env-setup.sh
# Purpose: Synchronize .env configuration across the ecosystem.
#          Also serves as the AISP env loader — single source of truth for
#          AISP_ENV, AISP_T_STAGE, workspace roots, domains, case IDs, lanes.
#
# Usage:
#   source scripts/infra/cpanel/cpanel-env-setup.sh
#       Export AISP_* vars into the current shell (no credentials)
#   ./cpanel-env-setup.sh
#       Interactive setup: generate .env.cpanel if it doesn’t exist
#   ./cpanel-env-setup.sh --persist
#       Copy .env.cpanel.example → .env.cpanel, prompt to fill credentials
#   ./cpanel-env-setup.sh --register-launchd
#       Register com.agentic-flow.ssl-monitor as a macOS launchd agent
#   ./cpanel-env-setup.sh --all
#       Persist + register + propagate

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Resolve to scripts/infra root regardless of where the script lives
INFRA_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"
PROJECT_ROOT="$( cd "$INFRA_DIR/../.." && pwd )"
CREDS_DIR="$INFRA_DIR/credentials"
ENV_CPANEL="$CREDS_DIR/.env.cpanel"
ENV_EXAMPLE="$CREDS_DIR/.env.cpanel.example"
PLIST_SRC="$SCRIPT_DIR/com.agentic-flow.ssl-monitor.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/com.agentic-flow.ssl-monitor.plist"

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

# Non-interactive mode: source credentials and exit cleanly (no prompts)
if [[ "${CPANEL_NONINTERACTIVE:-0}" == "1" ]]; then
    echo "ℹ️  Non-interactive mode — sourcing $ENV_CPANEL (if present), skipping prompts"
    [[ -f "$ENV_CPANEL" ]] && set -a && source "$ENV_CPANEL" && set +a
    exit 0
fi

# ──────────────────────────────────────────────────────────────────────────────
# --persist: create .env.cpanel from example if it doesn't exist
# ──────────────────────────────────────────────────────────────────────────────
_do_persist() {
    if [[ -f "$ENV_CPANEL" ]]; then
        echo "✅  $ENV_CPANEL already exists."
    else
        if [[ ! -f "$ENV_EXAMPLE" ]]; then
            echo "❌  Example file not found: $ENV_EXAMPLE"
            exit 1
        fi
        cp "$ENV_EXAMPLE" "$ENV_CPANEL"
        chmod 600 "$ENV_CPANEL"
        echo "✅  Created $ENV_CPANEL"
        echo "   Fill in credentials, then re-run:"
        echo "   source $ENV_CPANEL"
    fi
    echo "   Current credential status:"
    while IFS= read -r line; do
        [[ "$line" =~ ^export\ ([A-Z_]+)=\"(.*)\" ]] || continue
        key="${BASH_REMATCH[1]}"; val="${BASH_REMATCH[2]}"
        if [[ -n "$val" ]]; then
            echo "     ✔ $key  (set)"
        else
            echo "     ⚠ $key  (EMPTY — fill in $ENV_CPANEL)"
        fi
    done < "$ENV_CPANEL"
}

# ──────────────────────────────────────────────────────────────────────────────
# --register-launchd: install and load the SSL monitor LaunchAgent
# ──────────────────────────────────────────────────────────────────────────────
_do_register_launchd() {
    if [[ ! -f "$PLIST_SRC" ]]; then
        echo "❌  Plist not found: $PLIST_SRC"
        exit 1
    fi
    mkdir -p "$HOME/Library/LaunchAgents"
    cp "$PLIST_SRC" "$PLIST_DEST"
    # Unload first to avoid 'already loaded' errors on re-registration
    launchctl unload "$PLIST_DEST" 2>/dev/null || true
    launchctl load -w "$PLIST_DEST"
    echo "✅  SSL monitor registered and loaded: com.agentic-flow.ssl-monitor"
    echo "   Runs every 4 hours; logs: /tmp/ssl-monitor.log"
    echo "   Status: launchctl list com.agentic-flow.ssl-monitor"
}

# ──────────────────────────────────────────────────────────────────────────────
# Argument dispatch
# ──────────────────────────────────────────────────────────────────────────────
case "${1:-}" in
    --persist)
        _do_persist
        ;;
    --register-launchd)
        _do_register_launchd
        ;;
    --all)
        _do_persist
        _do_register_launchd
        echo "✅  Full setup complete."
        ;;
    "")
        # Legacy interactive path: generate .env and run existing sub-scripts
        echo "Updating local .env in $PROJECT_ROOT..."
        mkdir -p "$PROJECT_ROOT/.agentic_logs"
        echo "[CSQBM_TRACE] CPanel env sync at $(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
            >> "$PROJECT_ROOT/.agentic_logs/daemon.log"
        [[ -f "$SCRIPT_DIR/generate_env_config.py" ]] && python3 "$SCRIPT_DIR/generate_env_config.py"
        [[ -f "$SCRIPT_DIR/setup_secrets.sh" ]]      && "$SCRIPT_DIR/setup_secrets.sh"
        echo "Environment setup finished."
        echo "Run with --persist to create a durable .env.cpanel credential file."
        ;;
    *)
        echo "Usage: $0 [--persist|--register-launchd|--all]"
        exit 1
        ;;
esac
