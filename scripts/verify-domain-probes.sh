#!/usr/bin/env bash
# External domain probe scaffold (read-only checks).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

OUT_DIR="${ROOT}/.goalie/evidence/domain-probes"
mkdir -p "$OUT_DIR"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="${OUT_DIR}/probe_${RUN_ID}.json"

export RUN_ID OUT_FILE
python3 - <<"PY"
import json, os, subprocess, sys
from datetime import datetime, timezone

domains = [
    "mesh.tag.ooo",
    "mesh.bhopti.com",
    "mesh.rooz.live",
    "pass.tag.ooo",
    "git.tag.ooo",
    "summerjobswap.com",
]
run_id = os.environ["RUN_ID"]
out_file = os.environ["OUT_FILE"]
results = []
for domain in domains:
    code = 0
    msg = "reachable"
    try:
        subprocess.run(
            ["curl", "-fsSIL", "--max-time", "10", f"https://{domain}/"],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except subprocess.CalledProcessError:
        code = 1
        msg = "unreachable_or_tls_error"
    results.append({"domain": domain, "code": code, "message": msg})

payload = {
    "run_id": run_id,
    "timestamp_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "results": results,
}
with open(out_file, "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=2)
print(f"run_id={run_id}")
print(f"evidence={out_file}")
sys.exit(2 if any(r["code"] == 1 for r in results) else 0)
PY
