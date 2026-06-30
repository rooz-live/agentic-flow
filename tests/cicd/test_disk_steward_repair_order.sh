#!/usr/bin/env bash
# test_disk_steward_repair_order.sh — REPAIR tier ordering vs COMPACT preconditions.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

STEWARD="$ROOT/scripts/cicd/disk_steward.sh"
CORE_LIB="$ROOT/scripts/cicd/lib"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

git init -q "$TMP"
git -C "$TMP" config user.email "steward@test.local"
git -C "$TMP" config user.name "steward"
git -C "$TMP" commit --allow-empty -m "init" >/dev/null
# Broken tag ref (invalid object)
printf '%s\n' "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef" > "$TMP/.git/refs/tags/broken-tag"

_common_env() {
  export REPO_ROOT="$TMP"
  export PYTHONPATH="${CORE_LIB}${PYTHONPATH:+:$PYTHONPATH}"
  unset AF_DISK_SKIP_GIT_FSCK || true
  export AF_DISK_SKIP_LOOSE_COUNT=1
  export AF_DISK_SKIP_NPM_CACHE=1
  export AF_DISK_SKIP_GIT_REPACK=1
  export AF_DISK_LOW_PCT=101
  export AF_DISK_STEWARD_APPLY=1
}

echo "--- repair_order: apply without REPAIR (gc must skip) ---"
_common_env
unset AF_DISK_STEWARD_REPAIR || true
AF_DISK_STEWARD_APPLY=1 bash "$STEWARD" >/dev/null

python3 - "$TMP/.goalie/evidence/disk_steward_latest.json" <<'PY'
import json, sys
from pathlib import Path
doc = json.loads(Path(sys.argv[1]).read_text())
assert doc.get("schema") == "disk_steward.v1.1", doc.get("schema")
actions = doc.get("actions") or []
gc = next((a for a in actions if a.get("id") == "git-gc"), None)
assert gc, "missing git-gc action"
assert gc.get("status") == "skipped", gc
reason = gc.get("skipped_reason") or ""
assert "git-fsck-connectivity-ok" in reason, reason
print("PASS repair_order: gc skipped without REPAIR")
PY

echo "--- repair_order: REPAIR=1 deletes tag then gc applies ---"
_common_env
export AF_DISK_STEWARD_REPAIR=1
AF_DISK_STEWARD_REPAIR=1 bash "$STEWARD" >/dev/null

if git -C "$TMP" rev-parse broken-tag >/dev/null 2>&1; then
  echo "FAIL: broken-tag still present after REPAIR" >&2
  exit 1
fi

python3 - "$TMP/.goalie/evidence/disk_steward_latest.json" <<'PY'
import json, sys
from pathlib import Path
doc = json.loads(Path(sys.argv[1]).read_text())
actions = doc.get("actions") or []
ids = [a.get("id") for a in actions]
# broken-tag-delete (or repair skip) before git-gc in action list
try:
    repair_idx = next(i for i, a in enumerate(actions) if a.get("id") == "broken-tag-delete")
    gc_idx = next(i for i, a in enumerate(actions) if a.get("id") == "git-gc")
except StopIteration:
    raise SystemExit(f"missing actions in {ids}")
assert repair_idx < gc_idx, f"ordering repair={repair_idx} gc={gc_idx}"
repair = actions[repair_idx]
assert repair.get("status") == "applied", repair
gc = actions[gc_idx]
assert gc.get("status") == "applied", gc
print("PASS repair_order: tag repair before gc")
PY

echo "PASS test_disk_steward_repair_order"
