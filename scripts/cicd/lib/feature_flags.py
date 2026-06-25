#!/usr/bin/env python3
"""Read feature flag roll-forward registry (config/cicd/feature_flags.yaml)."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:
    yaml = None  # type: ignore

VALID_STAGES = frozenset({"dev", "stg", "prod"})


def repo_root() -> Path:
    env = os.environ.get("REPO_ROOT")
    if env:
        return Path(env)
    return Path(__file__).resolve().parents[3]


def registry_path(root: Path | None = None) -> Path:
    root = root or repo_root()
    return root / "config" / "cicd" / "feature_flags.yaml"


def load_registry(root: Path | None = None) -> dict[str, Any]:
    path = registry_path(root)
    if not path.is_file() or yaml is None:
        return {}
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def get_flag(name: str, *, root: Path | None = None, default: Any = None) -> Any:
    reg = load_registry(root)
    flags = reg.get("flags") or {}
    entry = flags.get(name)
    if not isinstance(entry, dict):
        return default
    return entry.get("default", default)


def flag_meta(name: str, *, root: Path | None = None) -> dict[str, Any] | None:
    reg = load_registry(root)
    flags = reg.get("flags") or {}
    entry = flags.get(name)
    return entry if isinstance(entry, dict) else None


def validate_registry(root: Path | None = None) -> list[str]:
    errors: list[str] = []
    reg = load_registry(root)
    flags = reg.get("flags")
    if not isinstance(flags, dict):
        return ["flags section missing or not a mapping"]
    for name, entry in flags.items():
        if not isinstance(entry, dict):
            errors.append(f"{name}: entry must be a mapping")
            continue
        stage = entry.get("rollout_stage")
        if stage not in VALID_STAGES:
            errors.append(f"{name}: invalid rollout_stage {stage!r}")
        if "default" not in entry:
            errors.append(f"{name}: missing default")
        if entry.get("rollback_forbidden") is not True:
            errors.append(f"{name}: rollback_forbidden must be true")
    return errors
