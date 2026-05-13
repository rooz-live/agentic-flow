#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DAEMON_SCRIPT="$SCRIPT_DIR/oro_identity_mesh_daemon.js"

echo "🦅 [SWARM] Spinning up Sovereign Identity Mesh Daemon..."

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is required to run the Identity Mesh."
    exit 1
fi

# Ensure dependencies are available (express, node-fetch)
# For a lightweight daemon, we ensure it runs in the background
if command -v pm2 &> /dev/null; then
    echo "-> Using PM2 to daemonize the process..."
    pm2 start "$DAEMON_SCRIPT" --name "sovereign-identity-mesh"
    pm2 save
else
    echo "-> PM2 not found. Running via nohup..."
    nohup node "$DAEMON_SCRIPT" > "$SCRIPT_DIR/identity_mesh.log" 2>&1 &
    echo $! > "$SCRIPT_DIR/identity_mesh.pid"
    echo "[OK] Daemon running with PID $(cat "$SCRIPT_DIR/identity_mesh.pid")"
    echo "-> View logs via: tail -f $SCRIPT_DIR/identity_mesh.log"
fi
