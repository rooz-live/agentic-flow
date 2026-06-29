#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
python3 - <<'PY'
import yaml
from pathlib import Path
doc = yaml.safe_load(Path("config/ruflo/plugins.yaml").read_text())
assert doc.get("schema") == "ruflo_plugins.v1"
plugins = doc.get("plugins") or []
assert len(plugins) >= 3
assert all(p.get("package") for p in plugins)
print("PASS ruflo plugins manifest contract")
PY
