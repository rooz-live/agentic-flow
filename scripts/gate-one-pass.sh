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
        
        # Eliminate Completion Theater: Generate Physical Artifact
        RUN_ID=$(date +%s)
        HASH=$(git rev-parse HEAD 2>/dev/null || echo "no-git")
        ARTIFACT_DIR="$ROOT_DIR/.goalie/gate-runs"
        mkdir -p "$ARTIFACT_DIR"
        ARTIFACT_PATH="$ARTIFACT_DIR/gate_one_pass_${RUN_ID}.json"
        
        cat <<EOF > "$ARTIFACT_PATH"
{
  "gate": "gate-one-pass",
  "target": "$GATE_TARGET",
  "run_id": "$RUN_ID",
  "hash": "$HASH",
  "exit_code": $EXIT_CODE,
  "timestamp": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
}
EOF
        echo "✅ trust-path gate passed. Artifact physically generated: $ARTIFACT_PATH"
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
