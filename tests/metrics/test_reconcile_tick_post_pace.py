"""F4: reconcile tick_post pace from policy snapshot."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "cicd" / "lib"))

import reconcile_tick_post_pace as rtp  # noqa: E402


def _seed(tmp_path: Path, *, tick: dict, policy: dict) -> None:
    evidence = tmp_path / ".goalie" / "evidence"
    evidence.mkdir(parents=True)
    (evidence / "tick_post_latest.json").write_text(
        json.dumps(tick) + "\n",
        encoding="utf-8",
    )
    (evidence / "tick_cycle_policy_latest.json").write_text(
        json.dumps(policy) + "\n",
        encoding="utf-8",
    )


def test_reconcile_stale_tick_post_from_policy(tmp_path: Path):
    _seed(
        tmp_path,
        tick={"pace_source": "stale", "pace_cod_weight": None},
        policy={"pace_cod_weight": 1.5, "utilize_mode": "full"},
    )
    assert rtp.reconcile(tmp_path) is True
    tick = json.loads(
        (tmp_path / ".goalie" / "evidence" / "tick_post_latest.json").read_text(
            encoding="utf-8"
        )
    )
    assert tick["pace_cod_weight"] == 1.5
    assert tick["pace_source"] == "policy_snapshot"


def test_reconcile_overrides_prior_lnnnl_when_policy_differs(tmp_path: Path):
    _seed(
        tmp_path,
        tick={"pace_source": "lnnnl", "pace_cod_weight": 0.5},
        policy={
            "pace_cod_weight": 1.5,
            "utilize_mode": "deferrable",
            "blocker_pace_cod_weight": 2.0,
        },
    )
    assert rtp.reconcile(tmp_path) is True
    bundle = rtp.pace_bundle(tmp_path)
    assert bundle["pace_cod_weight"] == 1.5
    assert bundle["pace_source"] == "policy_snapshot"
    assert bundle["blocker_pace_cod_weight"] == 2.0
    assert bundle["utilize_mode_hint"] == "deferrable"


def test_pace_bundle_prefers_policy_over_stale_lnnnl_tick(tmp_path: Path):
    _seed(
        tmp_path,
        tick={"pace_source": "lnnnl", "pace_cod_weight": 0.5},
        policy={"pace_cod_weight": 1.25, "utilize_mode": "full"},
    )
    bundle = rtp.pace_bundle(tmp_path)
    assert bundle["pace_cod_weight"] == 1.25
    assert bundle["pace_source"] == "policy_snapshot"
