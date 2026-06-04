import asyncio
import os
import sys

import pytest

sys.path.insert(0, os.path.abspath("."))
from risk_analytics.device_diagnostics import DeviceDiagnostics


@pytest.mark.asyncio
async def test_diagnostics_ipmi_unreachable():
    """Test IPMI unreachability detection for device #24460 (hv2b40b82)."""
    diag = DeviceDiagnostics(device_id="24460", hostname="stx-aio-0.corp.interface.tag.ooo", ipmi_host="hv2b40b82")

    # Run diagnostics (will fail if ipmitool not installed or IPMI unreachable)
    results = await diag.run_all_diagnostics()

    # Summarize
    summary = diag.summarize(results)

    # Verify structure
    assert summary["device_id"] == "24460"
    assert "health_score" in summary
    assert "remediations" in summary
    assert "details" in summary

    # If IPMI is unreachable, we should have remediation suggestions
    if not results["ipmi_connectivity"].passed:
        assert len(summary["remediations"]) > 0
        assert any("IPMI" in r or "ipmitool" in r for r in summary["remediations"])


@pytest.mark.asyncio
async def test_diagnostics_network_reachable():
    """Test network connectivity check."""
    diag = DeviceDiagnostics(device_id="stx-aio-0", hostname="localhost")

    results = await diag.run_all_diagnostics()
    summary = diag.summarize(results)

    # Localhost should be reachable via network
    assert results["network_connectivity"].passed
    # Health score should reflect at least one passing check
    assert summary["health_score"] > 0
    assert summary["passed"] >= 1


def test_diagnostic_result_structure():
    """Test DiagnosticResult dataclass."""
    from risk_analytics.device_diagnostics import DiagnosticResult

    result = DiagnosticResult(
        check_name="test_check",
        passed=True,
        message="Test passed",
        remediation=None,
        latency_ms=1.5,
    )

    assert result.check_name == "test_check"
    assert result.passed is True
    assert result.latency_ms == 1.5


def test_diagnostics_summarize():
    """Test diagnostic summary generation."""
    from risk_analytics.device_diagnostics import (DeviceDiagnostics,
                                                   DiagnosticResult)

    diag = DeviceDiagnostics(device_id="test-device", hostname="test.example.com")

    # Mock results
    results = {
        "ipmi_connectivity": DiagnosticResult(
            check_name="ipmi_connectivity",
            passed=False,
            message="IPMI unreachable",
            remediation="Check network connectivity",
            latency_ms=5000.0,
        ),
        "network_connectivity": DiagnosticResult(
            check_name="network_connectivity",
            passed=True,
            message="Network ok",
            remediation=None,
            latency_ms=10.0,
        ),
    }

    summary = diag.summarize(results)

    assert summary["device_id"] == "test-device"
    assert summary["passed"] == 1
    assert summary["total"] == 2
    assert summary["health_score"] == 50.0
    assert len(summary["remediations"]) == 1
    assert "Check network connectivity" in summary["remediations"]
