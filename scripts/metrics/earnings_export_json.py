#!/usr/bin/env python3
"""Export latest earnings summary for web/hire sync."""
from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import importlib.util

def _load_earnings_engine():
    eng_path = Path(__file__).resolve().parent / "earnings_engine.py"
    spec = importlib.util.spec_from_file_location("earnings_engine", eng_path)
    mod = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(mod)
    return mod

_ee = _load_earnings_engine()
LEDGER_PATH = _ee.LEDGER_PATH
calculate_earnings = _ee.calculate_earnings


def repo_root() -> Path:
    env = os.environ.get("REPO_ROOT")
    if env:
        return Path(env)
    return Path(__file__).resolve().parents[2]


def _latest_ledger_entry(root: Path) -> dict[str, Any] | None:
    ledger = root / LEDGER_PATH
    if not ledger.is_file():
        return None
    last_line = ""
    with ledger.open(encoding="utf-8") as fh:
        for line in fh:
            if line.strip():
                last_line = line.strip()
    if not last_line:
        return None
    try:
        return json.loads(last_line)
    except json.JSONDecodeError:
        return None


def _latest_scorecard(root: Path) -> dict[str, Any] | None:
    for pattern in ("coherence_results.json", ".goalie/scorecards/latest.json"):
        path = root / pattern
        if path.is_file():
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                continue
    return None


def build_export(root: Path | None = None) -> dict[str, Any]:
    root = root or repo_root()
    ledger = _latest_ledger_entry(root)
    scorecard = _latest_scorecard(root)
    earnings = ledger.get("earnings") if ledger else None
    if earnings is None and scorecard:
        earnings = calculate_earnings(scorecard)
    return {
        "schema": "metrics.earnings_export.v1",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "head_sha": scorecard.get("verification", {}).get("commit") if scorecard else None,
        "earnings": earnings or {},
        "source": "ledger" if ledger else ("scorecard" if scorecard else "empty"),
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Export earnings_latest.json")
    parser.add_argument("--output", default=None, help="Output path override")
    args = parser.parse_args(argv)
    root = repo_root()
    payload = build_export(root)
    if args.output == "-":
        print(json.dumps(payload, indent=2))
        return 0
    out = Path(args.output) if args.output else root / ".goalie" / "evidence" / "earnings_latest.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"path": str(out), "source": payload["source"]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
