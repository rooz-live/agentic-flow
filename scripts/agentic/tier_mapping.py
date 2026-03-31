from __future__ import annotations

from typing import Dict, List


DEFAULT_TIER_CIRCLES: Dict[str, List[str]] = {
    "tier1": ["orchestrator", "assessor"],
    "tier2": ["analyst", "innovator", "seeker"],
    "tier3": ["intuitive"],
}


def tier_for_circle(circle: str, tier_circles: Dict[str, List[str]] | None = None) -> str:
    c = (circle or "").strip().lower()
    mapping = tier_circles or DEFAULT_TIER_CIRCLES
    for tier, circles in mapping.items():
        if c in set((x or "").strip().lower() for x in circles):
            return tier
    return "unknown"
