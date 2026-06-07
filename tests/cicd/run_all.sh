#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
TESTS=(
  test_cls_manifest_canonical.sh
  test_perceive_metrics_split.sh
  test_wave_autopilot_contract.sh
  test_roam_edge_contract.sh
  test_dor_dod_matrix.sh
  test_tick_rehydration_manifest.sh
  test_session_rehydration_reader.sh
)
for t in "${TESTS[@]}"; do
  echo "=== $t ==="
  bash "tests/cicd/$t"
done
echo "PASS test:cicd (${#TESTS[@]} contracts)"
