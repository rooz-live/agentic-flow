#!/usr/bin/env bash
# trust_path_owner.sh — Slow trust-path only (single owner; do not bundle with index).
set -euo pipefail
cd "${REPO_ROOT:-$HOME/Documents/code}"
export REPO_ROOT="$PWD"
echo "=== Trust-path owner run ==="
TRUST_FORCE_RERUN="${TRUST_FORCE_RERUN:-1}" bash scripts/one.sh trust-path
bash scripts/one.sh verify-contract .goalie/evidence/last_gate_one_pass.json
