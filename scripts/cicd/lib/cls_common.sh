#!/usr/bin/env bash
set -euo pipefail
cls_repo_root() {
  if [[ -z "${REPO_ROOT:-}" ]]; then
    local here
    here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [[ "$here" == */scripts/cicd/lib ]]; then
      REPO_ROOT="$(cd "$here/../../.." && pwd)"
    else
      REPO_ROOT="$(cd "$here/../.." && pwd)"
    fi
  fi
  cd "$REPO_ROOT"
  export REPO_ROOT="$PWD"
}
cls_head_sha() { git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || echo unknown; }
cls_dod_gate() { echo "$REPO_ROOT/code/tooling/scripts/dod-gate.sh"; }
cls_public_synthetic() { echo "$REPO_ROOT/code/tooling/scripts/public_synthetic_check.sh"; }
cls_cog_smoke() { echo "$REPO_ROOT/tooling/scripts/cog_edge_smoke.sh"; }
cls_untracked_counts() {
  REPO_ROOT="$REPO_ROOT" PERCEIVE_UNTRACKED_MODE="${PERCEIVE_UNTRACKED_MODE:-gate}" python3 - <<'PY'
import json, os, subprocess
root = os.environ["REPO_ROOT"]
mode = os.environ.get("PERCEIVE_UNTRACKED_MODE", "gate")
specs = ["scripts/", "tests/", "config/", "code/tooling/scripts/"]
skip = (".md", ".json", ".example", ".template", ".sample")
gate = set()
o = os.path.join(root, "scripts/policy/gate_owners.json")
if os.path.isfile(o):
    d = json.load(open(o))
    if isinstance(d.get("canonical_owners"), dict):
        gate.update(d["canonical_owners"].values())
    for k in ("legacy_dedupe_guard", "shims_only"):
        if isinstance(d.get(k), list):
            gate.update(d[k])
gate.update([
    "scripts/cicd/wave_autopilot.sh", "scripts/cicd/perceive_reader.sh",
    "scripts/cicd/edge_writer.sh", "scripts/cicd/index_tick.sh",
    "scripts/cicd/policy_compliance.sh", "scripts/cicd/lib/cls_common.sh",
])
bad = []
for spec in specs:
    out = subprocess.check_output(
        ["git", "-C", root, "ls-files", "--others", "--exclude-standard", "--", spec],
        text=True,
    )
    for p in out.splitlines():
        if p and not p.endswith(skip):
            bad.append(p)
gb = [p for p in bad if p in gate]
if mode == "substrate":
    print(len(bad), len(bad))
else:
    print(len(gb), len(bad))
PY
}
cls_public_edge_ok() {
  python3 - "$REPO_ROOT" "$(cls_head_sha)" <<'PY'
import json, os, sys
root, head = sys.argv[1:3]
lat = os.path.join(root, ".goalie/evidence/public-edge/latest.json")
if not os.path.isfile(lat):
    sys.exit(1)
meta = json.load(open(lat))
p = meta.get("path")
if not p or not os.path.isfile(p):
    sys.exit(1)
doc = json.load(open(p))
ok = str(doc.get("exit_code")) == "0"
if doc.get("head_sha"):
    ok = ok and doc["head_sha"] == head
sys.exit(0 if ok else 1)
PY
}
cls_trust_ok() {
  if [[ -x "$REPO_ROOT/scripts/perceive-trust-artifact.sh" ]]; then
    "$REPO_ROOT/scripts/perceive-trust-artifact.sh" --check >/dev/null 2>&1 && return 0
  fi
  bash "$REPO_ROOT/scripts/one.sh" verify-contract "$REPO_ROOT/.goalie/evidence/last_gate_one_pass.json" >/dev/null 2>&1
}
