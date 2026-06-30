#!/usr/bin/env bash
# Contract: memory_graph.yaml tier backends align with .claude-flow/config.yaml memory keys.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
python3 - <<'PY'
import yaml
from pathlib import Path

root = Path(".")
mg_path = root / "config/ruflo/memory_graph.yaml"
rc_path = root / ".claude-flow/config.yaml"
assert mg_path.is_file(), f"missing {mg_path}"
assert rc_path.is_file(), f"missing {rc_path}"

mg = yaml.safe_load(mg_path.read_text())
rc = yaml.safe_load(rc_path.read_text())
mem = rc.get("memory") or {}

assert mg.get("schema") == "ruflo_memory_graph.v1", mg.get("schema")
tiers = mg.get("tiers") or {}
for name in ("hot", "warm", "quality", "durable", "graph"):
    assert name in tiers, f"missing tier {name}"

assert (mg.get("bindings") or {}).get("ruflo_config") == ".claude-flow/config.yaml"

assert tiers["hot"].get("backend") == "ruflo_hybrid"
assert mem.get("backend") == "hybrid"
assert mem.get("persistPath")

assert tiers["warm"].get("backend") == "agentdb"
assert (mem.get("learningBridge") or {}).get("enabled") is True

assert tiers["quality"].get("backend") == "aqe"
assert str(tiers["quality"].get("path", "")).endswith("memory.db")

assert tiers["durable"].get("backend") == "beads"
assert tiers["durable"].get("path") == ".beads"

assert tiers["graph"].get("backend") == "gitnexus"
mg_cfg = mem.get("memoryGraph") or {}
assert mg_cfg.get("enabled") is True
for key in ("pageRankDamping", "maxNodes", "similarityThreshold"):
    assert key in mg_cfg, f"missing memoryGraph.{key}"

print("PASS memory_graph_tiers")
PY
