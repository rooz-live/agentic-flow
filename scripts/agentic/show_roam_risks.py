#!/usr/bin/env python3
"""show_roam_risks.py

Lightweight ROAM risk snapshot for `af prod-cycle`.

Design goals:
- No external dependencies (no PyYAML).
- Best-effort parsing of `.goalie/ROAM_TRACKER.yaml` focused on the `risks:` section.
- Highlight max-impact risks (highest `risk_score`) and ROAM status.
- Respect AF_CIRCLE / AF_DEPTH_LEVEL for contextual output.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any, Dict, List


def load_risks(roam_path: Path) -> List[Dict[str, Any]]:
    if not roam_path.exists():
        return []

    lines = roam_path.read_text(encoding="utf-8").splitlines()
    in_risks = False
    risks: List[Dict[str, Any]] = []
    current: Dict[str, Any] | None = None

    for raw in lines:
        line = raw.rstrip("\n")
        stripped = line.strip()

        if stripped.startswith("risks:"):
            in_risks = True
            continue

        if not in_risks:
            continue

        # New risk entry
        if stripped.startswith("- id:"):
            if current is not None:
                risks.append(current)
            rid = stripped.split(":", 1)[1].strip().strip('"')
            current = {"id": rid}
            continue

        if current is None:
            continue

        # Simple key: value parsing for a few fields we care about
        if stripped.startswith("title:"):
            current["title"] = stripped.split(":", 1)[1].strip().strip('"')
        elif stripped.startswith("category:"):
            current["category"] = stripped.split(":", 1)[1].strip().strip('"')
        elif stripped.startswith("probability:"):
            current["probability"] = stripped.split(":", 1)[1].strip().strip('"')
        elif stripped.startswith("impact:"):
            current["impact"] = stripped.split(":", 1)[1].strip().strip('"')
        elif stripped.startswith("risk_score:"):
            value = stripped.split(":", 1)[1]
            value = value.split("#", 1)[0].strip()
            try:
                current["risk_score"] = int(value)
            except ValueError:
                pass
        elif stripped.startswith("roam_status:"):
            current["roam_status"] = stripped.split(":", 1)[1].strip().strip('"')
        elif stripped.startswith("owner:"):
            current["owner"] = stripped.split(":", 1)[1].strip().strip('"')
        elif stripped.startswith("mitigation_priority:"):
            current["mitigation_priority"] = stripped.split(":", 1)[1].strip().strip('"')

    if current is not None:
        risks.append(current)

    return risks


def main() -> int:
    script_path = Path(__file__).resolve()
    project_root = script_path.parents[2]
    roam_path = project_root / ".goalie" / "ROAM_TRACKER.yaml"

    circle = os.getenv("AF_CIRCLE", "").strip()
    try:
        depth_level = int(os.getenv("AF_DEPTH_LEVEL", "0"))
    except ValueError:
        depth_level = 0

    depth_labels = {0: "core", 1: "analysis", 2: "circle", 3: "devops", 4: "deploy"}
    depth_label = depth_labels.get(depth_level, "core")

    risks = load_risks(roam_path)
    if not risks:
        sys.stdout.write("No ROAM_TRACKER.yaml risks found or file missing.\n")
        return 0

    # Determine circle owner key (e.g. orchestrator -> orchestrator_circle)
    owner_key = None
    if circle:
        owner_key = f"{circle.lower()}_circle"

    # Sort by risk_score (desc), defaulting to 0
    def score(r: Dict[str, Any]) -> int:
        v = r.get("risk_score")
        try:
            return int(v) if v is not None else 0
        except ValueError:
            return 0

    risks_sorted = sorted(risks, key=score, reverse=True)

    # High-impact filter: risk_score >= 6 (MEDIUM x HIGH or HIGH x MEDIUM/HIGH)
    high_impact = [r for r in risks_sorted if score(r) >= 6]
    if not high_impact:
        high_impact = risks_sorted[:3]

    # Circle-focused ordering: own-circle risks first
    if owner_key:
        owned = [r for r in high_impact if str(r.get("owner", "")).lower() == owner_key]
        others = [r for r in high_impact if r not in owned]
        ordered = owned + others
    else:
        ordered = high_impact

    sys.stdout.write(
        f"ROAM risk review (max-impact snapshot; depth={depth_level} ({depth_label}), circle={circle or '<none>'}):\n\n"
    )

    for r in ordered[:5]:
        rid = r.get("id", "RISK-???")
        title = r.get("title", "(no title)")
        category = r.get("category", "(no category)")
        prob = r.get("probability", "?")
        impact = r.get("impact", "?")
        rs = score(r)
        roam = r.get("roam_status", "(no ROAM)")
        owner = r.get("owner", "(no owner)")
        pri = r.get("mitigation_priority", "(no priority)")

        sys.stdout.write(f"{rid} | {title}\n")
        sys.stdout.write(
            f"  category={category}, prob={prob}, impact={impact}, risk_score={rs}, roam_status={roam}\n"
        )
        sys.stdout.write(f"  owner={owner}, mitigation_priority={pri}\n\n")

    sys.stdout.write(
        "Note: Focus on OWNED/MITIGATED/ACCEPTED risks with highest risk_score for this prod-cycle.\n"
    )
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())

