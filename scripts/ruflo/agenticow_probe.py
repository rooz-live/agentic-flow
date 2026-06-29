#!/usr/bin/env python3
"""Probe agenticow CLI/MCP availability — offline-safe degraded path."""
from __future__ import annotations
import json, os, subprocess
from datetime import datetime, timezone
from pathlib import Path

def _version(root: Path) -> str:
    vf = root / "config/ruflo/version.env"
    if vf.is_file():
        for line in vf.read_text(encoding="utf-8").splitlines():
            if line.startswith("AGENTICOW_VERSION="):
                return line.split("=", 1)[1].strip().lstrip("~^>=< ")
    return "0.2.3"

def _mcp_smoke(root: Path, ver: str) -> str:
    if os.environ.get("AF_SKIP_NETWORK", "0") == "1":
        return "skipped"
    try:
        proc = subprocess.run(
            ["npx", "--yes", f"agenticow@{ver}", "mcp", "list"],
            cwd=str(root), capture_output=True, text=True, timeout=60, check=False,
        )
        return "ok" if proc.returncode == 0 else "degraded"
    except (OSError, subprocess.TimeoutExpired):
        return "degraded"


def main() -> int:
    root = Path(os.environ.get("REPO_ROOT", Path(__file__).resolve().parents[2]))
    ver = _version(root)
    degraded = False
    cli_ok = False
    if os.environ.get("AF_SKIP_NETWORK", "0") == "1":
        degraded = True
    else:
        try:
            proc = subprocess.run(
                ["npx", "--yes", f"agenticow@{ver}", "--version"],
                cwd=str(root), capture_output=True, text=True, timeout=45, check=False,
            )
            cli_ok = proc.returncode == 0
            degraded = not cli_ok
        except (OSError, subprocess.TimeoutExpired):
            degraded = True
    payload = {
        "schema": "agenticow_probe.v1",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "version_pin": ver,
        "cli_ok": cli_ok,
        "degraded": degraded,
        "mcp_smoke": _mcp_smoke(root, ver) if os.environ.get("AF_AGENTICOW_MCP_SMOKE") else ("skipped" if degraded else "not_run"),
    }
    out = root / ".goalie/evidence/agenticow_probe_latest.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload))
    if os.environ.get("AF_AGENTICOW_ENFORCE", "0") == "1" and degraded:
        return 1
    return 0

if __name__ == "__main__":
    import sys
    if "--mcp-smoke" in sys.argv:
        os.environ["AF_AGENTICOW_MCP_SMOKE"] = "1"
    raise SystemExit(main())
