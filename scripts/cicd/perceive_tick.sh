#!/usr/bin/env bash
# perceive_tick.sh — Fast read-only session orient (<15s target). No trust-path, no git add.
set -euo pipefail
cd "${REPO_ROOT:-$HOME/Documents/code}"
export REPO_ROOT="$PWD"
echo "=== Perceive tick @ $(git rev-parse --short HEAD) ==="
if [[ -f .goalie/evidence/learning/perceive_bundle.json ]]; then
  python3 -c "import json; d=json.load(open('.goalie/evidence/learning/perceive_bundle.json')); print('learning:', d.get('exit_code'), d.get('failure_category'), d.get('head_sha','')[:12])"
fi
if [[ -f .goalie/evidence/last_gate_one_pass.json ]]; then
  python3 -c "import json; d=json.load(open('.goalie/evidence/last_gate_one_pass.json')); print('trust:', d.get('exit_code'), d.get('hash','')[:12])"
fi
bash scripts/one.sh verify-contract .goalie/evidence/last_gate_one_pass.json 2>/dev/null && echo "verify-contract: OK" || echo "verify-contract: FAIL"
bash tooling/scripts/cog_edge_smoke.sh >/dev/null 2>&1 && echo "cog_edge_smoke: OK" || echo "cog_edge_smoke: FAIL"
bash code/tooling/scripts/dod-gate.sh --perceive
exit $?
