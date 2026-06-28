#!/usr/bin/env python3
"""Generate tests/e2e/tld-targets.generated.json from config/fqdn_registry.yaml (canonical)."""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    yaml = None  # type: ignore

REGISTRY_REL = "config/fqdn_registry.yaml"
OUT_REL = "tests/e2e/tld-targets.generated.json"


def repo_root() -> Path:
    env = os.environ.get("REPO_ROOT")
    if env:
        return Path(env)
    return Path(__file__).resolve().parents[2]


def _registry_domains(root: Path) -> list[dict]:
    if yaml is None:
        raise RuntimeError("PyYAML required")
    data = yaml.safe_load((root / REGISTRY_REL).read_text(encoding="utf-8")) or {}
    return [d for d in (data.get("domains") or []) if isinstance(d, dict)]


def build_targets(root: Path | None = None) -> dict:
    root = root or repo_root()
    targets: list[dict] = []
    missing_pattern: list[str] = []

    for entry in _registry_domains(root):
        if not entry.get("tld_gate"):
            continue
        fqdn = str(entry.get("fqdn") or "").strip()
        pattern = entry.get("gate_title_pattern")
        if not fqdn:
            continue
        if not pattern:
            missing_pattern.append(fqdn)
            continue
        item: dict = {
            "tld": fqdn,
            "url": f"https://{fqdn}/",
            "titlePattern": str(pattern),
            "flags": "i",
            "gate_tier": entry.get("gate_tier", "unknown"),
        }
        if entry.get("gate_redirects"):
            item["redirects"] = True
        targets.append(item)

    if missing_pattern:
        raise ValueError(
            f"tld_gate rows missing gate_title_pattern in {REGISTRY_REL}: {missing_pattern}"
        )
    if not targets:
        raise ValueError(f"no tld_gate rows in {REGISTRY_REL}")

    targets.sort(key=lambda t: t["tld"])
    return {
        "schema": "tld_targets.generated.v1",
        "source_registry": REGISTRY_REL,
        "targets": targets,
    }


def write_targets(root: Path | None = None) -> Path:
    root = root or repo_root()
    doc = build_targets(root)
    out = root / OUT_REL
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")
    return out


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)
    root = repo_root()

    if args.check:
        expected = json.dumps(build_targets(root), indent=2) + "\n"
        out = root / OUT_REL
        if not out.is_file() or out.read_text(encoding="utf-8") != expected:
            print(
                f"FAIL: {OUT_REL} stale — run pnpm run tld:targets:generate",
                file=sys.stderr,
            )
            return 1
        print(f"OK: {OUT_REL} matches registry")
        return 0

    path = write_targets(root)
    if args.json:
        print(json.dumps(json.loads(path.read_text(encoding="utf-8")), indent=2))
    else:
        print(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
