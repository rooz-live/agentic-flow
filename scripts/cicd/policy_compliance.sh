#!/usr/bin/env bash
# scripts/cicd/policy_compliance.sh — Run compliance and governance checks
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

HARD_FAIL=0

run_step() {
  local id="$1"
  shift
  echo "--> [$id]"
  set +e
  "$@"
  local ec=$?
  set -e
  if [[ $ec -eq 0 ]]; then
    echo "    OK $id"
  else
    echo "    FAIL $id (exit $ec)"
    HARD_FAIL=1
  fi
  return $ec
}

# 1. Scope edge check
run_step compliance_edge python3 scripts/governance/compliance_as_code.py --cog --scope=edge

# 2. Scope governance check (returns 0 or 2)
set +e
python3 scripts/governance/compliance_as_code.py --cog --scope=governance
GOV_EC=$?
set -e
if [[ $GOV_EC -eq 0 ]] || [[ $GOV_EC -eq 2 ]]; then
  echo "    OK compliance_governance (exit $GOV_EC)"
else
  echo "    FAIL compliance_governance (exit $GOV_EC)"
  HARD_FAIL=1
fi

# 3. Agentdb freshness
if [[ -f scripts/governance/agentdb_freshness.sh ]]; then
  run_step agentdb_freshness bash scripts/governance/agentdb_freshness.sh
fi

# 4. Roam staleness watchdog
if [[ -f scripts/roam-staleness-watchdog.sh ]]; then
  run_step roam_watchdog bash scripts/roam-staleness-watchdog.sh
fi

if [[ $HARD_FAIL -ne 0 ]]; then
  echo "Policy Compliance: FAIL"
  exit 1
fi

echo "Policy Compliance: PASS"
exit 0
