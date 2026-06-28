"""BDD steps for inbox_zero_latest.json velocity assertions."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from pytest_bdd import given, scenarios, then, when

REPO_ROOT = Path(__file__).resolve().parents[2]
ARTIFACT = REPO_ROOT / ".goalie" / "evidence" / "inbox_zero_latest.json"

shared: dict = {}

scenarios("timescape_velocity.feature")


@pytest.fixture(autouse=True)
def _repo_cwd(monkeypatch):
    monkeypatch.chdir(REPO_ROOT)


@given("the inbox zero timescape artifact exists")
def artifact_exists(tmp_path, monkeypatch):
    if not ARTIFACT.is_file():
        monkeypatch.setenv("REPO_ROOT", str(REPO_ROOT))
        import subprocess

        subprocess.run(
            ["python3", str(REPO_ROOT / "scripts/metrics/inbox_zero_timescape.py")],
            cwd=REPO_ROOT,
            check=False,
            timeout=60,
        )
    assert ARTIFACT.is_file(), "run scripts/metrics/inbox_zero_timescape.py first"


@when("I read the timescape velocity metrics")
def read_metrics():
    shared["data"] = json.loads(ARTIFACT.read_text(encoding="utf-8"))


@then("pct_closed must equal closed over open plus closed")
def assert_pct_closed():
    data = shared["data"]
    details = data["details"]
    open_count = details["open_roam"] + details["open_upstream"] + details["dlq_rows"]
    closed_count = details["closed_roam"] + details["closed_upstream"]
    total = open_count + closed_count
    expected = (closed_count / total * 100.0) if total > 0 else 100.0
    assert data["pct_closed"] == pytest.approx(round(expected, 2))
    assert data["open_count"] == open_count


@then("velocity must equal closed divided by window hours")
def assert_velocity():
    data = shared["data"]
    details = data["details"]
    closed_count = details["closed_roam"] + details["closed_upstream"]
    window = float(data.get("window_hours", 24.0))
    expected = closed_count / window if window > 0 else 0.0
    assert data["velocity"] == pytest.approx(round(expected, 4))


@then("emergent_time_source must be wall_clock")
def assert_emergent_source():
    assert shared["data"].get("emergent_time_source") == "wall_clock"
