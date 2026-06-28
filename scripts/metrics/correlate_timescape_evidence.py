#!/usr/bin/env python3
"""Relate inbox timescape + agentic-time evidence (no premature merge)."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / ".goalie" / "evidence"


def load(name: str) -> dict | None:
    p = EVIDENCE / name
    if not p.is_file():
        return None
    return json.loads(p.read_text(encoding="utf-8"))


def main() -> int:
    inbox = load("inbox_zero_latest.json") or {}
    agentic = load("agentic_time_latest.json") or {}

    anti_cvt = int(inbox.get("anti_cvt_score", 0))
    health = (agentic.get("clock") or {}).get("health", "Unknown")
    pace = float(inbox.get("pace_cod_weight", 0))

    blocks: list[str] = []
    if anti_cvt > 50 and health in ("Drifting", "Collapsing", "NeedsHumanReview"):
        blocks.append(
            f"CORRELATE BLOCK: anti_cvt={anti_cvt} + agentic health={health}"
        )

    out = {
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "schema": "timescape_correlation.v1",
        "relate_only": True,
        "inbox": {
            "pace_cod_weight": pace,
            "anti_cvt_score": anti_cvt,
            "completion_ratio_percent": inbox.get("completion_ratio_percent"),
        },
        "agentic": agentic.get("clock"),
        "blocks": blocks,
        "disposition": "BLOCK" if blocks else "RELATE",
    }

    path = EVIDENCE / "timescape_correlation_latest.json"
    path.write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    print(f"timescape_correlation: {out['disposition']}")
    return 1 if blocks else 0


if __name__ == "__main__":
    raise SystemExit(main())
