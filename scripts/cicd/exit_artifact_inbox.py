#!/usr/bin/env python3
"""Exit-artifact inbox zero — track loop/reports noise before commit."""
from __future__ import annotations
import json, os, subprocess
from datetime import datetime, timezone
from pathlib import Path

def _git_status(root: Path) -> list[dict]:
    try:
        out = subprocess.check_output(["git", "-C", str(root), "status", "--porcelain"], text=True, timeout=30)
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, OSError):
        return []
    return [{"code": line[:2], "path": line[3:].strip()} for line in out.splitlines() if len(line) >= 4]

def _is_exit_artifact(path: str) -> bool:
    if path.startswith(".goalie/scorecards/") and path.endswith(("current.json", "required.json")):
        return False
    if path.startswith(".goalie/evidence/") and path.endswith("_latest.json"):
        return False
    if path.startswith((".goalie/", "reports/")) or path == "profile_readme.md":
        return True
    return False

def main() -> int:
    root = Path(os.environ.get("REPO_ROOT", Path(__file__).resolve().parents[2]))
    out = root / ".goalie/evidence/exit_artifact_inbox_latest.json"
    rows = _git_status(root)
    open_items = [r for r in rows if _is_exit_artifact(r["path"])]
    closed_items = [r for r in rows if not _is_exit_artifact(r["path"])]
    total = len(open_items) + len(closed_items)
    pct = (len(closed_items) / total * 100.0) if total else 100.0
    payload = {
        "schema": "exit_artifact_inbox.v1",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "open_count": len(open_items),
        "closed_count": len(closed_items),
        "pct_closed": round(pct, 2),
        "inbox_zero_gate": len(open_items) == 0,
        "open_items": open_items[:50],
        "velocity_fmt": f"{pct:.1f}.{len(open_items)}",
        "pace_fmt": "0.0" if not open_items else f"{len(open_items)}.0",
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"path": str(out), "open": len(open_items)}))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
