from pathlib import Path
"""Unit tests for scripts.metrics.pace_from_lnnnl."""
from pathlib import Path

from scripts.metrics.pace_from_lnnnl import (
    is_shippable_work,
    is_blocker_work,
    pace_cod_weight_from_schedule,
    blocker_pace_cod_weight_from_schedule,
    resolve_pace_bundle,
    main,
)


def test_is_shippable_work_detects_p1_items():
    assert is_shippable_work("[P1-BILLING-001] invoice engine")
    assert is_shippable_work("P1-EDGE-42")
    assert not is_shippable_work("[DEP-008] API key missing")
    assert not is_shippable_work("[R04] webhook secret unset")
    assert not is_shippable_work("")
    assert not is_shippable_work(None)


def test_is_shippable_work_detects_nnear_items():
    assert is_shippable_work("[NNEAR-01] near work")
    assert is_shippable_work("NNEAR-42")
    assert not is_shippable_work("NN-01")


def test_pace_now_shippable_returns_1_5():
    schedule = {
        "now": "[P1-BILLING-001] invoice engine",
        "near": "[DEP-009] ANTHROPIC_API_KEY not set",
    }
    assert pace_cod_weight_from_schedule(schedule) == 1.5


def test_pace_near_shippable_returns_1_0():
    schedule = {
        "now": "[DEP-008] GEMINI_API_KEY not set",
        "near": "[P1-EDGE-042] caddy health probe",
    }
    assert pace_cod_weight_from_schedule(schedule) == 1.0


def test_pace_no_shippable_returns_0_5():
    schedule = {
        "now": "[DEP-008] GEMINI_API_KEY not set",
        "near": "[DEP-009] ANTHROPIC_API_KEY not set",
        "next": "[R04] webhook secret unset",
    }
    assert pace_cod_weight_from_schedule(schedule) == 0.5


def test_pace_empty_schedule_returns_0_5():
    assert pace_cod_weight_from_schedule({}) == 0.5
    assert pace_cod_weight_from_schedule(None) == 0.5


def test_main_from_lnnnl_prints_weight(capsys, tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    lnnnl = tmp_path / ".goalie" / "LNNNL.yaml"
    lnnnl.parent.mkdir(parents=True)
    lnnnl.write_text(
        "version: '1.0'\nschedule:\n  now: '[P1-BILLING-001] invoice engine'\n",
        encoding="utf-8",
    )
    with monkeypatch.context() as m:
        import sys

        m.setattr(sys, "argv", ["pace_from_lnnnl.py", "--from-lnnnl"])
        main()
    captured = capsys.readouterr()
    assert captured.out.strip() == "1.5"


def test_pace_from_lnnnl_prefers_lanes_shippable(capsys, tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    lnnnl = tmp_path / ".goalie" / "LNNNL.yaml"
    lnnnl.parent.mkdir(parents=True)
    lnnnl.write_text(
        "version: '1.1'\nlanes:\n  shippable:\n    now: '[P1-BILLING-001] invoice engine'\n    near: '[DEP-009] missing key'\n    next: '[P1-EDGE-042] caddy probe'\n  blockers:\n    now: '[R04] webhook secret'\n",
        encoding="utf-8",
    )
    with monkeypatch.context() as m:
        import sys

        m.setattr(sys, "argv", ["pace_from_lnnnl.py", "--from-lnnnl"])
        main()
    captured = capsys.readouterr()
    assert captured.out.strip() == "1.5"


def test_blocker_pace_now_returns_1_0():
    doc = {
        "lanes": {
            "shippable": {"now": "No pending task.", "near": "No pending task."},
            "blockers": {"now": "[R04] webhook secret", "near": "[DEP-9] key"},
        }
    }
    assert blocker_pace_cod_weight_from_schedule(None, lnnnl=doc) == 1.0


def test_resolve_pace_bundle_uses_last_good_on_lnnnl_failure(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    lnnnl = tmp_path / ".goalie" / "LNNNL.yaml"
    lnnnl.parent.mkdir(parents=True)
    lnnnl.write_text(
        "version: '1.1'\nlanes:\n  shippable:\n    now: '[P1-A-01] work'\n  blockers:\n    now: '[R04] risk'\n",
        encoding="utf-8",
    )
    good = resolve_pace_bundle(lnnnl_exit=0)
    assert good["pace_source"] == "live"
    stale = resolve_pace_bundle(lnnnl_exit=1)
    assert stale["pace_source"] == "last_good"
    assert stale["pace_cod_weight"] == 1.5


def test_resolve_pace_bundle_stale_without_last_good(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    stale = resolve_pace_bundle(lnnnl_exit=1)
    assert stale["pace_source"] == "stale"
    assert stale["pace_cod_weight"] is None


def test_blocker_remediation_hint_when_shippable_empty(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    fixture = Path(__file__).resolve().parents[1] / "fixtures" / "lnnnl" / "blocker_only_v1.1.yaml"
    bundle = resolve_pace_bundle(lnnnl_path=fixture, lnnnl_exit=0)
    assert bundle["shippable_lane_empty"] is True
    assert bundle["blocker_lane_has_now"] is True
    assert bundle["utilize_mode_hint"] == "blocker-remediation"
