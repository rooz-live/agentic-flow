#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

grep -q '^AGENTICOW_VERSION=' "$ROOT/config/ruflo/version.env"
AF_SKIP_NETWORK=1 REPO_ROOT="$ROOT" python3 "$ROOT/scripts/ruflo/agenticow_probe.py" > /tmp/agenticow_probe.json
python3 - <<'PY'
import json
from pathlib import Path
doc = json.loads(Path("/tmp/agenticow_probe.json").read_text())
assert doc.get("schema") == "agenticow_probe.v1"
assert "version_pin" in doc and "degraded" in doc
print("OK agenticow_probe offline")
PY
echo "PASS agenticow_mcp_smoke"
