#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
for f in wave_autopilot.sh perceive_reader.sh edge_writer.sh index_tick.sh lib/cls_common.sh; do
  [[ -x "$ROOT/scripts/cicd/$f" ]] || { echo "FAIL missing $f"; exit 1; }
done
grep -q 'cls_dod_gate' "$ROOT/scripts/cicd/wave_autopilot.sh" || exit 1
grep -q 'continuous_learning_swarm' "$ROOT/scripts/cicd/wave_autopilot.sh" || exit 1
bash "$ROOT/scripts/cicd/wave_autopilot.sh" --dry-run 2>/dev/null || true
echo "PASS wave_autopilot_contract"
