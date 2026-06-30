#!/usr/bin/env bash
# Slow contract: ruflo MCP probe (offline degraded path + schema).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
grep -q '^RUFLO_VERSION=' "$ROOT/config/ruflo/version.env"
AF_SKIP_NETWORK=1 REPO_ROOT="$ROOT" python3 "$ROOT/scripts/ruflo/ruflo_mcp_probe.py" > /tmp/ruflo_mcp_probe.json
python3 - <<'PY'
import json
from pathlib import Path
doc = json.loads(Path("/tmp/ruflo_mcp_probe.json").read_text())
assert doc.get("schema") == "ruflo_mcp_probe.v1"
assert doc.get("degraded") is True
assert doc.get("mcp_status") == "skipped_offline"
print("OK ruflo_mcp_probe offline degraded")
PY
echo "PASS ruflo_mcp_smoke"
