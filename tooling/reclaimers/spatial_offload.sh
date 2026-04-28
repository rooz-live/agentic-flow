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

# 🔴 ROAM MITIGATION: DO NOT offload .venv. The Swarm Governance Python
# runtime must remain on the high-speed internal APFS NVMe drive. 
# Offloading it to an external USB cord introduces massive I/O latency 
# that will breach the PEWMA targets and spike Cosmological Gravity.

# Offload dormant/heavy workspaces (Vite/React/Playwright dependencies)
if [ -d "$ROOT_DIR/node_modules" ] && [ ! -L "$ROOT_DIR/node_modules" ]; then
    echo "  --> Teleporting node_modules to physical drive..."
    mv "$ROOT_DIR/node_modules" "$OFFLOAD_DIR/node_modules"
    ln -s "$OFFLOAD_DIR/node_modules" "$ROOT_DIR/node_modules"
    echo "  ✅ node_modules spatially offloaded."
fi

echo "--> ⚡ OPEX Gravity restored. Capabilities preserved via symlink umbilical."
