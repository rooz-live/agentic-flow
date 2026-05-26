#!/bin/bash
# Sovereign Swarm - Native Edge Deployment Matrix
# Deploys the EventOps Rust Bridge (PyO3) and Calculation Gateways to stx-aio-0

set -e

EDGE_NODE="ubuntu@stx-aio-0.corp.interface.tag.ooo"
SSH_KEY="$HOME/.ssh/starlingx_key"
PORT="2222"
EDGE_DIR="/tmp/eventops_edge_deployment"

echo "============================================================"
echo "Initiating Native Edge Deployment of Rust Schema Validation"
echo "Target: $EDGE_NODE (x86_64)"
echo "============================================================"

# 1. Sync the Rust Bridge Source to the Edge Node
echo "[1/4] Syncing Rust PyO3 Source Code to Edge Node..."
ssh -o IdentitiesOnly=yes -i "$SSH_KEY" -p "$PORT" "$EDGE_NODE" "mkdir -p $EDGE_DIR/rust_bridge"
scp -o IdentitiesOnly=yes -i "$SSH_KEY" -P "$PORT" -r src/rust/eventops_pyo3/* "$EDGE_NODE:$EDGE_DIR/rust_bridge/"

# 2. Remote Compilation & Hardening Matrix on Edge
echo "[2/4] Triggering Edge-Native Maturin Compilation..."
ssh -o IdentitiesOnly=yes -i "$SSH_KEY" -p "$PORT" "$EDGE_NODE" "bash -s" << 'EOF'
    set -e
    # Ensure system dependencies exist for Rust/Python compilation
    sudo apt-get update -y && sudo apt-get install -y python3.10-venv python3-dev build-essential curl
    
    # Check for rustup, install if missing (headless)
    if ! command -v cargo &> /dev/null; then
        echo "Installing Rustup..."
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal
        source "$HOME/.cargo/env"
    fi
    source "$HOME/.cargo/env"

    echo "Setting up Edge Virtual Environment for Maturin..."
    cd /tmp/eventops_edge_deployment/rust_bridge
    python3 -m venv .venv
    source .venv/bin/activate
    pip install --upgrade pip maturin

    echo "Compiling eventops_pyo3 via Maturin release profile..."
    maturin develop --release
    
    # 3. Validation execution on edge
    echo "Running synthetic sanity check on compiled binary..."
    python3 -c "import eventops_pyo3; print('✅ PyO3 Bridge Compiled & Loaded Successfully on Edge Node!')"
EOF

# 4. Finalizing
echo "[4/4] 🚀 Sovereign Swarm PyO3 Edge Deployment Completed."
echo "The mathematical schema boundaries are now physically active on stx-aio-0."
