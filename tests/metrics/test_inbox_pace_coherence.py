"""Pace coherence: stale tick_post + live policy snapshot → policy_snapshot pace_fmt."""
from __future__ import annotations

import json
import sys
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "metrics"))

import inbox_zero_timescape as iz  # noqa: E402


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def test_stale_tick_post_uses_policy_snapshot_pace(tmp_path: Path):
    evidence = tmp_path / ".goalie" / "evidence"
    _write_json(
        evidence / "tick_post_latest.json",
        {
            "pace_source": "stale",
            "pace_cod_weight": None,
            "shippable_lane_empty": False,
        },
    )
    _write_json(
        evidence / "tick_cycle_policy_latest.json",
        {
            "pace_cod_weight": 1.5,
            "aqe_utilization_pct": 100.0,
            "aqe_scope_utilization_pct": 100.0,
            "utilize_mode": "full",
        },
    )
    (tmp_path / ".goalie" / "ROAM_TRACKER.yaml").write_text("items: []\n", encoding="utf-8")
    (tmp_path / ".goalie" / "ROAM_TRACKER_COG.yaml").write_text("items: []\n", encoding="utf-8")
    (tmp_path / ".goalie" / "UPSTREAM_ACTIONS.yaml").write_text("actions: []\n", encoding="utf-8")
    (tmp_path / ".goalie" / "LNNNL.yaml").write_text(
        "lanes:\n  shippable:\n    now: []\n  blockers:\n    now: []\n",
        encoding="utf-8",
    )

    with (
        patch.object(iz, "_max_roi", return_value={}),
        patch.object(iz, "_ceremony_bounded", return_value={}),
    ):
        snap = iz.build_timescape(tmp_path)

    assert snap["pace"] == 1.5
    assert snap["pace_fmt"].endswith(".1.5")
    assert snap["pace_source"] == "policy_snapshot"
    assert snap["aqe_utilization_pct"] == 100.0


def test_stale_tick_post_without_policy_emits_sentinel(tmp_path: Path):
    evidence = tmp_path / ".goalie" / "evidence"
    _write_json(
        evidence / "tick_post_latest.json",
        {"pace_source": "stale", "pace_cod_weight": None},
    )
    (tmp_path / ".goalie" / "ROAM_TRACKER.yaml").write_text("items: []\n", encoding="utf-8")
    (tmp_path / ".goalie" / "ROAM_TRACKER_COG.yaml").write_text("items: []\n", encoding="utf-8")
    (tmp_path / ".goalie" / "UPSTREAM_ACTIONS.yaml").write_text("actions: []\n", encoding="utf-8")
    (tmp_path / ".goalie" / "LNNNL.yaml").write_text(
        "lanes:\n  shippable:\n    now: []\n  blockers:\n    now: []\n",
        encoding="utf-8",
    )

    with (
        patch.object(iz, "_max_roi", return_value={}),
        patch.object(iz, "_ceremony_bounded", return_value={}),
    ):
        snap = iz.build_timescape(tmp_path)

    assert snap["pace_fmt"] == "#.%"
    assert snap["pace_source"] == "stale"
