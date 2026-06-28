#!/bin/bash
# scripts/metrics/inbox_zero_timescape.sh
# Wires the timescape metrics generation to .goalie/evidence/inbox_zero_latest.json
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Run the python script to update the timescape json
python3 "$SCRIPT_DIR/inbox_zero_timescape.py"

echo "✅ Timescape metrics updated."
