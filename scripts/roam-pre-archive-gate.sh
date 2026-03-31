#!/usr/bin/env bash
# @business-context WSJF: Pre-archive ROAM gate — no delete until R/O/A/M satisfied
# @constraint DDD-OPS: Classifies repo artifacts by reversibility before cleanup
# roam-pre-archive-gate.sh — read-only classification + retention matrix (JSON)
#
# Usage: ./scripts/roam-pre-archive-gate.sh
# Output: reports/mover-ops/roam-retention-classification.json

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPORT_DIR="$PROJECT_ROOT/reports/mover-ops"
OUT_JSON="$REPORT_DIR/roam-retention-classification.json"
ROAM_FILE="${ROAM_TRACKER_PATH:-$PROJECT_ROOT/ROAM_TRACKER.yaml}"

mkdir -p "$REPORT_DIR"

export PROJECT_ROOT ROAM_FILE OUT_JSON

python3 <<'PY'
import json
import os
import pathlib
import re
from datetime import datetime, timezone

def roam_open_count(roam_path: pathlib.Path) -> int:
    if not roam_path.is_file():
        return 0
    open_n = 0
    for line in roam_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        m = re.match(r"\s*status:\s*([A-Za-z_]+)", line)
        if not m:
            continue
        if m.group(1).strip().lower() not in {"resolved", "mitigated", "closed"}:
            open_n += 1
    return open_n

project_root = pathlib.Path(os.environ["PROJECT_ROOT"])
out_path = pathlib.Path(os.environ["OUT_JSON"])
roam_path = pathlib.Path(os.environ["ROAM_FILE"])

seeds = [
    "scripts/validation-core.sh",
    "scripts/validators/file/validation-runner.sh",
    "_SYSTEM/_AUTOMATION/validate-email.sh",
    "scripts/email-hash-db.sh",
    "scripts/ay.sh",
    "scripts/advocate",
    "scripts/orchestrators/cascade-tunnel.sh",
]
artifacts = []
for rel in seeds:
    tier = "recoverable"
    if any(x in rel for x in ("validation-core", "validation-runner", "validate-email")):
        tier = "irreplaceable"
    artifacts.append({
        "path": rel,
        "reversibility_tier": tier,
        "pre_archive_action": "snapshot_hash_then_keep",
    })

matrix = [
    {"decision": "keep", "targets": "validators, automation, ROAM, legal email trees", "risk": "capability_loss"},
    {"decision": "archive", "targets": "aged dashboard snapshots, duplicate reports", "risk": "low_if_indexed"},
    {"decision": "compress", "targets": "large log aggregates >30d", "risk": "low"},
    {"decision": "prune", "targets": "docker build cache, npm caches, re-creatable only", "risk": "none_if_ROAM_ok"},
]

gate = {
    "R_resolve": "Identify must-keep assets (validators, unique workflows, legal correspondence).",
    "O_own": "Owner per class: ops=docker/cache, eng=reports, legal=emails.",
    "A_accept": "Acceptable loss: re-creatable caches only; never legal or validator source without backup.",
    "M_mitigate": "Snapshot: git tag, tar manifest under reports/mover-ops/, hash index before prune.",
}

ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
open_n = roam_open_count(roam_path)

doc = {
    "contract": "roam_pre_archive_gate",
    "version": "1.0",
    "generated_at": ts,
    "roam_tracker": str(roam_path),
    "roam_open_items": open_n,
    "gate": gate,
    "retention_decision_matrix": matrix,
    "artifacts": artifacts,
    "blocking": open_n > 96,
}

out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text(json.dumps(doc, indent=2), encoding="utf-8")
print(json.dumps(doc, indent=2))
PY

echo "[roam-pre-archive-gate] Wrote $OUT_JSON" >&2
