#!/usr/bin/env python3
"""Canonical scorecard path resolver for earnings / receipt / hire chain."""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

# Scorecard JSON only — never coherence gate artifacts.
CANDIDATE_REL_PATHS = (
    ".goalie/scorecards/current.json",
    ".goalie/scorecards/latest.json",
)


def repo_root() -> Path:
    env = os.environ.get("REPO_ROOT")
    if env:
        return Path(env)
    return Path(__file__).resolve().parents[2]


def is_scorecard_document(doc: dict[str, Any]) -> bool:
    """True when doc matches originality/impact scorecard shape (not coherence_results)."""
    if not isinstance(doc, dict):
        return False
    if doc.get("gate") == "coherence" or "coherence" in doc and "originality" not in doc:
        return False
    return isinstance(doc.get("originality"), dict) and isinstance(doc.get("impact"), dict)


def resolve_scorecard_path(root: Path | None = None) -> Path | None:
    root = root or repo_root()
    override = os.environ.get("AF_SCORECARD_PATH") or os.environ.get("AF_SCORECARD_FILE")
    if override:
        path = Path(override)
        if not path.is_absolute():
            path = root / path
        if path.is_file():
            try:
                doc = json.loads(path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                return None
            return path if is_scorecard_document(doc) else None
    for rel in CANDIDATE_REL_PATHS:
        path = root / rel
        if not path.is_file():
            continue
        try:
            doc = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        if is_scorecard_document(doc):
            return path
    return None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Resolve canonical scorecard path")
    parser.add_argument("--resolve-path", action="store_true", help="Print resolved path or exit 1")
    parser.add_argument("--json", action="store_true", help="Emit JSON {path, ok}")
    args = parser.parse_args(argv)
    path = resolve_scorecard_path()
    if args.json:
        print(json.dumps({"path": str(path) if path else None, "ok": path is not None}))
        return 0 if path else 1
    if args.resolve_path:
        if path is None:
            return 1
        print(path)
        return 0
    parser.print_help()
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
