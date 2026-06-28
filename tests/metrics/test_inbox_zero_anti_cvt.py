"""anti_cvt total must equal sum of components."""
from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "metrics"))

import inbox_zero_timescape as iz  # noqa: E402


def test_anti_cvt_total_equals_sum(tmp_path: Path):
    policy = {"aqe_utilization_pct": 30.0}
    with (
        patch.object(iz, "_anti_cvt_untracked", return_value=5),
        patch.object(iz, "_anti_cvt_unobservable", return_value=1),
        patch.object(iz, "_anti_cvt_unorchestrated", return_value=2),
    ):
        breakdown = iz._anti_cvt_breakdown(tmp_path, policy)
    assert breakdown["untracked"] == 5
    assert breakdown["unobservable"] == 1
    assert breakdown["unorchestrated"] == 2
    assert breakdown["unutilized"] == 70
    assert breakdown["total"] == breakdown["untracked"] + breakdown["unobservable"] + breakdown["unorchestrated"] + breakdown["unutilized"]
