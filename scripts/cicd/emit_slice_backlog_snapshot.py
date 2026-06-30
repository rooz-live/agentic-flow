#!/usr/bin/env python3
"""Write slice backlog inbox-zero snapshot to evidence."""
from __future__ import annotations
import json, os
from datetime import datetime, timezone
from pathlib import Path

try:
    import yaml
except ImportError:
    yaml = None


def main() -> int:
    root = Path(os.environ.get("REPO_ROOT", Path(__file__).resolve().parents[2]))
    backlog_path = root / "config/cicd/ruflo_slice_backlog.yaml"
    out = root / ".goalie/evidence/ruflo_slice_backlog_latest.json"
    doc = yaml.safe_load(backlog_path.read_text()) if yaml and backlog_path.is_file() else {}
    inbox = root / ".goalie/evidence/inbox_zero_latest.json"
    exit_art = root / ".goalie/evidence/exit_artifact_inbox_latest.json"
    payload = {
        "schema": "ruflo_slice_backlog_snapshot.v1",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "backlog_schema": doc.get("schema"),
        "slice_count": len(doc.get("slices") or []),
        "aspirational_open": len(doc.get("aspirational") or []),
        "slices": [{"id": s.get("id"), "status": s.get("status")} for s in (doc.get("slices") or [])],
    }
    if inbox.is_file():
        payload["inbox_zero"] = json.loads(inbox.read_text())
    if exit_art.is_file():
        payload["exit_artifacts"] = json.loads(exit_art.read_text())
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"path": str(out), "aspirational_open": payload["aspirational_open"]}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
