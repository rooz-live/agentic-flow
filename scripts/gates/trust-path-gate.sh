#!/usr/bin/env bash
# trust-path-gate.sh — Thin shim for zero-trust trust-path verification.
# Delegates to gate-one-pass.sh which delegates to validate-foundation.sh.
#
# DoR: validate-foundation.sh present; git HEAD resolvable.
# DoD: .goalie/evidence/last_gate_one_pass.json written by gate-one-pass.sh.
#
# Exit codes mirror gate-one-pass.sh (0=pass, non-zero=fail).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GATE_ONE="$ROOT_DIR/scripts/gate-one-pass.sh"

if [[ ! -x "$GATE_ONE" ]]; then
    echo "❌ [trust-path-gate] gate-one-pass.sh not found or not executable: $GATE_ONE"
    exit 1
fi

echo "====================================================================="
echo "🔐 TRUST-PATH GATE"
echo "====================================================================="

exec bash "$GATE_ONE" trust-path "$@"
