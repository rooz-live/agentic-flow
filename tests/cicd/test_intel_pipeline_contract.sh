#!/usr/bin/env bash
# Contract tests for intel_pipeline_post_task.py.
# Tests:
#   T1: dry-run produces schema=intel_pipeline.v1 with judge + retrieve keys
#   T2: enforce=1 + no receipt → exits 1 (enforce path is NOT dead weight)
#   T3: enforce=0 + no receipt → exits 0 (default safe)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
PASS_COUNT=0
FAIL_COUNT=0

_pass() { echo "PASS $1"; PASS_COUNT=$((PASS_COUNT+1)); }
_fail() { echo "FAIL $1"; FAIL_COUNT=$((FAIL_COUNT+1)); }

# ── T1: dry-run schema contract ───────────────────────────────────────────────
bash scripts/cicd/intel_pipeline_tick.sh --dry-run
python3 - <<'PY'
import json
from pathlib import Path
p = Path(".goalie/evidence/intel_pipeline_latest.json")
doc = json.loads(p.read_text())
assert doc.get("schema") == "intel_pipeline.v1", f"schema wrong: {doc}"
# dry-run uses flat keys; post_task uses steps.* — both are valid
has_retrieve = "retrieve" in doc or "retrieve" in doc.get("steps", {})
has_judge    = "judge" in doc or "judge" in doc.get("steps", {})
assert has_retrieve, f"retrieve missing: {doc}"
assert has_judge, f"judge missing: {doc}"
print("PASS T1 intel pipeline dry-run schema")
PY
PASS_COUNT=$((PASS_COUNT+1))

# ── T2: enforce=1 + no receipt → exit 1 ──────────────────────────────────────
# Run in a tmp evidence dir with no receipts so receipt=None path fires.
TMPDIR_EVIDENCE="$(mktemp -d)"
FAKE_ROOT="$(mktemp -d)"
mkdir -p "$FAKE_ROOT/.goalie/evidence/receipts"
# No tick_*.json files → _latest_receipt returns None → enforce=1 must exit 1
set +e
REPO_ROOT="$FAKE_ROOT" AF_INTEL_PIPELINE_ENFORCE=1 \
  python3 "$ROOT/scripts/ruflo/intel_pipeline_post_task.py" >/dev/null 2>&1
T2_EXIT=$?
set -e
if [[ $T2_EXIT -eq 1 ]]; then
  _pass "T2 enforce=1 no-receipt exits 1 (enforce path live)"
else
  _fail "T2 enforce=1 no-receipt should exit 1 but got $T2_EXIT (enforce is dead weight!)"
fi

# ── T3: enforce=0 + no receipt → exit 0 (default safe) ───────────────────────
set +e
REPO_ROOT="$FAKE_ROOT" AF_INTEL_PIPELINE_ENFORCE=0 \
  python3 "$ROOT/scripts/ruflo/intel_pipeline_post_task.py" >/dev/null 2>&1
T3_EXIT=$?
set -e
if [[ $T3_EXIT -eq 0 ]]; then
  _pass "T3 enforce=0 no-receipt exits 0 (default safe)"
else
  _fail "T3 enforce=0 no-receipt should exit 0 but got $T3_EXIT"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo "intel_pipeline_contract: $PASS_COUNT passed, $FAIL_COUNT failed"
[[ $FAIL_COUNT -eq 0 ]]
