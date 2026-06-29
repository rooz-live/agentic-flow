#!/usr/bin/env bash
# Contract tests for intel_pipeline_post_task.py.
# Tests:
#   T1: dry-run produces schema=intel_pipeline.v1 with judge + retrieve keys
#   T2: no dry-run + no receipt → exits 1 (fail-closed default; enforcement LIVE)
#   T3: --dry-run + no receipt → exits 0 (explicit escape hatch)
#   T4: non-PASS receipt → exits 1 (judge rejects FAIL receipt)
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

# ── T2: no dry-run + no receipt → exit 1 (fail-closed default) ───────────────
# Real JUDGE run (no AF_INTEL_PIPELINE_DRY) with no PASS receipt must FAIL. This
# inverts the old default-off `enforce` (dead-code branch → false green).
FAKE_ROOT="$(mktemp -d)"
mkdir -p "$FAKE_ROOT/.goalie/evidence/receipts"
# No tick_*.json files → _latest_receipt returns None → must exit 1.
set +e
REPO_ROOT="$FAKE_ROOT" \
  python3 "$ROOT/scripts/ruflo/intel_pipeline_post_task.py" >/dev/null 2>&1
T2_EXIT=$?
set -e
if [[ $T2_EXIT -eq 1 ]]; then
  _pass "T2 no-receipt real run exits 1 (fail-closed default; enforcement live)"
else
  _fail "T2 no-receipt real run should exit 1 but got $T2_EXIT (false-green theater!)"
fi

# ── T3: --dry-run + no receipt → exit 0 (explicit escape hatch) ──────────────
set +e
REPO_ROOT="$FAKE_ROOT" AF_INTEL_PIPELINE_DRY=1 \
  python3 "$ROOT/scripts/ruflo/intel_pipeline_post_task.py" >/dev/null 2>&1
T3_EXIT=$?
set -e
if [[ $T3_EXIT -eq 0 ]]; then
  _pass "T3 dry-run no-receipt exits 0 (explicit dry-run escape)"
else
  _fail "T3 dry-run no-receipt should exit 0 but got $T3_EXIT"
fi

# ── T4: non-PASS receipt (status=FAIL) → exit 1 (judge rejects it) ───────────
printf '{"status":"FAIL"}' > "$FAKE_ROOT/.goalie/evidence/receipts/tick_fail.json"
set +e
REPO_ROOT="$FAKE_ROOT" \
  python3 "$ROOT/scripts/ruflo/intel_pipeline_post_task.py" >/dev/null 2>&1
T4_EXIT=$?
set -e
if [[ $T4_EXIT -eq 1 ]]; then
  _pass "T4 non-PASS receipt exits 1 (judge rejects FAIL receipt)"
else
  _fail "T4 non-PASS receipt should exit 1 but got $T4_EXIT"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo "intel_pipeline_contract: $PASS_COUNT passed, $FAIL_COUNT failed"
[[ $FAIL_COUNT -eq 0 ]]
