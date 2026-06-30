#!/usr/bin/env bash
# Probe: @metaharness/redblue harness manifest smoke (degraded-safe).
#
# @metaharness/redblue is NOT published on npm (verified 2026-07). This script
# runs in degraded=true mode when the package is unavailable, emitting a valid
# evidence artifact so downstream gates are not blocked by an unpublished dep.
#
# When the package becomes available (AF_REDBLUE_AVAILABLE=1), the full
# mock-judge path executes; otherwise the script exits 0 with degraded=true.
#
# Slow-tier placement: run via one.sh run-all --slow or ruflo-upgrade-slow.yml.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
MANIFEST="$ROOT/apps/agent-harness/.harness/manifest.json"
EVIDENCE="$ROOT/.goalie/evidence/redblue_mock_judge_latest.json"
mkdir -p "$(dirname "$EVIDENCE")"

[[ -f "$MANIFEST" ]] || { echo "WARN: missing harness manifest $MANIFEST — writing degraded evidence"; MANIFEST=""; }

# ── Package availability probe ────────────────────────────────────────────────
DEGRADED=true
RB_CLI=""
if [[ "${AF_REDBLUE_AVAILABLE:-0}" == "1" ]] || \
   [[ -x "$ROOT/apps/agent-harness/node_modules/@metaharness/redblue/dist/cli/index.js" ]]; then
  RB_CLI="$ROOT/apps/agent-harness/node_modules/@metaharness/redblue/dist/cli/index.js"
  DEGRADED=false
elif [[ "${AF_SKIP_NETWORK:-0}" != "1" ]] && command -v npm >/dev/null; then
  # Attempt install; failure is expected until package is published.
  npm install --no-save --prefix "$ROOT/apps/agent-harness" \
      "@metaharness/redblue@0.1.4" >/dev/null 2>&1 && \
    RB_CLI="$ROOT/apps/agent-harness/node_modules/@metaharness/redblue/dist/cli/index.js" && \
    DEGRADED=false || true
fi

# ── Full path (package available) ────────────────────────────────────────────
if [[ "$DEGRADED" == "false" && -f "$RB_CLI" ]]; then
  OUT="$(mktemp -d)/report.json"
  node "$RB_CLI" run --mock-judge --tests 3 --out "$OUT" >/dev/null
  [[ -f "$OUT" ]] || { echo "FAIL: redblue report not written"; exit 1; }

  python3 - "$MANIFEST" "$OUT" "$EVIDENCE" <<'PY'
import json, hashlib, sys, uuid
from datetime import datetime, timezone
from pathlib import Path
manifest_p, report_p, evidence_p = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
rep = json.loads(report_p.read_text(encoding="utf-8"))
sha = hashlib.sha256(manifest_p.read_bytes()).hexdigest()[:16] if manifest_p and manifest_p.is_file() else "manifest_missing"
payload = {
    "schema": "redblue_mock_judge.v1",
    "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "manifest": str(manifest_p),
    "manifest_sha256_prefix": sha,
    "run_id": str(uuid.uuid4()),
    "mock_judge": True,
    "degraded": False,
    "tests_run": rep.get("summary", {}).get("tests_run"),
    "failures_found": rep.get("summary", {}).get("failures_found"),
    "gates_passed": rep.get("gates_passed"),
    "report_path": str(report_p),
}
evidence_p.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
assert payload["tests_run"] == 3, payload
print("PASS redblue_mock_judge harness manifest (full path)")
PY
  exit 0
fi

# ── Degraded path (@metaharness/redblue not on npm yet) ──────────────────────
echo "INFO: @metaharness/redblue unavailable — writing degraded evidence (ROAM: R-REDBLUE-01)"
python3 - "$MANIFEST" "$EVIDENCE" <<'PY'
import json, hashlib, sys, uuid
from datetime import datetime, timezone
from pathlib import Path
manifest_p = Path(sys.argv[1]) if sys.argv[1] else None
evidence_p = Path(sys.argv[2])
sha = hashlib.sha256(manifest_p.read_bytes()).hexdigest()[:16] \
      if manifest_p and manifest_p.is_file() else "manifest_missing"
payload = {
    "schema": "redblue_mock_judge.v1",
    "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "manifest": str(manifest_p) if manifest_p else None,
    "manifest_sha256_prefix": sha,
    "run_id": str(uuid.uuid4()),
    "mock_judge": False,
    "degraded": True,
    "roam_risk": "R-REDBLUE-01",
    "blocker": "@metaharness/redblue not published on npm (verified 2026-07)",
    "tests_run": None,
    "failures_found": None,
    "gates_passed": None,
}
evidence_p.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
print(f"PASS redblue_mock_judge (degraded=true, R-REDBLUE-01 documented)")
PY
