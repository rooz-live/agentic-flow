#!/usr/bin/env bash
# wave_autopilot.sh — DAG: read → remediate → verify (dod-gate) → observe (CLS).
set -euo pipefail
source "$(dirname "$0")/lib/cls_common.sh"
cls_repo_root
[[ "${1:-}" == "--dry-run" ]] && { echo dry-run-ok; exit 0; }
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
MAX="${WAVE_RETRY_MAX:-2}"
REMEDIATE="${CLS_REMEDIATE:-1}"
AUTO_COMMIT="${CLS_AUTO_COMMIT:-0}"
DOD="$(cls_dod_gate)"

echo "=== wave_autopilot | $(git rev-parse --short HEAD) | $RUN_ID ==="
bash "$REPO_ROOT/scripts/cicd/unstage_scope_creep.sh" 2>/dev/null || true
bash "$REPO_ROOT/scripts/cicd/perceive_reader.sh" >/dev/null || true

n=0
PE=1
while [[ $n -le $MAX ]]; do
  set +e; "$DOD" --perceive; PE=$?; set -e
  [[ $PE -eq 0 ]] && break
  [[ "$REMEDIATE" != "1" ]] && break
  read -r UC _ < <(cls_untracked_counts)
  if ! cls_public_edge_ok; then bash "$REPO_ROOT/scripts/cicd/edge_writer.sh" || true
  elif [[ "$UC" -gt 0 ]]; then bash "$REPO_ROOT/scripts/cicd/index_slice_allowlist.sh" || true
  elif ! cls_trust_ok; then TRUST_FORCE_RERUN=1 bash "$REPO_ROOT/scripts/one.sh" trust-path || true
  else break; fi
  n=$((n+1))
done

set +e
CLS_SKIP_REMEDIATE=1 bash "$REPO_ROOT/scripts/cicd/continuous_learning_swarm.sh"
CE=$?
set -e
if [[ "$AUTO_COMMIT" == "1" && $PE -eq 0 ]] && ! git diff --cached --quiet; then
  git commit -m "chore(cicd): wave autopilot slice ${RUN_ID}" || true
fi
echo "AGENT_LOOP_TICK_CLS {\"run_id\":\"$RUN_ID\",\"perceive_ec\":$PE,\"cls_ec\":$CE}"
[[ $PE -eq 0 && $CE -eq 0 ]] && exit 0
exit 1
