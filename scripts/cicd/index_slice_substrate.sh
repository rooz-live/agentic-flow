#!/usr/bin/env bash
# index_slice_substrate.sh — P1-INDEX-02: bounded WSJF substrate indexing (never blocks perceive).
set -euo pipefail
source "$(dirname "$0")/lib/cls_common.sh"
cls_repo_root

MAX="${INDEX_SLICE_MAX:-25}"
DRY=0
[[ "${1:-}" == "--dry-run" ]] && DRY=1

MANIFEST="${REPO_ROOT}/.goalie/evidence/learning/index_substrate_manifest.json"
mkdir -p "$(dirname "$MANIFEST")"

export REPO_ROOT MAX DRY MANIFEST
python3 <<'PY'
import json, os, subprocess
from pathlib import Path

root = Path(os.environ["REPO_ROOT"])
max_n = int(os.environ["MAX"])
dry = os.environ["DRY"] == "1"
manifest = Path(os.environ["MANIFEST"])

# WSJF-ordered pathspecs (high-value substrate first; never gate-canonical-only tick)
priority_specs = [
    "scripts/governance/",
    "scripts/cicd/",
    "scripts/ci/",
    "tests/cicd/",
    "scripts/consolidation/",
    "src/billing/",
    "src/identity/",
    "src/eventops/",
    "src/ceremony/",
    "src/calculation/",
    "src/jobs/",
    "src/projects/",
    "src/eventstore/",
    "src/validation/",
    "src/rates/",
    "src/tax/",
    "src/rust/",
    "src/",
    "scripts/",
    "tests/",
    "config/",
]
skip_suffix = (".md", ".json", ".example", ".template", ".sample")
gate = set()
owners = root / "scripts/policy/gate_owners.json"
if owners.is_file():
    data = json.loads(owners.read_text())
    if isinstance(data.get("canonical_owners"), dict):
        gate.update(data["canonical_owners"].values())
    for key in ("legacy_dedupe_guard", "shims_only"):
        if isinstance(data.get(key), list):
            gate.update(data[key])

to_stage = []
for spec in priority_specs:
    try:
        out = subprocess.check_output(
            ["git", "-C", str(root), "ls-files", "--others", "--exclude-standard", "--", spec],
            text=True,
        )
    except subprocess.CalledProcessError:
        continue
    for p in out.splitlines():
        if not p or p.endswith(skip_suffix):
            continue
        if p in gate:
            continue
        if p not in to_stage:
            to_stage.append(p)
        if len(to_stage) >= max_n:
            break
    if len(to_stage) >= max_n:
        break

doc = {
    "slice": "P1-INDEX-02",
    "would_stage": len(to_stage),
    "paths": to_stage,
    "substrate_only": True,
}
print(json.dumps(doc))

if dry:
    raise SystemExit(0)

if not to_stage:
    manifest.write_text(json.dumps({**doc, "staged": []}, indent=2) + "\n")
    print("No substrate paths need staging.")
    raise SystemExit(0)

subprocess.run(["git", "-C", str(root), "add", "--"] + to_stage, check=True)
manifest.write_text(json.dumps({**doc, "staged": to_stage}, indent=2) + "\n")
print(f"Staged {len(to_stage)} substrate paths (manifest={manifest})")
PY
