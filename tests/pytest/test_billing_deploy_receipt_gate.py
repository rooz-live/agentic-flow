"""Unit tests for .github/workflows/billing-deploy.yml receipt gate."""
from __future__ import annotations

from pathlib import Path

import pytest
import yaml


@pytest.fixture()
def workflow():
    path = Path(__file__).resolve().parents[2] / ".github" / "workflows" / "billing-deploy.yml"
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def test_deploy_staging_job_has_receipt_gate(workflow):
    """deploy-staging must run fetch_run_report.py --summary and fail on overall_ok=false."""
    deploy = workflow["jobs"].get("deploy-staging", {})
    steps = deploy.get("steps", [])
    names = [step.get("name", "") for step in steps]
    assert any("receipt" in name.lower() for name in names), "deploy-staging missing receipt gate step"


def test_receipt_gate_step_fails_on_overall_ok_false(workflow):
    """The receipt gate step must fail the job if overall_ok is false."""
    deploy = workflow["jobs"].get("deploy-staging", {})
    steps = deploy.get("steps", [])
    gate_step = None
    for step in steps:
        if "receipt" in step.get("name", "").lower():
            gate_step = step
            break
    assert gate_step is not None
    run = gate_step.get("run", "")
    assert "fetch_run_report.py" in run
    assert "overall_ok" in run
