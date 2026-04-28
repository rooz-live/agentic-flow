#!/bin/bash
# =========================================================================
# SYSTEMIC.OS - SPATIAL OFFLOADING BEAD (ADR-023)
# =========================================================================
# Zero-OPEX Mode: Teleports massive workloads to the offline physical drive
# and symlinks them back. Preserves capabilities without burning SSD OPEX.
# =========================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

UMBILICAL_DRIVE="/Volumes/cPanelBackups"
OFFLOAD_DIR="$UMBILICAL_DRIVE/spatial_offload/agentic_flow"

if ! mount | grep "on $UMBILICAL_DRIVE" > /dev/null; then
    echo "🚨 FATAL: $UMBILICAL_DRIVE is NOT mounted. Spatial Offloading aborted."
    exit 1
fi

mkdir -p "$OFFLOAD_DIR"

echo "--> 🛡️  Initiating Spatial Offloading (ADR-023)..."

# Offload .venv
if [ -d "$ROOT_DIR/.venv" ] && [ ! -L "$ROOT_DIR/.venv" ]; then
    echo "  --> Teleporting .venv to physical drive..."
    mv "$ROOT_DIR/.venv" "$OFFLOAD_DIR/.venv"
    ln -s "$OFFLOAD_DIR/.venv" "$ROOT_DIR/.venv"
    echo "  ✅ .venv spatially offloaded."
fi

# Offload node_modules
if [ -d "$ROOT_DIR/node_modules" ] && [ ! -L "$ROOT_DIR/node_modules" ]; then
    echo "  --> Teleporting node_modules to physical drive..."
    mv "$ROOT_DIR/node_modules" "$OFFLOAD_DIR/node_modules"
    ln -s "$OFFLOAD_DIR/node_modules" "$ROOT_DIR/node_modules"
    echo "  ✅ node_modules spatially offloaded."
fi

echo "--> ⚡ OPEX Gravity restored. Capabilities preserved via symlink umbilical."
