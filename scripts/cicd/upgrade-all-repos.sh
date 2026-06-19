#!/usr/bin/env bash
# upgrade-all-repos.sh — Thin wrapper delegating to python-based upstream_upgrade_engine.py.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Run the python-based coordination engine
python3 "$ROOT_DIR/scripts/cicd/upstream_upgrade_engine.py" --local "$@"
