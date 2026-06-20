#!/usr/bin/env bash
# deploy-edge-cfg.sh — DNS integrity gate for edge_gateway.cfg
# Delegates verification and synchronization to edge_gateway_sync_engine.py.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Invoke python sync engine, forwarding any args (like --dry-run or --force)
exec python3 "$ROOT_DIR/scripts/cicd/edge_gateway_sync_engine.py" "$@"
