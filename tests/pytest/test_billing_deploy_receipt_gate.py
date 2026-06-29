"""Unit tests for .github/workflows/billing-deploy.yml receipt gate.

The deploy-staging receipt gate was hardened during the provenance wave to
source scripts/gates/emit_ci_provenance.sh (fail-closed signed receipt) and
opt into the scorecard gate via AF_GATE_CONTEXT=ci + AF_REQUIRE_SCORECARD=1,
replacing the legacy fetch_run_report.py/overall_ok mechanism.
"""
from __future__ import annotations

from pathlib import Path

import pytest
import yaml


@pytest.fixture()
def workflow():
    path = Path(__file__).resolve().parents[2] / ".github" / "workflows" / "billing-deploy.yml"
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def _deploy_staging_steps(workflow):
    """Return the deploy-staging job's step list."""
    return workflow["jobs"].get("deploy-staging", {}).get("steps", [])


def _provenance_receipt_step(workflow):
    """Return the deploy-staging step that sources emit_ci_provenance.sh, else None."""
    for step in _deploy_staging_steps(workflow):
        if "emit_ci_provenance.sh" in step.get("run", ""):
            return step
    return None


def test_deploy_staging_job_has_receipt_gate(workflow):
    """deploy-staging must contain a provenance-based receipt gate step."""
    assert _provenance_receipt_step(workflow) is not None, (
        "deploy-staging missing provenance receipt gate step"
    )


def test_receipt_gate_step_enforces_provenance(workflow):
    """The receipt gate must source emit_ci_provenance.sh and enforce the scorecard gate.

    Replaces the legacy fetch_run_report.py/overall_ok mechanism: emit_ci_provenance.sh
    is fail-closed (exits non-zero in CI without a signed receipt) and AF_REQUIRE_SCORECARD=1
    binds the scorecard gate, so a failing scorecard blocks deploy-staging.
    """
    gate_step = _provenance_receipt_step(workflow)
    assert gate_step is not None, "deploy-staging missing provenance receipt gate step"
    run = gate_step.get("run", "")
    assert "source scripts/gates/emit_ci_provenance.sh" in run, (
        "receipt gate must source emit_ci_provenance.sh (fail-closed signed receipt)"
    )
    assert "AF_GATE_CONTEXT=ci" in run, "receipt gate must set AF_GATE_CONTEXT=ci"
    assert "AF_REQUIRE_SCORECARD=1" in run, (
        "receipt gate must set AF_REQUIRE_SCORECARD=1 to enforce the scorecard"
    )
