#!/usr/bin/env bash
# continuous_learning_swarm.sh — Observe → learn → gate (anti-CVT, artifact-native)
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"
export REPO_ROOT="$PROJECT_ROOT"

EVIDENCE_LIB="$PROJECT_ROOT/tooling/scripts/lib/evidence_json.sh"
if [[ -f "$EVIDENCE_LIB" ]]; then
  # shellcheck source=/dev/null
  source "$EVIDENCE_LIB"
else
  echo "ERROR: missing $EVIDENCE_LIB" >&2
fi
ensure_monorepo_repo_root() {
  if [[ ! -d "$1/.git" ]]; then
    echo "ERROR: not a git monorepo root: $1" >&2
    return 1
  fi
  return 0
}
ensure_monorepo_repo_root "$PROJECT_ROOT" || exit 1

DLQ_PATH="${CLS_DLQ_PATH:-.goalie/evidence/learning/dlq.jsonl}"
LEARNING_DIR=".goalie/evidence/learning"
mkdir -p "$LEARNING_DIR" "$(dirname "$DLQ_PATH")"

HEAD_SHA="$(git rev-parse HEAD)"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
HARD_FAIL=0

run_step() {
  local id="$1"
  shift
  echo "--> [$id]"
  set +e
  "$@" >"/tmp/cls_${id}.log" 2>&1
  local ec=$?
  set -e
  if [[ $ec -eq 0 ]]; then
    echo "    OK $id"
  else
    echo "    FAIL $id (exit $ec)"
    HARD_FAIL=1
  fi
  echo "$ec" >"/tmp/cls_ec_${id}"
}

run_advisory() {
  local id="$1"
  shift
  echo "--> [$id] (advisory)"
  set +e
  "$@" >"/tmp/cls_${id}.log" 2>&1
  local ec=$?
  set -e
  echo "$ec" >"/tmp/cls_ec_${id}"
  if [[ $ec -ne 0 ]]; then
    echo "    WARN $id (non-blocking, exit $ec)"
  else
    echo "    OK $id"
  fi
}

step_ec() {
  cat "/tmp/cls_ec_${1}" 2>/dev/null || echo 1
}

append_dlq() {
  local category="$1" hint="$2"
  python3 - "$DLQ_PATH" "$category" "$hint" "$HEAD_SHA" "$RUN_ID" <<'PY'
import json, sys, time
path, cat, hint, head, run_id = sys.argv[1:6]
row = {"ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "failure_category": cat,
       "remediation_hint": hint, "head_sha": head, "run_id": run_id}
with open(path, "a") as f:
    f.write(json.dumps(row) + "\n")
PY
}

echo "===================================================="
echo "Continuous Learning Swarm | HEAD=${HEAD_SHA:0:12} | $RUN_ID"
echo "===================================================="

run_step perceive bash tooling/scripts/dod-gate.sh --perceive
run_step cog_edge_smoke bash tooling/scripts/cog_edge_smoke.sh

export PUBLIC_WRITE_EVIDENCE=1
FQDN="${CLS_BILLING_FQDN:-billing.bhopti.com}"
if [[ -f tooling/scripts/public_synthetic_check.sh ]]; then
  run_step public_synthetic bash tooling/scripts/public_synthetic_check.sh "$FQDN"
else
  run_advisory public_synthetic echo "public_synthetic_check.sh missing"
fi

run_step compliance_edge python3 scripts/governance/compliance_as_code.py --cog --scope=edge
set +e
python3 scripts/governance/compliance_as_code.py --cog --scope=governance >"/tmp/cls_compliance_gov.log" 2>&1
GOV_EC=$?
set -e
echo "$GOV_EC" >"/tmp/cls_ec_compliance_governance"
if [[ $GOV_EC -eq 0 ]] || [[ $GOV_EC -eq 2 ]]; then
  echo "    OK compliance_governance (exit $GOV_EC)"
else
  echo "    FAIL compliance_governance (exit $GOV_EC)"
  HARD_FAIL=1
fi

if [[ -f scripts/governance/agentdb_freshness.sh ]]; then
  run_step agentdb_freshness bash scripts/governance/agentdb_freshness.sh
elif [[ -f projects/investing/agentic-flow/scripts/governance/agentdb_freshness.sh ]]; then
  run_step agentdb_freshness bash projects/investing/agentic-flow/scripts/governance/agentdb_freshness.sh
else
  run_advisory agentdb_freshness echo "agentdb_freshness missing"
fi

if [[ -f scripts/roam-staleness-watchdog.sh ]]; then
  run_step roam_watchdog bash scripts/roam-staleness-watchdog.sh
elif [[ -f tooling/scripts/roam-staleness-watchdog.sh ]]; then
  run_step roam_watchdog bash tooling/scripts/roam-staleness-watchdog.sh
else
  run_advisory roam_watchdog echo "roam watchdog missing"
fi

run_advisory ssr_guard bash tooling/scripts/ssr_readiness_guard.sh || true
if [[ -f "$HOME/vectors.db" ]]; then echo 0 >"/tmp/cls_ec_vectors_db"; echo "    OK vectors_db"; else echo 2 >"/tmp/cls_ec_vectors_db"; echo "    WARN vectors_db missing"; fi

