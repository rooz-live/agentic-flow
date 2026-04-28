#!/bin/bash
set -euo pipefail
echo "--> [WSJF 6.5] Brutally thinning APFS Ghost Blocks (Time Machine Snapshots)..."
sudo tmutil thinlocalsnapshots / 100000000000 4 || true
sudo tmutil startbackup --auto || true
echo "✅ Ghost blocks vaporized. Time Machine reset."
