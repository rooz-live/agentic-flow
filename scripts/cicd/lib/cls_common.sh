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

cls_loop_prompts_path() { echo "$REPO_ROOT/config/cicd/loop_prompts.yaml"; }

cls_budget_get() {
  local key="${1:?key}" default="${2:-}"
  python3 - "$REPO_ROOT" "$key" "$default" <<'PY'
import os, sys, yaml
root, key, default = sys.argv[1:4]
path = os.path.join(root, "config/cicd/loop_prompts.yaml")
if not os.path.isfile(path):
    print(default)
    raise SystemExit(0)
cfg = yaml.safe_load(open(path)) or {}
budget = cfg.get("budget") or {}
val = budget
for part in key.split("."):
    if isinstance(val, dict) and part in val:
        val = val[part]
    else:
        print(default)
        raise SystemExit(0)
print(val)
PY
}

cls_load_wave_retry_max() {
  if [[ -n "${WAVE_RETRY_MAX:-}" ]]; then
    export WAVE_RETRY_MAX
    return 0
  fi
  local from_yaml
  from_yaml="$(cls_budget_get max_remediate_retries 2)"
  export WAVE_RETRY_MAX="$from_yaml"
}

cls_refuse_auto_commit_on_main() {
  [[ "${CLS_AUTO_COMMIT:-0}" != "1" ]] && return 0
  local branch="${CLS_BRANCH_OVERRIDE:-$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)}"
  if [[ "$branch" == "main" || "$branch" == "master" ]]; then
    echo "ERROR: CLS_AUTO_COMMIT=1 refused on protected branch: $branch" >&2
    return 1
  fi
  return 0
}

cls_warn_session_tick_budget() {
  local tick_count="${LOOP_TICK_COUNT:-0}"
  [[ "$tick_count" -eq 0 ]] && return 0
  local reset_at
  reset_at="$(cls_budget_get session.max_ticks_before_reset 5)"
  if [[ "$tick_count" -gt "$reset_at" ]]; then
    echo "WARN: LOOP_TICK_COUNT=$tick_count exceeds session max_ticks_before_reset=$reset_at (summarize/reset recommended)" >&2
  fi
}
