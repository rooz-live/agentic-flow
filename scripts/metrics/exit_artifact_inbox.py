#!/usr/bin/env python3
"""Count ephemeral evidence noise; emit exit_artifact_inbox_latest.json."""
from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path

SCHEMA = "exit_artifact_inbox.v1"
LATEST_SUFFIX = "_latest"
EPHEMERAL_PATTERNS = (
    re.compile(r"^dor_cache_.*\.lock$"),
    re.compile(r"^tick_bootstrap.*\.log$"),
    re.compile(r"^tick_bootstrap_latest\.log$"),
)
NON_LATEST_JSON = re.compile(r"^[a-f0-9]{6,}_.*\.json$|^[a-z_]+_\d{8}T\d{6}Z\.json$", re.I)


def repo_root() -> Path:
    return Path(os.environ.get("REPO_ROOT", Path(__file__).resolve().parents[2]))


def _is_ephemeral(name: str) -> bool:
    if any(p.match(name) for p in EPHEMERAL_PATTERNS):
        return True
    if name.endswith(".json") and LATEST_SUFFIX not in name and NON_LATEST_JSON.match(name):
        return True
    if name.endswith(".lock") and "dor_cache" in name:
        return True
    return False


def _is_closed(name: str) -> bool:
    """Ephemeral items we treat as 'closed' when only *_latest.json remain."""
    return _is_ephemeral(name)


def build_exit_artifacts(root: Path | None = None) -> dict:
    root = root or repo_root()
    evidence = root / ".goalie" / "evidence"
    open_items: list[str] = []
    closed_items: list[str] = []

    if evidence.is_dir():
        for path in sorted(evidence.iterdir()):
            if not path.is_file():
                continue
            name = path.name
            if _is_ephemeral(name):
                open_items.append(name)
            elif name.endswith("_latest.json") or name.endswith("_latest.log"):
                closed_items.append(name)

    # dor_cache may live directly under evidence
    for path in evidence.glob("dor_cache_*.lock"):
        if path.name not in open_items:
            open_items.append(path.name)

    open_count = len(open_items)
    closed_count = len(closed_items)
    total = open_count + closed_count
    pct_closed = (closed_count / total * 100.0) if total > 0 else 100.0

    return {
        "schema": SCHEMA,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "open_count": open_count,
        "closed_count": closed_count,
        "pct_closed": round(pct_closed, 2),
        "open_items": open_items[:50],
        "closed_sample": closed_items[:20],
        "evidence_dir": str(evidence.relative_to(root)),
    }


def write_evidence(root: Path | None = None) -> Path:
    root = root or repo_root()
    payload = build_exit_artifacts(root)
    out = root / ".goalie" / "evidence" / "exit_artifact_inbox_latest.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return out


def main() -> int:
    out = write_evidence()
    payload = json.loads(out.read_text(encoding="utf-8"))
    print(json.dumps({"path": str(out), "open_count": payload["open_count"], "pct_closed": payload["pct_closed"]}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
