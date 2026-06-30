#!/usr/bin/env bash
# Probe: @metaharness/weight-eft gate (degraded-safe, probe-only).
#
# @metaharness/weight-eft is declared in apps/agent-harness devDependencies but
# NOT published on the npm registry (verified 2026-07). This runs
# scripts/cicd/weight_eft_gate.py (wired as `one.sh weight-eft`) and asserts the
# degraded evidence shape so downstream gates are not blocked by an unpublished,
# degraded_ok dependency.
#
# It is deliberately NOT wired into any production install / tick_post path
# (no post-50-PASS-receipt hook). Slow-tier: one.sh run-all --slow.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

# Offline ⇒ degraded path: package_available=false (no network round-trip).
AF_SKIP_NETWORK=1 python3 "$ROOT/scripts/cicd/weight_eft_gate.py" >/dev/null
EVIDENCE="$ROOT/.goalie/evidence/weight_eft_gate_latest.json"

python3 - "$EVIDENCE" <<'PY'
import json, sys
from pathlib import Path
p = Path(sys.argv[1])
assert p.is_file(), f"missing evidence {p}"
doc = json.loads(p.read_text(encoding="utf-8"))
assert doc["schema"] == "weight_eft_gate.v1", doc.get("schema")
# Declared in apps/agent-harness/package.json devDependencies (@metaharness/weight-eft).
assert doc["package_declared"] is True, doc
# Not on npm + AF_SKIP_NETWORK=1 ⇒ unavailable ⇒ degraded (probe-only).
assert doc["package_available"] is False, doc
assert doc["degraded"] is True, doc
assert doc["ready"] is False, doc
assert doc["action"] == "spike_deferred", doc
print("PASS weight_eft_probe (degraded=true, probe-only)")
PY
