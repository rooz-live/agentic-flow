#!/usr/bin/env python3
"""Export latest verified earnings summary for web/hire sync."""
from __future__ import annotations

import argparse
import importlib.util
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    sys.path.insert(0, str(path.parent))
    spec.loader.exec_module(mod)
    return mod


def repo_root() -> Path:
    env = os.environ.get("REPO_ROOT")
    if env:
        return Path(env)
    return Path(__file__).resolve().parents[2]


_metrics = Path(__file__).resolve().parent
_ee = _load_module("earnings_engine", _metrics / "earnings_engine.py")
_sr = _load_module("scorecard_resolver", _metrics / "scorecard_resolver.py")
LEDGER_PATH = _ee.LEDGER_PATH
resolve_scorecard_path = _sr.resolve_scorecard_path


def _latest_verified_ledger_entry(root: Path) -> dict[str, Any] | None:
    ledger = root / LEDGER_PATH
    if not ledger.is_file():
        return None
    verified: dict[str, Any] | None = None
    with ledger.open(encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            if entry.get("verified") is True and entry.get("earnings"):
                verified = entry
    return verified


def build_export(root: Path | None = None, *, require_verified: bool = True) -> dict[str, Any]:
    root = root or repo_root()
    ledger = _latest_verified_ledger_entry(root)
    scorecard_path = resolve_scorecard_path(root)
    earnings = ledger.get("earnings") if ledger else None
    source = "empty"
    head_sha = None
    scorecard_ref = str(scorecard_path) if scorecard_path else None

    if earnings:
        source = "ledger_verified"
        head_sha = ledger.get("commit")
    elif not require_verified and scorecard_path:
        # Legacy advisory path — disabled by default for receipt chain.
        source = "scorecard_unverified_blocked"

    if require_verified and not earnings:
        return {
            "schema": "metrics.earnings_export.v1",
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "head_sha": head_sha,
            "scorecard": scorecard_ref,
            "earnings": {},
            "source": source,
            "verified": False,
            "error": "no verified ledger entry",
        }

    return {
        "schema": "metrics.earnings_export.v1",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "head_sha": head_sha,
        "scorecard": scorecard_ref,
        "earnings": earnings or {},
        "source": source,
        "verified": bool(earnings),
        "ledger_timestamp": ledger.get("timestamp") if ledger else None,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Export earnings_latest.json")
    parser.add_argument("--output", default=None, help="Output path override")
    parser.add_argument(
        "--require-verified",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Only export verified ledger entries (default: true)",
    )
    args = parser.parse_args(argv)
    root = repo_root()
    payload = build_export(root, require_verified=args.require_verified)
    if args.require_verified and not payload.get("verified"):
        print(json.dumps(payload, indent=2), file=sys.stderr)
        return 1
    if args.output == "-":
        print(json.dumps(payload, indent=2))
        return 0
    out = Path(args.output) if args.output else root / ".goalie/evidence/earnings_latest.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"path": str(out), "source": payload["source"], "verified": payload.get("verified")}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
