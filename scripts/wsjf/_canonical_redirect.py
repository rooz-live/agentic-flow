"""Redirect legacy WSJF callers to repo-canonical implementation."""
from __future__ import annotations

import sys
from pathlib import Path

CANONICAL_WSJF_MODULE = "src.wsjf.calculator"
CANONICAL_TICK_OWNER = "scripts/cicd/update_lnnnl.py"

_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from src.wsjf.calculator import WsjfCalculator, WsjfItem  # noqa: E402


def canonical_wsjf_score(
    business_value: float,
    time_criticality: float,
    risk_reduction: float,
    job_size: float,
    *,
    item_id: str = "_legacy_shim",
) -> float:
  js = max(float(job_size), 0.1)
  item = WsjfItem(
      id=item_id,
      title=item_id,
      business_value=float(business_value),
      time_criticality=float(time_criticality),
      risk_reduction=float(risk_reduction),
      job_size=js,
  )
  return item.calculate_wsjf()


__all__ = [
    "CANONICAL_WSJF_MODULE",
    "CANONICAL_TICK_OWNER",
    "WsjfCalculator",
    "WsjfItem",
    "canonical_wsjf_score",
]
