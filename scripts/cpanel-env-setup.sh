#!/bin/bash
# scripts/cpanel-env-setup.sh
# Purpose: Synchronize .env configuration across the ecosystem.
# Usage: ./scripts/cpanel-env-setup.sh [--all]

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "--- cPanel Environment Setup ---"

# 1. Update local agentic-flow environment
echo "Updating local .env in $PROJECT_ROOT..."
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
