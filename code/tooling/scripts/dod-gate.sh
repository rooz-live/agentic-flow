#!/usr/bin/env bash
# Unified DoR/DoD gate — pre-task perception (index + artifacts), post-task proof.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="${REPO_ROOT:-$(git -C "$ROOT/../.." rev-parse --show-toplevel 2>/dev/null || echo "$(cd "$ROOT/../.." && pwd)")}"
export REPO_ROOT
# shellcheck source=lib/evidence_json.sh
source "$ROOT/scripts/lib/evidence_json.sh"
ensure_monorepo_repo_root "$ROOT" || exit 1

MODE="${1:-}"
SLICE="${AGENT_SLICE:-publication}"
SCRIPTS="$ROOT/scripts"
REPO_SCRIPTS="$REPO_ROOT/scripts"

usage() {
  echo "Usage: $0 --pre-task | --post-task | --perceive [kind]"
  exit 1
}

pre_task() {
  echo "=== dod-gate --pre-task (slice=$SLICE) ==="
  if [[ -x "$SCRIPTS/agent_session_dor.sh" ]]; then
    AGENT_SLICE="$SLICE" "$SCRIPTS/agent_session_dor.sh"
  elif [[ -x "$REPO_SCRIPTS/agent_session_dor.sh" ]]; then
    AGENT_SLICE="$SLICE" "$REPO_SCRIPTS/agent_session_dor.sh"
  fi
  for kind in public-edge domain-probes; do
    if perceive_evidence "$kind" "${EVIDENCE_TTL_SEC:-86400}"; then
      echo "skip rerun: $kind (artifact matches HEAD)"
    else
      echo "need run: $kind (no valid artifact for HEAD)"
    fi
  done
  tracked="$(git -C "$REPO_ROOT" ls-files 'code/tooling/scripts/*.sh' 'tooling/scripts/*.sh' 2>/dev/null | wc -l | tr -d ' ')"
  echo "INFO tracked tooling scripts: $tracked"
}

post_task() {
  echo "=== dod-gate --post-task (slice=$SLICE) ==="
  local fail=0
  if [[ "$SLICE" == "publication" ]] || [[ "$SLICE" == "all" ]]; then
    if ! perceive_evidence "public-edge" "${EVIDENCE_TTL_SEC:-86400}"; then
      if [[ -x "$SCRIPTS/public_synthetic_check.sh" ]]; then
        PUBLIC_WRITE_EVIDENCE=1 "$SCRIPTS/public_synthetic_check.sh" || fail=1
      elif [[ -x "$REPO_ROOT/code/tooling/scripts/public_synthetic_check.sh" ]]; then
        PUBLIC_WRITE_EVIDENCE=1 "$REPO_ROOT/code/tooling/scripts/public_synthetic_check.sh" || fail=1
      fi
    fi
    if ! perceive_evidence "domain-probes" "${EVIDENCE_TTL_SEC:-86400}"; then
      [[ -x "$REPO_SCRIPTS/verify-domain-probes.sh" ]] && "$REPO_SCRIPTS/verify-domain-probes.sh" || fail=1
    fi
  fi
  if [[ -d "$REPO_ROOT/tests/billing" ]] && [[ "$SLICE" == "billing" ]]; then
    python3 -m pytest "$REPO_ROOT/tests/billing/" "$REPO_ROOT/tests/unit/" -q --tb=line || fail=1
  fi
  if ! git -C "$REPO_ROOT" diff --cached --stat 2>/dev/null | grep -q .; then
    echo "WARN nothing staged — commit claim rejected (CVT)"
    fail=1
  fi
  [[ "$fail" -eq 0 ]] || exit 1
  echo "=== dod-gate --post-task passed ==="
}

