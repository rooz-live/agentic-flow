#!/usr/bin/env bash
# Contract test for WSJF -> Upstream execution order in tick_post_hooks.sh
set -euo pipefail
ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
HOOKS_FILE="$ROOT/scripts/cicd/tick_post_hooks.sh"

if [[ ! -f "$HOOKS_FILE" ]]; then
  echo "FAIL: tick_post_hooks.sh missing"
  exit 1
fi

# Find line numbers of key calls
WSJF_LINE=$(grep -n "update_lnnnl.py" "$HOOKS_FILE" | cut -d: -f1 | head -n1 || true)
UPSTREAM_LINE=$(grep -n "upstream_upgrade_engine.py" "$HOOKS_FILE" | cut -d: -f1 | head -n1 || true)
CLS_LINE=$(grep -n "continuous_learning_swarm.sh" "$HOOKS_FILE" | cut -d: -f1 | head -n1 || true)
AQE_LINE=$(grep -n "one.sh.*aqe" "$HOOKS_FILE" | cut -d: -f1 | head -n1 || true)

if [[ -z "$WSJF_LINE" ]]; then
  echo "FAIL: update_lnnnl.py (WSJF calculation) not found in tick_post_hooks.sh"
  exit 1
fi

# Verify ordering
if [[ -n "$UPSTREAM_LINE" ]] && (( WSJF_LINE > UPSTREAM_LINE )); then
  echo "FAIL: WSJF (line $WSJF_LINE) must execute before upstream upgrade (line $UPSTREAM_LINE)"
  exit 1
fi

if [[ -n "$CLS_LINE" ]] && (( WSJF_LINE > CLS_LINE )); then
  echo "FAIL: WSJF (line $WSJF_LINE) must execute before continuous learning swarm (line $CLS_LINE)"
  exit 1
fi

if [[ -n "$AQE_LINE" ]] && (( WSJF_LINE > AQE_LINE )); then
  echo "FAIL: WSJF (line $WSJF_LINE) must execute before AQE tests (line $AQE_LINE)"
  exit 1
fi

echo "PASS: WSJF (line $WSJF_LINE) executes before all upstream/testing steps"
exit 0
