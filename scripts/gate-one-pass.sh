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
        EXIT_CODE=0
        bash "$ROOT_DIR/scripts/validate-foundation.sh" --trust-path || EXIT_CODE=$?

        # Always generate artifact (success OR failure) — no completion theater,
        # no stale symlink masking failures as last-known-good.
        RUN_ID=$(date +%s)
        HASH=$(git rev-parse HEAD 2>/dev/null || echo "no-git")
        ARTIFACT_DIR="$ROOT_DIR/.goalie/evidence"
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
        ln -sf "gate_one_pass_${RUN_ID}.json" "$ARTIFACT_DIR/last_gate_one_pass.json"

        if [ $EXIT_CODE -ne 0 ]; then
            echo "❌ trust-path gate FAILED (exit $EXIT_CODE). Artifact: $ARTIFACT_PATH"
            exit $EXIT_CODE
        fi
        echo "✅ trust-path gate passed. Artifact physically generated: $ARTIFACT_PATH"
    else
        echo "❌ validate-foundation.sh not found."
        exit 1
    fi
elif [ "$GATE_TARGET" == "verify-contract" ]; then
    echo "--> Running Sovereignty Contract Verification..."
    EVIDENCE_FILE="${2:-}"
    if [ -z "$EVIDENCE_FILE" ] || [ ! -f "$EVIDENCE_FILE" ]; then
        echo "❌ Contract Verification Failed: Evidence file not found ($EVIDENCE_FILE)"
        exit 1
    fi
    if ! grep -q '"exit_code": 0' "$EVIDENCE_FILE"; then
        echo "❌ Contract Verification Failed: exit_code is not 0 in $EVIDENCE_FILE"
        exit 1
    fi
    if ! grep -q '"hash":' "$EVIDENCE_FILE"; then
        echo "❌ Contract Verification Failed: hash missing in $EVIDENCE_FILE"
        exit 1
    fi
    echo "✅ Contract Verified: Artifact physically confirmed ($EVIDENCE_FILE)."
else
    echo "❌ Unknown gate target: $GATE_TARGET"
    exit 1
fi

echo "====================================================================="
echo "✅ GATE-ONE-PASS COMPLETE"
echo "====================================================================="
