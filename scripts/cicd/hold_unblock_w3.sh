#!/usr/bin/env bash
# hold_unblock_w3.sh — Ordered steps to clear GO/NO-GO HOLD (perceive + compliance)
set -euo pipefail
cd "${REPO_ROOT:-$HOME/Documents/code}"
export REPO_ROOT="$PWD"
echo "=== W3 HOLD unblock @ $(git rev-parse --short HEAD) ==="
bash scripts/consolidation/w3_index_gates_batch.sh || true
TRUST_FORCE_RERUN=1 bash scripts/one.sh trust-path || echo "WARN: trust-path incomplete"
bash scripts/one.sh verify-contract .goalie/evidence/last_gate_one_pass.json || true
PUBLIC_WRITE_EVIDENCE=1 bash tooling/scripts/public_synthetic_check.sh billing.bhopti.com || true
bash tooling/scripts/dod-gate.sh --perceive; PER=$?
python3 scripts/governance/compliance_as_code.py --cog; COMP=$?
echo "perceive_exit=$PER compliance_exit=$COMP"
[[ $PER -eq 0 && $COMP -eq 0 ]] && echo "HOLD CLEARED" || echo "HOLD REMAINS — see learning artifact"
