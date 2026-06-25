#!/usr/bin/env python3
"""Resolve OpenRouter LLM tiers for scoped AQE cycles."""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:
    yaml = None  # type: ignore

DEFAULT_TIER = "standard"
VALID_TIERS = frozenset({"free", "standard"})


def repo_root() -> Path:
    env = os.environ.get("REPO_ROOT")
    if env:
        return Path(env)
    return Path(__file__).resolve().parents[3]


def registry_path(root: Path | None = None) -> Path:
    root = root or repo_root()
    return root / "config" / "cicd" / "llm_model_registry.yaml"


def load_registry(root: Path | None = None) -> dict[str, Any]:
    path = registry_path(root)
    if not path.is_file() or yaml is None:
        return {}
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def resolve_model(tier: str, root: Path | None = None) -> dict[str, Any]:
    """Return model id, provider, tier env exports, and echo path."""
    root = root or repo_root()
    reg = load_registry(root)
    tiers = reg.get("tiers") or {}
    if tier not in VALID_TIERS:
        raise ValueError(f"unknown tier {tier!r}; expected one of {sorted(VALID_TIERS)}")

    entry = tiers.get(tier) or {}
    model_id = str(entry.get("model_id", ""))
    if not model_id:
        raise ValueError(f"tier {tier!r} missing model_id in {registry_path(root)}")

    aqe_env = dict(entry.get("aqe_env") or {})
    aqe_env.setdefault("AQE_MODEL", model_id)
    aqe_env.setdefault("OPENROUTER_MODEL", model_id)

    free_tier = tiers.get("free") or {}
    aqe_env.setdefault("AQE_FREE_TIER_MODEL", str(free_tier.get("model_id", "google/gemma-4-31b-it")))

    return {
        "tier": tier,
        "model_id": model_id,
        "provider": str(reg.get("provider", "openrouter")),
        "description": entry.get("description", ""),
        "echo_storage_path": str(reg.get("echo_storage_path", ".goalie/evidence/llm_echo/")),
        "compare_ref": reg.get("compare_ref"),
        "aqe_env": aqe_env,
        "env_keys": reg.get("env_keys") or {},
    }


def export_env(tier: str, root: Path | None = None) -> dict[str, str]:
    """Env dict for AQE / OpenRouter (string values only)."""
    resolved = resolve_model(tier, root)
    out: dict[str, str] = {}
    for key, value in resolved["aqe_env"].items():
        out[str(key)] = str(value)
    out["AQE_LLM_TIER"] = tier
    return out


def export_shell(tier: str, root: Path | None = None) -> str:
    """Emit shell export statements for eval."""
    lines = []
    for key, value in export_env(tier, root).items():
        safe = value.replace("'", "'\"'\"'")
        lines.append(f"export {key}='{safe}'")
    return "\n".join(lines) + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="OpenRouter LLM tier registry for AQE")
    parser.add_argument("--tier", default=os.environ.get("AQE_LLM_TIER", DEFAULT_TIER))
    parser.add_argument("--json", action="store_true", help="Print resolved tier as JSON")
    parser.add_argument("--export-shell", action="store_true", help="Print shell export statements")
    args = parser.parse_args(argv)

    try:
        if args.export_shell:
            sys.stdout.write(export_shell(args.tier))
            return 0
        payload = resolve_model(args.tier) if args.json else export_env(args.tier)
        print(json.dumps(payload, indent=2))
        return 0
    except (ValueError, OSError) as exc:
        print(f"llm_model_registry: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
