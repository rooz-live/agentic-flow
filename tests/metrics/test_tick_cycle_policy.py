from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts/cicd/lib"))

from tick_cycle_policy import load_policy


def test_defer_aqe_when_pace_low():
    policy = load_policy(ROOT, pace=0.5)
    assert policy["run_aqe"] is False
    assert policy["run_upstream"] is False


def test_run_aqe_when_pace_high():
    policy = load_policy(ROOT, pace=1.5)
    assert policy["run_aqe"] is True
