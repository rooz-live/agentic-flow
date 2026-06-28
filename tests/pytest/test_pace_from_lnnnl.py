"""Unit tests for scripts.metrics.pace_from_lnnnl."""
from scripts.metrics.pace_from_lnnnl import is_shippable_work, pace_cod_weight_from_schedule, main


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
