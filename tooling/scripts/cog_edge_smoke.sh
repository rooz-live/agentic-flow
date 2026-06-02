#!/usr/bin/env bash
# Wrapper shell script delegating to the parallel python edge smoke test
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
python3 "$SCRIPT_DIR/cog_edge_smoke.py"