perceive_only() {
  local kind="${2:-public-edge}"
  local fail=0 head tracked untracked_n trust_ok=0 edge_ok=0

  head="$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || echo unknown)"
  tracked="$(git -C "$REPO_ROOT" ls-files scripts/ tests/ config/ code/tooling/scripts/ 2>/dev/null | wc -l | tr -d ' ')"
  read -r untracked_n untracked_substrate < <(REPO_ROOT="$REPO_ROOT" PERCEIVE_UNTRACKED_MODE="gate" python3 - <<'PY'
import json, os, subprocess
root = os.environ.get("REPO_ROOT", ".")
mode = os.environ.get("PERCEIVE_UNTRACKED_MODE", "gate")
pathspecs = ["scripts/", "tests/", "config/", "code/tooling/scripts/"]
skip_suffix = (".md", ".json", ".example", ".template", ".sample")
gate_paths = set()
owners = os.path.join(root, "scripts/policy/gate_owners.json")
if os.path.isfile(owners):
    data = json.load(open(owners))
    if isinstance(data.get("canonical_owners"), dict):
        gate_paths.update(data["canonical_owners"].values())
    for key in ("legacy_dedupe_guard", "shims_only"):
        if isinstance(data.get(key), list):
            gate_paths.update(data[key])
allow = {
    "code/tooling/scripts/dod-gate.sh", "code/tooling/scripts/agent_session_dor.sh",
    "code/tooling/scripts/lib/evidence_json.sh", "code/tooling/scripts/public_synthetic_check.sh",
    "scripts/cicd/continuous_learning_swarm.sh", "scripts/cicd/perceive_tick.sh",
    "scripts/cicd/index_slice_allowlist.sh", "scripts/cicd/wave_autopilot.sh",
    "scripts/consolidation/w3_index_gates_batch.sh",
    "scripts/governance/compliance_as_code.py", "scripts/policy/gate_owners.json",
    "config/cicd/continuous_learning.yaml", "config/cicd/loop_prompts.yaml",
}
gate_paths.update(allow)
bad = []
try:
    for spec in pathspecs:
        for p in subprocess.check_output(
            ["git", "-C", root, "ls-files", "--others", "--exclude-standard", "--", spec],
            text=True,
        ).splitlines():
            if p.endswith(skip_suffix):
                continue
            bad.append(p)
except subprocess.CalledProcessError:
    print("0 0"); raise SystemExit
gate_bad = [p for p in bad if p in gate_paths]
if mode == "substrate":
    print(len(bad), len(bad))
else:
    print(len(gate_bad), len(bad))
PY
)
  if [[ -x "$REPO_SCRIPTS/perceive-trust-artifact.sh" ]]; then
    "$REPO_SCRIPTS/perceive-trust-artifact.sh" --check >/dev/null 2>&1 && trust_ok=1
  elif bash "$REPO_ROOT/scripts/one.sh" verify-contract "$REPO_ROOT/.goalie/evidence/last_gate_one_pass.json" >/dev/null 2>&1; then
    trust_ok=1
  fi

  perceive_evidence "$kind" "${EVIDENCE_TTL_SEC:-86400}" 2>/dev/null && edge_ok=1

  HEAD="$head" TRACKED="$tracked" UNTRACKED="$untracked_n" UNTRACKED_SUBSTRATE="$untracked_substrate" TRUST_OK="$trust_ok" EDGE_OK="$edge_ok" KIND="$kind" python3 - <<'PY'
import json, os
print(json.dumps({
  "head_sha": os.environ.get("HEAD", ""),
  "tracked_index_count": int(os.environ.get("TRACKED", "0") or 0),
  "untracked_critical": int(os.environ.get("UNTRACKED", "0") or 0),
  "untracked_substrate_total": int(os.environ.get("UNTRACKED_SUBSTRATE", "0") or 0),
  "trust_artifact_ok": os.environ.get("TRUST_OK") == "1",
  "public_edge_perceive_ok": os.environ.get("EDGE_OK") == "1",
  "perceive_kind": os.environ.get("KIND", "public-edge"),
}, indent=2))
PY

  [[ "$trust_ok" -eq 1 ]] || fail=1
  [[ "$untracked_n" -eq 0 ]] || fail=1
  if [[ "$fail" -eq 0 ]]; then
    echo "PERCEIVE OK (trust=$trust_ok untracked=$untracked_n tracked=$tracked)"
  else
    echo "PERCEIVE FAIL (trust=$trust_ok untracked=$untracked_n tracked=$tracked)" >&2
    exit 1
  fi
}

case "$MODE" in
  --pre-task) pre_task ;;
  --post-task) post_task ;;
  --perceive) perceive_only "$@" ;;
  *) usage ;;
esac
