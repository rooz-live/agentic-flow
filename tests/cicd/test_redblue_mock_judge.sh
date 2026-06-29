#!/usr/bin/env bash
# Slow-tier: @metaharness/redblue --mock-judge against harness agent manifest (offline, $0).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
MANIFEST="$ROOT/apps/agent-harness/.harness/manifest.json"
EVIDENCE="$ROOT/.goalie/evidence/redblue_mock_judge_latest.json"
OUT="$(mktemp -d)/report.json"
mkdir -p "$(dirname "$EVIDENCE")"

[[ -f "$MANIFEST" ]] || { echo "FAIL: missing harness manifest $MANIFEST"; exit 1; }

RB_CLI=""
if [[ -x "$ROOT/apps/agent-harness/node_modules/@metaharness/redblue/dist/cli/index.js" ]]; then
  RB_CLI="$ROOT/apps/agent-harness/node_modules/@metaharness/redblue/dist/cli/index.js"
elif command -v npx >/dev/null; then
  npm install --no-save --prefix "$ROOT/apps/agent-harness" "@metaharness/redblue@0.1.4" >/dev/null 2>&1 || true
  RB_CLI="$ROOT/apps/agent-harness/node_modules/@metaharness/redblue/dist/cli/index.js"
fi
[[ -f "$RB_CLI" ]] || { echo "FAIL: @metaharness/redblue not installed"; exit 1; }

node "$RB_CLI" run --mock-judge --tests 3 --out "$OUT" >/dev/null
[[ -f "$OUT" ]] || { echo "FAIL: redblue report not written"; exit 1; }

python3 - "$MANIFEST" "$OUT" "$EVIDENCE" <<'PY'
import json, hashlib, sys
from datetime import datetime, timezone
from pathlib import Path
manifest, report, evidence = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
rep = json.loads(report.read_text(encoding="utf-8"))
sha = hashlib.sha256(manifest.read_bytes()).hexdigest()[:16]
payload = {
    "schema": "redblue_mock_judge.v1",
    "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "manifest": str(manifest),
    "manifest_sha256_prefix": sha,
    "mock_judge": True,
    "tests_run": rep.get("summary", {}).get("tests_run"),
    "failures_found": rep.get("summary", {}).get("failures_found"),
    "gates_passed": rep.get("gates_passed"),
    "report_path": str(report),
}
evidence.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
assert payload["tests_run"] == 3, payload
print("PASS redblue_mock_judge harness manifest")
PY
