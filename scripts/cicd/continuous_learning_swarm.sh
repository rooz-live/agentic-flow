#!/usr/bin/env bash
# continuous_learning_swarm.sh — Observe → learn → gate (modular split design)
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"
export REPO_ROOT="$PROJECT_ROOT"
export COGNITUM_WEBHOOK_SECRET=""

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
DLQ_MAP="${PROJECT_ROOT}/config/cicd/dlq_roam_mapping.yaml"
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

# Run the split steps modularly
run_step cog_edge_smoke bash tooling/scripts/cog_edge_smoke.sh
run_step dod_gate_perceive bash code/tooling/scripts/dod-gate.sh --perceive

run_step perceive bash scripts/cicd/perceive_reader.sh
run_step index_tick bash scripts/cicd/index_tick.sh
run_step public_synthetic bash scripts/cicd/edge_writer.sh
run_step compliance_policy bash scripts/cicd/policy_compliance.sh

FAILURE_CATEGORY=""
REMEDIATION=""
UPSTREAM_ACTION=""
BREAKTHROUGH=false

# Read step statuses
set +e
SMOKE_EC=$(cat "/tmp/cls_ec_cog_edge_smoke" 2>/dev/null || echo 0)
PERCEIVE_EC=$(cat "/tmp/cls_ec_perceive" 2>/dev/null || echo 1)
INDEX_EC=$(cat "/tmp/cls_ec_index_tick" 2>/dev/null || echo 1)
PUB_EC=$(cat "/tmp/cls_ec_public_synthetic" 2>/dev/null || echo 1)
COMP_EC=$(cat "/tmp/cls_ec_compliance_policy" 2>/dev/null || echo 1)
set -e

if [[ "$PERCEIVE_EC" -ne 0 ]]; then
  FAILURE_CATEGORY="perceive_fail"
  REMEDIATION="Index canonical scripts; refresh public-edge; dod-gate --perceive until 0"
  UPSTREAM_ACTION="P1-INDEX-01"
elif [[ "$INDEX_EC" -ne 0 ]]; then
  FAILURE_CATEGORY="index_fail"
  REMEDIATION="Staging critical files using scripts/cicd/wave_autopilot.sh"
  UPSTREAM_ACTION="P1-INDEX-01"
elif [[ "$PUB_EC" -ne 0 ]]; then
  FAILURE_CATEGORY="public_edge_fail"
  REMEDIATION="Fix TLS/DNS; PUBLIC_WRITE_EVIDENCE=1 public_synthetic_check.sh"
  UPSTREAM_ACTION="P2-BILL-01"
elif [[ "$COMP_EC" -ne 0 ]]; then
  FAILURE_CATEGORY="trust_stale"
  REMEDIATION="Resolve CVT compliance rule violations"
  UPSTREAM_ACTION="P1-ADB-01"
elif [[ "$SMOKE_EC" -ne 0 ]]; then
  FAILURE_CATEGORY="cog_smoke_secret"
  REMEDIATION="Configure COGNITUM_WEBHOOK_SECRET and check edge path mapping"
  UPSTREAM_ACTION="P1-INDEX-01"
elif [[ $HARD_FAIL -ne 0 ]]; then
  FAILURE_CATEGORY="cls_gate_fail"
  REMEDIATION="See learning/steps logs and DLQ"
  UPSTREAM_ACTION="P1-INDEX-01"
fi

OVERALL_EC=0
[[ $HARD_FAIL -ne 0 ]] && OVERALL_EC=1
[[ -n "$FAILURE_CATEGORY" ]] && append_dlq "$FAILURE_CATEGORY" "$REMEDIATION"

if [[ -n "$FAILURE_CATEGORY" ]]; then
  python3 "$PROJECT_ROOT/scripts/cicd/lib/dlq_roam_apply.py" "$FAILURE_CATEGORY" "$RUN_ID" "$PROJECT_ROOT" || true
fi

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
