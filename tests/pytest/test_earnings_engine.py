import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.metrics.earnings_engine import calculate_earnings, main


def test_calculate_earnings_ship_verified():
    result = {
        "disposition": "SHIP",
        "originality_score": 4.0,
        "impact_net": 5.0,
    }
    hardened = {
        "sign_off": True,
        "impact": {"reward_direction": 1.0, "blast_radius": 0.5},
        "gates": {"gate_integrity": "PASS"},
    }
    earnings = calculate_earnings(result, hardened_card=hardened)
    assert earnings["agent"] == 7.0
    assert earnings["engine"] == 2.0
    assert earnings["engineer"] == 6.0
    assert earnings["ingenuity"] == 4.0


def test_calculate_earnings_block_no_agent_credit():
    result = {"disposition": "BLOCK", "originality_score": 4.0, "impact_net": 5.0}
    hardened = {"sign_off": True, "impact": {}, "gates": {}}
    earnings = calculate_earnings(result, hardened_card=hardened)
    assert earnings["agent"] == 0.0  # sign_off only for SPIKE/SHIP; BLOCK gets 0 from SHIP


def test_refuse_unverified_scorecard(tmp_path, monkeypatch):
    sc = tmp_path / "sc.json"
    sc.write_text('{"decision": "SHIP", "originality_score": 9.0}')
    monkeypatch.setattr(
        sys,
        "argv",
        ["earnings_engine", "--scorecard", str(sc)],
    )
    monkeypatch.delenv("AF_EARNINGS_VERIFY", raising=False)
    assert main() == 2
