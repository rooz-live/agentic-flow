#!/usr/bin/env bash
# unstage_scope_creep.sh — Keep only gate-allowlisted paths staged.
set -euo pipefail
cd "${REPO_ROOT:-$HOME/Documents/code}"
python3 -c "
import subprocess
allow = {
  'code/tooling/scripts/dod-gate.sh', 'code/tooling/scripts/agent_session_dor.sh',
  'code/tooling/scripts/lib/evidence_json.sh', 'code/tooling/scripts/public_synthetic_check.sh',
  'scripts/cicd/continuous_learning_swarm.sh', 'scripts/cicd/perceive_tick.sh',
  'scripts/cicd/index_slice_allowlist.sh', 'scripts/cicd/trust_path_owner.sh',
  'scripts/cicd/hold_unblock_w3.sh', 'scripts/cicd/run_loop_tick.sh',
  'scripts/cicd/unstage_scope_creep.sh', 'scripts/consolidation/w3_index_gates_batch.sh',
  'scripts/governance/compliance_as_code.py', 'scripts/roam-staleness-watchdog.sh',
  'scripts/policy/gate_owners.json', 'config/cicd/continuous_learning.yaml',
  'config/cicd/loop_prompts.yaml',
  'tests/cicd/test_wave_autopilot_contract.sh',
  'tests/cicd/test_perceive_metrics_split.sh',
  'tests/cicd/test_cls_manifest_canonical.sh',
  'scripts/cicd/lib/cls_common.sh',
  'scripts/cicd/policy_compliance.sh',
  'scripts/cicd/index_tick.sh',
  'scripts/cicd/edge_writer.sh',
  'scripts/cicd/perceive_reader.sh',
  'scripts/cicd/wave_autopilot.sh', 'docs/agentics/DYNAMIC_WORKFLOW_SLICES.md',
  'docs/agentics/RESEARCH_REGISTRY.yaml', '.github/workflows/continuous-learning-swarm.yml',
}
staged = subprocess.check_output(['git', 'diff', '--cached', '--name-only'], text=True).splitlines()
unstage = [p for p in staged if p not in allow]
if unstage:
    subprocess.run(['git', 'restore', '--staged', '--'] + unstage, check=False)
print(f'unstaged={len(unstage)} kept={len(staged)-len(unstage)}')
"
git diff --cached --stat
