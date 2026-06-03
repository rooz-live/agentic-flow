#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
fail() { echo "FAIL: $*"; exit 1; }
python3 - "$ROOT" <<'PY'
import json, os, sys, yaml
root = sys.argv[1]
owners = json.load(open(os.path.join(root, "scripts/policy/gate_owners.json")))
co = owners["canonical_owners"]
cfg = yaml.safe_load(open(os.path.join(root, "config/cicd/continuous_learning.yaml")))
map_id = {"dod_gate_perceive": "dod_gate", "public_synthetic": "public_synthetic", "cog_edge_smoke": "edge_smoke"}
for g in cfg["gates"]:
    gid, script = g["id"], g.get("script")
    if gid not in map_id or not script:
        continue
    want = co[map_id[gid]]
    if script != want:
        raise SystemExit(f"{gid}: yaml={script} owners={want}")
    if not os.path.isfile(os.path.join(root, script)):
        raise SystemExit(f"missing file: {script}")
print("PASS cls_manifest_canonical")
PY
