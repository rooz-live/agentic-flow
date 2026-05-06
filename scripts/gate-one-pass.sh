#!/bin/bash
# =========================================================================
# DOMAIN: FOURTH-WAVE SOVEREIGNTY PHASE GATE
# =========================================================================
# Mandatory binary entry point to eliminate "completion theater" and 
# enforce non-bypassable verification.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

GATE_TARGET="${1:-trust-path}"

echo "====================================================================="
echo "🦅 INITIATING GATE-ONE-PASS: $GATE_TARGET"
echo "====================================================================="

if [ "$GATE_TARGET" == "trust-path" ]; then
    echo "--> Running Sovereignty Trust-Path Gate (via validate-foundation.sh shim)..."
    if [ -f "$ROOT_DIR/scripts/validate-foundation.sh" ]; then
        bash "$ROOT_DIR/scripts/validate-foundation.sh" --trust-path
        EXIT_CODE=$?
        if [ $EXIT_CODE -ne 0 ]; then
            echo "❌ trust-path gate failed with exit code $EXIT_CODE"
            exit $EXIT_CODE
        fi
        echo "✅ trust-path gate passed."
    else
        echo "❌ validate-foundation.sh not found."
        exit 1
    fi
else
    echo "❌ Unknown gate target: $GATE_TARGET"
    exit 1
fi

echo "====================================================================="
echo "✅ GATE-ONE-PASS COMPLETE"
echo "====================================================================="
