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
