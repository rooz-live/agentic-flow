#!/usr/bin/env python3
"""Compare fqdn_registry.yaml domains vs TLD_TARGETS in tld-deploy-gate.spec.ts."""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    yaml = None  # type: ignore

GENERATED_REL = "tests/e2e/tld-targets.generated.json"
REGISTRY_REL = "config/fqdn_registry.yaml"
OUT_REL = ".goalie/evidence/tld_registry_drift.json"


def repo_root() -> Path:
    env = os.environ.get("REPO_ROOT")
    if env:
        return Path(env)
    return Path(__file__).resolve().parents[2]


def _tld_targets_from_generated(gen_path: Path) -> set[str]:
    if not gen_path.is_file():
        return set()
    data = json.loads(gen_path.read_text(encoding="utf-8"))
    return {str(t.get("tld")) for t in (data.get("targets") or []) if t.get("tld")}


def _registry_entries(registry_path: Path) -> list[dict]:
    if yaml is None or not registry_path.is_file():
        return []
    data = yaml.safe_load(registry_path.read_text(encoding="utf-8")) or {}
    return [e for e in (data.get("domains") or []) if isinstance(e, dict)]


def _registry_domains(registry_path: Path) -> set[str]:
    return {str(e.get("fqdn")) for e in _registry_entries(registry_path) if e.get("fqdn")}


def compute_drift(root: Path | None = None) -> dict:
    root = root or repo_root()
    spec_tlds = _tld_targets_from_generated(root / GENERATED_REL)
    registry = _registry_domains(root / REGISTRY_REL)
    registry_by_tier: dict[str, set[str]] = {"smoke": set(), "billing": set(), "apex": set(), "other": set()}
    for entry in _registry_entries(root / REGISTRY_REL):
        tier = str(entry.get("gate_tier", "other")).lower()
        fqdn = str(entry.get("fqdn", ""))
        if not fqdn:
            continue
        registry_by_tier.setdefault(tier, set()).add(fqdn)

    # Missing from registry: always an error (gate can't run without registry row).
    only_spec = sorted(spec_tlds - registry)
    # Registry-only domains are expected — the registry is the canonical inventory;
    # the TLD gate is the smoke subset. We still surface them for visibility.
    only_registry = sorted(registry - spec_tlds)

    return {
        "schema": "metrics.tld_registry_drift.v1",
        "generated_path": GENERATED_REL,
        "registry_path": REGISTRY_REL,
        "spec_count": len(spec_tlds),
        "registry_count": len(registry),
        "registry_by_tier": {tier: len(v) for tier, v in registry_by_tier.items()},
        "only_in_spec": only_spec,
        "only_in_registry": only_registry,
        "drift": bool(only_spec),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="TLD registry drift detector")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)
    root = repo_root()
    report = compute_drift(root)
    out_path = root / OUT_REL
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print(json.dumps({"path": str(out_path), "drift": report["drift"]}, indent=2))
    if report["drift"] and os.environ.get("AF_TLD_REGISTRY_ENFORCE", "0") == "1":
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
