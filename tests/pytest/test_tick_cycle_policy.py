"""Unit tests for tick_cycle_policy blocker remediation."""
from scripts.cicd.lib.tick_cycle_policy import load_policy


def test_blocker_remediation_runs_scoped_aqe():
    policy = load_policy(
        pace=0.5,
        blocker_pace=1.0,
        shippable_lane_empty=True,
        blocker_lane_has_now=True,
        utilize_mode_hint="blocker-remediation",
    )
    assert policy["utilize_mode"] == "blocker-remediation"
    assert policy["run_aqe"] is True
    assert policy["run_upstream"] is False
    assert policy["aqe_scope"] == "coherence"


def test_full_pace_runs_upstream():
    policy = load_policy(pace=1.5, blocker_pace=1.0)
    assert policy["run_aqe"] is True
    assert policy["run_upstream"] is True
    assert policy["utilize_mode"] in ("full", "deferred")


def test_full_pace_aqe_utilization_is_100_not_50():
    policy = load_policy(pace=1.5, blocker_pace=1.0)
    assert policy["run_aqe"] is True
    assert policy["utilize_mode"] == "full"
    assert policy["aqe_utilization_pct"] == 100.0
    assert policy["aqe_deferrable_ran"] is False
    assert policy["aqe_scope_utilization_pct"] == 100.0


def test_deferrable_mode_splits_utilization_metrics():
    import os
    os.environ["AQE_UTILIZE_DEFERRABLE"] = "1"
    try:
        policy = load_policy(pace=0.5, blocker_pace=1.0)
        assert policy["utilize_mode"] == "deferrable"
        assert policy["run_aqe"] is True
        assert policy["aqe_utilization_pct"] == 0.0
        assert policy["aqe_deferrable_ran"] is True
        assert policy["aqe_scope_utilization_pct"] == 50.0
    finally:
        os.environ.pop("AQE_UTILIZE_DEFERRABLE", None)


def test_blocker_remediation_deferrable_ran_without_shippable_util():
    policy = load_policy(
        pace=0.5,
        blocker_pace=1.0,
        shippable_lane_empty=True,
        blocker_lane_has_now=True,
        utilize_mode_hint="blocker-remediation",
    )
    assert policy["aqe_utilization_pct"] == 0.0
    assert policy["aqe_deferrable_ran"] is True
    assert policy["aqe_scope_utilization_pct"] == 50.0
