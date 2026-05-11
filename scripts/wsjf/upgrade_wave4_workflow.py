#!/usr/bin/env python3
"""Rank wave4 beads with auditable WSJF evidence output."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any


@dataclass
class Bead:
    id: str
    title: str
    stream: str
    cost_of_delay: float
    time_criticality: float
    risk_reduction: float
    opportunity_enablement: float
    job_size: float
    unblocks: int
    bucket: str

    @property
    def wsjf(self) -> float:
        return (
            self.cost_of_delay
            + self.time_criticality
            + self.risk_reduction
            + self.opportunity_enablement
        ) / max(self.job_size, 0.1)

    @property
    def leverage(self) -> float:
        return self.wsjf * max(self.unblocks, 1)


DEFAULT_BACKLOG = Path("config/wsjf/wave4_backlog.json")
DEFAULT_EVIDENCE_DIR = Path(".goalie/evidence/wsjf")


def load_backlog(path: Path) -> List[Bead]:
    data = json.loads(path.read_text())
    beads: List[Bead] = []
    for entry in data:
        beads.append(Bead(**entry))
    return beads


def rank_beads(beads: List[Bead]) -> List[Bead]:
    return sorted(beads, key=lambda b: (b.leverage, b.wsjf), reverse=True)


def build_output(ranked: List[Bead], source: Path) -> Dict[str, Any]:
    now = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    top = ranked[0] if ranked else None
    return {
        "run_id": now,
        "source": str(source),
        "recommended_next_bead": asdict(top) if top else None,
        "ranking": [
            {
                **asdict(b),
                "wsjf": round(b.wsjf, 3),
                "leverage": round(b.leverage, 3),
            }
            for b in ranked
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Upgrade wave4 WSJF workflow")
    parser.add_argument("--backlog", type=Path, default=DEFAULT_BACKLOG)
    parser.add_argument("--evidence-dir", type=Path, default=DEFAULT_EVIDENCE_DIR)
    args = parser.parse_args()

    if not args.backlog.exists():
        raise SystemExit(f"Backlog file not found: {args.backlog}")

    beads = load_backlog(args.backlog)
    ranked = rank_beads(beads)
    payload = build_output(ranked, args.backlog)

    args.evidence_dir.mkdir(parents=True, exist_ok=True)
    out_file = args.evidence_dir / f"wave4_wsjf_{payload['run_id']}.json"
    out_file.write_text(json.dumps(payload, indent=2))

    print(f"run_id: {payload['run_id']}")
    if payload["recommended_next_bead"]:
        print(f"recommended: {payload['recommended_next_bead']['id']}")
    print(f"evidence: {out_file}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
