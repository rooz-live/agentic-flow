#!/usr/bin/env bash
# test_disk_steward.sh — asserts REAL disk_steward behavior (not just schema presence).
#
# Anti-CVT: the old test only checked `schema == "disk_steward.v1"` and that
# `disk_used_pct` existed — a green exit that proved nothing about the steward's
# enforce/apply/gate branches. This exercises them with a forced-low threshold so the
# critical-disk path is deterministic (does not depend on the host's real disk state).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

EVIDENCE="$ROOT/.goalie/evidence/disk_steward_latest.json"
STEWARD="$ROOT/scripts/cicd/disk_steward.sh"

# ---------------------------------------------------------------------------
# 1) Probe run with a forced-low threshold so the low-disk branch is exercised
#    deterministically (any real disk is > 1% used → low == True).
#    Asserts: schema, disk_used_pct, inbox_zero_gate (bool), git_fsck_rc (int),
#    and roam_risk == R-DISK-01 when disk_used_pct >= threshold.
# ---------------------------------------------------------------------------
echo "--- disk_steward: probe (AF_DISK_SKIP_LOOSE_COUNT=1 AF_DISK_SKIP_GIT_FSCK=1 AF_DISK_FSCK_CONNECTIVITY_ONLY=1 AF_DISK_LOW_PCT=1) ---"
AF_DISK_SKIP_LOOSE_COUNT=1 AF_DISK_SKIP_GIT_FSCK=1 AF_DISK_FSCK_CONNECTIVITY_ONLY=1 AF_DISK_LOW_PCT=1 bash "$STEWARD" >/dev/null

python3 - "$EVIDENCE" <<'PY'
import json, sys
from pathlib import Path

doc = json.loads(Path(sys.argv[1]).read_text())

# Core contract
assert doc.get("schema") in ("disk_steward.v1", "disk_steward.v1.1"), f"schema={doc.get('schema')!r}"
assert "disk_used_pct" in doc, "missing disk_used_pct"

# (1) inbox_zero_gate present and boolean
assert "inbox_zero_gate" in doc, "missing inbox_zero_gate"
assert isinstance(doc["inbox_zero_gate"], bool), f"inbox_zero_gate={doc['inbox_zero_gate']!r} not bool"

# (2) git_fsck_rc present and an integer
assert "git_fsck_rc" in doc, "missing git_fsck_rc"
assert isinstance(doc["git_fsck_rc"], int), f"git_fsck_rc={doc['git_fsck_rc']!r} not int"

# (5) roam_risk populated when disk_used_pct >= low threshold (forced to 1).
pct = doc.get("disk_used_pct")
if pct is not None and pct >= 1:
    assert doc.get("roam_risk") == "R-DISK-01", (
        f"roam_risk={doc.get('roam_risk')!r} expected 'R-DISK-01' (pct={pct} >= threshold)"
    )

print("PASS disk_steward: probe + field contracts")
PY

# ---------------------------------------------------------------------------
# 3) Enforce mode + critical disk → MUST exit non-zero (exit 2).
#    This is the contract that makes the steward a real gate, not advisory-only.
# ---------------------------------------------------------------------------
echo "--- disk_steward: enforce (AF_DISK_STEWARD_ENFORCE=1, AF_DISK_LOW_PCT=1) ---"
set +e
AF_DISK_SKIP_LOOSE_COUNT=1 AF_DISK_STEWARD_ENFORCE=1 AF_DISK_SKIP_LOOSE_COUNT=1 AF_DISK_SKIP_GIT_FSCK=1 AF_DISK_FSCK_CONNECTIVITY_ONLY=1 AF_DISK_LOW_PCT=1 bash "$STEWARD" >/dev/null 2>&1
ENF_RC=$?
set -e
if [[ "$ENF_RC" -ne 2 ]]; then
    echo "FAIL disk_steward: enforce expected exit 2 on critical disk, got $ENF_RC" >&2
    exit 1
fi
echo "PASS disk_steward: enforce exits 2 on critical disk"

echo "--- disk_steward: enforce-negative (AF_DISK_STEWARD_ENFORCE=1, AF_DISK_LOW_PCT=101) ---"
set +e
AF_DISK_SKIP_LOOSE_COUNT=1 AF_DISK_STEWARD_ENFORCE=1 AF_DISK_SKIP_GIT_FSCK=1 AF_DISK_FSCK_CONNECTIVITY_ONLY=1 AF_DISK_LOW_PCT=101 bash "$STEWARD" >/dev/null 2>&1
ENF_NEG_RC=$?
set -e
if [[ "$ENF_NEG_RC" -ne 0 ]]; then
    echo "FAIL disk_steward: enforce-negative expected exit 0 when disk not critical, got $ENF_NEG_RC" >&2
    exit 1
fi
echo "PASS disk_steward: enforce-negative exits 0 when disk is under threshold"

# ---------------------------------------------------------------------------
# 4) Apply mode → `applied` and `failed` arrays MUST exist in the evidence.
#    FORCE_APPLY (AF_DISK_SKIP_LOOSE_COUNT=1 AF_DISK_STEWARD_APPLY=1) drives remediation regardless of pct;
#    outcomes are recorded honestly (applied only on rc==0, else failed[]).
# ---------------------------------------------------------------------------
echo "--- disk_steward: apply (AF_DISK_STEWARD_APPLY=1) ---"
AF_DISK_SKIP_LOOSE_COUNT=1 AF_DISK_SKIP_NPM_CACHE=1 AF_DISK_SKIP_GIT_GC=1 AF_DISK_SKIP_GIT_REPACK=1 AF_DISK_SKIP_GIT_FSCK=1 AF_DISK_STEWARD_APPLY=1 bash "$STEWARD" >/dev/null

python3 - "$EVIDENCE" <<'PY'
import json, sys
from pathlib import Path

doc = json.loads(Path(sys.argv[1]).read_text())
assert isinstance(doc.get("applied"), list), f"applied must be a list, got {type(doc.get('applied'))}"
assert isinstance(doc.get("failed"), list), f"failed must be a list, got {type(doc.get('failed'))}"
# Every failed entry must carry its id + rc (no silent swallow of remediation failure).
for entry in doc["failed"]:
    assert isinstance(entry, dict) and "id" in entry and "rc" in entry, (
        f"failed entry missing id/rc: {entry!r}"
    )
print("PASS disk_steward: apply emits applied[] + failed[] (honest outcomes)")
PY

echo "PASS disk_steward (all assertions)"
