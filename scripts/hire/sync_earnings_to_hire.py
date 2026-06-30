#!/usr/bin/env python3
"""Export latest earnings and sync them to hire.agentics.org via MCP.

Usage:
    python3 scripts/hire/sync_earnings_to_hire.py [--email s@rooz.live] [--dry-run]

Pipeline:
    1. Run earnings_export_json.py to build earnings_latest.json.
    2. POST the earnings payload to hire.agentics.org/api/mcp via hire_mcp_client.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
EARNINGS_EXPORT = ROOT / "scripts" / "metrics" / "earnings_export_json.py"
HIRE_CLIENT = ROOT / "scripts" / "hire" / "hire_mcp_client.py"


def _load_hire_client():
    spec = importlib.util.spec_from_file_location("hire_mcp_client", HIRE_CLIENT)
    assert spec is not None and spec.loader is not None
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _build_earnings_export() -> dict:
    proc = subprocess.run(
        ["python3", str(EARNINGS_EXPORT), "--require-verified", "--output", "-"],
        capture_output=True,
        text=True,
        timeout=60,
        cwd=str(ROOT),
    )
    if proc.returncode != 0:
        raise RuntimeError(f"earnings_export_json failed: {proc.stderr}")
    return json.loads(proc.stdout)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Sync earnings to hire.agentics.org")
    parser.add_argument("--email", default="s@rooz.live", help="Candidate email")
    parser.add_argument("--dry-run", action="store_true", help="Print payload without sending")
    args = parser.parse_args(argv)

    export = _build_earnings_export()
    if not export.get("verified"):
        print(
            json.dumps({"error": "refuse unverified earnings export", "export": export}, indent=2),
            file=sys.stderr,
        )
        return 1
    earnings_data = export.get("earnings", {})
    if isinstance(earnings_data, dict):
        earnings_data = [earnings_data]
    payload = {"method": "earnings/sync", "earnings": earnings_data}

    if args.dry_run:
        print(json.dumps({"email": args.email, "payload": payload}, indent=2))
        return 0

    client = _load_hire_client()
    result = client.sync_profile(email=args.email, payload=payload)
    print(json.dumps(result, indent=2))

    if client.mcp_jsonrpc.error_message(result):
        return 1
    status = result.get("status_code")
    if status and str(status) not in {"200", "201", "202"}:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