if [[ "${CLS_LOCAL_SSR:-0}" == "1" ]] && [[ -f projects/investing/agentic-flow/src/api/swarm-api-server.ts ]]; then
  export SWARM_API_PORT=3001 COGNITUM_REF=2rbzTT
  (cd projects/investing/agentic-flow && npx tsx src/api/swarm-api-server.ts) >/tmp/swarm_api_local.log 2>&1 &
  API_PID=$!
  BOOT=0
  for _ in $(seq 1 15); do curl -sf http://127.0.0.1:3001/health >/dev/null && BOOT=1 && break; sleep 1; done
  if [[ $BOOT -eq 1 ]]; then
    export COG_SMOKE_BASE=http://127.0.0.1:3001
    run_advisory local_smoke bash tooling/scripts/cog_edge_smoke.sh
  fi
  kill "$API_PID" 2>/dev/null || true
fi

[[ -f scripts/wsjf/prod_maturity_flow.sh ]] && run_advisory prod_maturity bash scripts/wsjf/prod_maturity_flow.sh || true

FAILURE_CATEGORY=""
REMEDIATION=""
UPSTREAM_ACTION=""
BREAKTHROUGH=false
PERCEIVE_EC=$(step_ec perceive)
PUB_EC=$(step_ec public_synthetic)
GOV_EC=$(step_ec compliance_governance)

if [[ "$PERCEIVE_EC" -ne 0 ]]; then
  FAILURE_CATEGORY="perceive_fail"
  REMEDIATION="Index canonical scripts; refresh public-edge; dod-gate --perceive until 0"
  UPSTREAM_ACTION="P1-INDEX-01"
elif [[ "$PUB_EC" -ne 0 ]]; then
  FAILURE_CATEGORY="public_edge_fail"
  REMEDIATION="Fix TLS/DNS; PUBLIC_WRITE_EVIDENCE=1 public_synthetic_check.sh"
  UPSTREAM_ACTION="P2-BILL-01"
elif [[ "$GOV_EC" -gt 2 ]]; then
  FAILURE_CATEGORY="compliance_hard"
  REMEDIATION="Resolve CVT hard violations"
  UPSTREAM_ACTION="P1-ADB-01"
elif [[ $HARD_FAIL -ne 0 ]]; then
  FAILURE_CATEGORY="cls_gate_fail"
  REMEDIATION="See learning/steps logs and DLQ"
  UPSTREAM_ACTION="P1-INDEX-01"
fi

OVERALL_EC=0
[[ $HARD_FAIL -ne 0 ]] && OVERALL_EC=1
[[ -n "$FAILURE_CATEGORY" ]] && append_dlq "$FAILURE_CATEGORY" "$REMEDIATION"

if [[ -n "$FAILURE_CATEGORY" ]] && [[ -f "$DLQ_PATH" ]]; then
  COUNT=$(grep -c "$FAILURE_CATEGORY" "$DLQ_PATH" 2>/dev/null || echo 0)
  [[ "$COUNT" -ge 3 ]] && BREAKTHROUGH=true
fi

LEARNING_PATH="$LEARNING_DIR/learning_${RUN_ID}.json"
export CLS_RUN_ID="$RUN_ID" CLS_HEAD="$HEAD_SHA" CLS_EC="$OVERALL_EC" CLS_CAT="$FAILURE_CATEGORY"
export CLS_HINT="$REMEDIATION" CLS_UPSTREAM="$UPSTREAM_ACTION" CLS_BT="$BREAKTHROUGH" CLS_PATH="$LEARNING_PATH"
python3 <<'PY'
import json, hashlib, os, time
path = os.environ["CLS_PATH"]
doc = {
  "gate": "continuous_learning_swarm",
  "run_id": os.environ["CLS_RUN_ID"],
  "head_sha": os.environ["CLS_HEAD"],
  "exit_code": int(os.environ["CLS_EC"]),
  "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
  "failure_category": os.environ["CLS_CAT"] or None,
  "remediation_hint": os.environ["CLS_HINT"] or None,
  "upstream_next_action_id": os.environ["CLS_UPSTREAM"] or None,
  "breakthrough_candidate": os.environ["CLS_BT"] == "true",
  "path": path,
}
doc["artifact_sha"] = hashlib.sha256(json.dumps(doc, sort_keys=True).encode()).hexdigest()
open(path, "w").write(json.dumps(doc, indent=2) + "\n")
d = os.path.dirname(path)
for name in ("latest_learning.json", "perceive_bundle.json"):
    open(os.path.join(d, name), "w").write(json.dumps(doc, indent=2) + "\n")
print(path)
PY

if [[ $OVERALL_EC -eq 0 ]]; then
  echo "Continuous Learning Swarm: PASS — $LEARNING_PATH"
  exit 0
fi
echo "Continuous Learning Swarm: FAIL — $LEARNING_PATH (DLQ: $DLQ_PATH)"
exit 1
