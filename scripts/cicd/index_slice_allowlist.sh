#!/usr/bin/env bash
# index_slice_allowlist.sh — Slow slice: stage only gate-canonical paths (never first-N untracked).
set -euo pipefail
cd "${REPO_ROOT:-$HOME/Documents/code}"
export REPO_ROOT="$PWD"
MAX="${INDEX_SLICE_MAX:-25}"
ALLOWLIST=(
  tooling/scripts/dod-gate.sh
  tooling/scripts/agent_session_dor.sh
  tooling/scripts/lib/evidence_json.sh
  tooling/scripts/public_synthetic_check.sh
  scripts/cicd/continuous_learning_swarm.sh
  scripts/cicd/perceive_tick.sh
  scripts/cicd/index_slice_allowlist.sh
  scripts/cicd/trust_path_owner.sh
  scripts/cicd/hold_unblock_w3.sh
  scripts/cicd/run_loop_tick.sh
  scripts/consolidation/w3_index_gates_batch.sh
  scripts/governance/compliance_as_code.py
  scripts/roam-staleness-watchdog.sh
  scripts/policy/gate_owners.json
  config/cicd/continuous_learning.yaml
  
)
TO_STAGE=()
for p in "${ALLOWLIST[@]}"; do
  [[ -f "$p" ]] || continue
  git ls-files --error-unmatch "$p" >/dev/null 2>&1 && continue
  TO_STAGE+=("$p")
  [[ ${#TO_STAGE[@]} -ge $MAX ]] && break
done
if [[ ${#TO_STAGE[@]} -eq 0 ]]; then
  echo "No allowlisted gate files need staging."
  exit 0
fi
echo "Staging ${#TO_STAGE[@]} allowlisted paths:"
printf '  %s\n' "${TO_STAGE[@]}"
git add "${TO_STAGE[@]}"
git diff --cached --stat | head -20
echo "Next: bash scripts/cicd/perceive_tick.sh (must trend green before commit)"
