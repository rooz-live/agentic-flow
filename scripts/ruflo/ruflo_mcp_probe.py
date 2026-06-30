#!/usr/bin/env python3
"""Ruflo MCP smoke — tool list / degraded path for utilization policy."""
from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


def _ruflo_version(root: Path) -> str | None:
    vf = root / "config/ruflo/version.env"
    if vf.is_file():
        for line in vf.read_text(encoding="utf-8").splitlines():
            if line.startswith("RUFLO_VERSION="):
                return line.split("=", 1)[1].strip()
    return os.environ.get("RUFLO_VERSION")


def _probe_tools(root: Path, ver: str) -> tuple[int, bool, str]:
    if os.environ.get("AF_SKIP_NETWORK", "0") == "1":
        return 0, True, "skipped_offline"
    try:
        proc = subprocess.run(
            ["npx", "--yes", f"ruflo@{ver}", "mcp", "tools"],
            cwd=str(root),
            capture_output=True,
            text=True,
            timeout=90,
            check=False,
        )
        if proc.returncode != 0:
            return 0, True, "degraded"
        text = proc.stdout or ""
        count = max(text.count("\n"), 1) if text.strip() else 0
        return count, False, "ok"
    except (OSError, subprocess.TimeoutExpired):
        return 0, True, "degraded"


def main() -> int:
    root = Path(os.environ.get("REPO_ROOT", Path(__file__).resolve().parents[2]))
    ver = _ruflo_version(root)
    if ver is None:
        print("FATAL: RUFLO_VERSION unset and config/ruflo/version.env missing (drift guard)", file=sys.stderr)
        return 1
    tool_count, degraded, status = _probe_tools(root, ver)
    payload = {
        "schema": "ruflo_mcp_probe.v1",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "ruflo_version": ver,
        "mcp_tool_count": tool_count,
        "degraded": degraded,
        "mcp_status": status,
    }
    out = root / ".goalie/evidence/ruflo_mcp_probe_latest.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload))
    if os.environ.get("AF_RUFLO_MCP_ENFORCE", "0") == "1" and degraded:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
