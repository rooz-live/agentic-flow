#!/usr/bin/env bash
set -euo pipefail

# ay-yo-auto.sh - Automatic inventory → interactive cockpit flow
# This is the "expected behavior" wrapper for ay yo

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "[ay-yo-auto] Starting automatic workflow..."

# Step 1: Run inventory (ssh-probe, health checks)
echo "[ay-yo-auto] Step 1: Inventory & health checks"
if ! "$SCRIPT_DIR/ay-yo.sh" inventory 2>&1 | grep -q "inventory.*OK"; then
    echo "⚠️  Inventory check did not complete successfully"
    # Continue anyway - cockpit will show degraded state
fi

# Step 2: Launch interactive cockpit
echo "[ay-yo-auto] Step 2: Launching interactive cockpit with WSJF recommendations"
exec npx tsx "$SCRIPT_DIR/ay-yo-interactive-cockpit.ts"
