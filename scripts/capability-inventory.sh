#!/usr/bin/env bash
# @business-context WSJF: Pre-archive capability inventory for dashboards/scripts
# capability-inventory.sh — function names + entrypoints (JSON)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_JSON="${1:-$PROJECT_ROOT/reports/mover-ops/capability-inventory.json}"

mkdir -p "$(dirname "$OUT_JSON")"

python3 - "$PROJECT_ROOT" "$OUT_JSON" <<'PY'
import json, os, pathlib, re, sys

root = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])

targets = [
    root / "scripts" / "validation-core.sh",
    root / "scripts" / "validators" / "file" / "validation-runner.sh",
    root / "_SYSTEM" / "_AUTOMATION" / "validate-email.sh",
    root / "scripts" / "email-hash-db.sh",
]

caps = []
for path in targets:
    if not path.is_file():
        continue
    text = path.read_text(encoding="utf-8", errors="ignore")
    funcs = re.findall(r"^(?:function\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\)", text, re.M)
    caps.append({
        "path": str(path.relative_to(root)),
        "functions_found": len(funcs),
        "function_sample": funcs[:25],
    })

doc = {
    "contract": "capability_inventory",
    "version": "1.0",
    "capabilities": caps,
    "note": "Archive duplicates only after send gate + validation delta invariants pass on preserved set.",
}
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(doc, indent=2), encoding="utf-8")
print(json.dumps(doc, indent=2))
PY
