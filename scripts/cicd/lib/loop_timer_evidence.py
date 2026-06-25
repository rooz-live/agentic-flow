#!/usr/bin/env python3
"""Write loop_timer.v1 evidence with phase metadata (tick | idle | done)."""
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path


def write_evidence(path: Path, doc: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    doc.setdefault("schema", "loop_timer.v1")
    doc.setdefault("timestamp", datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
    path.write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--path", required=True)
    p.add_argument("--json", required=True, help="JSON object string")
    args = p.parse_args()
    doc = json.loads(args.json)
    write_evidence(Path(args.path), doc)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
