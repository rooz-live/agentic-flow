#!/usr/bin/env bash
#
# env_shim.sh - Deterministic tool paths for macOS
#
# Sets consistent Python3, Node, and NPX paths for all scripts.
# Source this file at the beginning of scripts:
#   source "$(dirname "$0")/../policy/env_shim.sh"
#

# Python3 detection with fallback chain
if [ -x "/usr/local/opt/python@3.13/bin/python3.13" ]; then
    export PYTHON3="/usr/local/opt/python@3.13/bin/python3.13"
elif [ -x "/usr/local/bin/python3" ]; then
    export PYTHON3="/usr/local/bin/python3"
elif command -v python3 &>/dev/null; then
    export PYTHON3="$(command -v python3)"
else
    echo "WARNING: python3 not found; scripts may fail" >&2
    export PYTHON3="python3"
fi

# Node and NPX detection
export NODE_BIN="$(command -v node || echo 'node')"
export NPX_BIN="$(command -v npx || echo 'npx')"

# Tool wrappers via npx
export GOALIE_BIN="$NPX_BIN goalie@latest"
export AJJ_BIN="$NPX_BIN agentic-jujutsu@latest"

# Policy flags
export BLOCK_NO_NEW_MD=1
export LOCAL_ONLY=1

# Verify critical tools
if ! command -v "$NODE_BIN" &>/dev/null; then
    echo "WARNING: node not found at $NODE_BIN" >&2
fi

if ! command -v "$NPX_BIN" &>/dev/null; then
    echo "WARNING: npx not found at $NPX_BIN" >&2
fi

# Export Python version for debugging
export PYTHON_VERSION="$($PYTHON3 --version 2>&1 || echo 'unknown')"

# Log environment (optional)
if [ "${VERBOSE:-0}" = "1" ]; then
    echo "Environment shim loaded:"
    echo "  PYTHON3=$PYTHON3 ($PYTHON_VERSION)"
    echo "  NODE_BIN=$NODE_BIN"
    echo "  NPX_BIN=$NPX_BIN"
    echo "  BLOCK_NO_NEW_MD=$BLOCK_NO_NEW_MD"
    echo "  LOCAL_ONLY=$LOCAL_ONLY"
fi
