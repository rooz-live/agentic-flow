"""F4: reconcile tick_post pace from policy snapshot."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "cicd" / "lib"))

import reconcile_tick_post_pace as rtp  # noqa: E402


def test_reconcile_stale_tick_post_from_policy(tmp_path: Path):
    evidence = tmp_path / ".goalie" / "evidence"
    evidence.mkdir(parents=True)
    (evidence / "tick_post_latest.json").write_text(
        json.dumps({"pace_source": "stale", "pace_cod_weight": None}) + "\n",
        encoding="utf-8",
    )
    (evidence / "tick_cycle_policy_latest.json").write_text(
        json.dumps({"pace_cod_weight": 1.5, "utilize_mode": "full"}) + "\n",
        encoding="utf-8",
    )
    assert rtp.reconcile(tmp_path) is True
    tick = json.loads((evidence / "tick_post_latest.json").read_text(encoding="utf-8"))
    assert tick["pace_cod_weight"] == 1.5
    assert tick["pace_source"] == "policy_snapshot"
