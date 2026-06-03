#!/usr/bin/env bash
# run_loop_tick.sh — Pick one WSJF NOW prompt from config/cicd/loop_prompts.yaml
set -euo pipefail
cd "$(dirname "$0")/../.."
export REPO_ROOT="$PWD"
ITEM="${LOOP_ITEM:-P1-INDEX-01}"
echo "Loop tick: $ITEM"
bash tooling/scripts/dod-gate.sh --perceive || true
case "$ITEM" in
  P1-INDEX-01) bash scripts/consolidation/w3_index_gates_batch.sh ;;
  P1-ADB-01)
    bash projects/investing/agentic-flow/scripts/governance/agentdb_freshness.sh 2>/dev/null || true
    python3 scripts/governance/compliance_as_code.py --cog --scope=governance || true
    ;;
  *) echo "See config/cicd/loop_prompts.yaml for prompt: $ITEM" ;;
esac
git diff --cached --stat 2>/dev/null | head -10 || true
echo "AGENT_LOOP_TICK_CLS {"prompt":"tick $ITEM complete","item":"$ITEM"}"
