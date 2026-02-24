"""
Tests for break_glass_guard.py domain classes

DoR: BreakGlassContext, RiskLevel, detect_risk_level, check_break_glass_env defined
DoD: All risk levels, env-var branches, and dataclass fields tested
@business-context: Prevents checkbox-fatigue ROAM drift on high-risk remote operations
"""

import os
import sys
import unittest
from unittest.mock import patch
from dataclasses import asdict

# Ensure scripts/agentic is importable
sys.path.insert(
    0,
    os.path.join(os.path.dirname(__file__), "..", "scripts"),
)
from agentic.break_glass_guard import (
    BreakGlassContext,
    RiskLevel,
    check_break_glass_env,
    detect_risk_level,
)


class TestRiskLevelEnum(unittest.TestCase):
    """Verify RiskLevel value objects."""

    def test_risk_level_values(self):
        assert RiskLevel.LOW.value == "low"
        assert RiskLevel.MEDIUM.value == "medium"
        assert RiskLevel.HIGH.value == "high"
        assert RiskLevel.CRITICAL.value == "critical"

    def test_risk_level_ordering_by_value(self):
        ordered = sorted(RiskLevel, key=lambda r: ["low", "medium", "high", "critical"].index(r.value))
        assert ordered == [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL]


class TestDetectRiskLevel(unittest.TestCase):
    """Tests for detect_risk_level command pattern matching."""

    def test_detect_low_risk_for_benign_command(self):
        assert detect_risk_level("ls -la /tmp") == RiskLevel.LOW

    def test_detect_high_risk_for_dnf_install(self):
        assert detect_risk_level("sudo dnf install nginx") == RiskLevel.HIGH

    def test_detect_critical_risk_for_dnf_remove(self):
        assert detect_risk_level("dnf remove httpd") == RiskLevel.CRITICAL

    def test_detect_high_risk_for_systemctl_restart(self):
        assert detect_risk_level("systemctl restart nginx") == RiskLevel.HIGH

    def test_detect_critical_risk_for_systemctl_stop(self):
        assert detect_risk_level("systemctl stop kubelet") == RiskLevel.CRITICAL

    def test_detect_high_risk_for_docker_stop(self):
        assert detect_risk_level("docker stop my-container") == RiskLevel.HIGH

    def test_detect_medium_risk_for_pip_install(self):
        assert detect_risk_level("pip install requests") == RiskLevel.MEDIUM

    def test_detect_medium_risk_for_kubectl_apply(self):
        assert detect_risk_level("kubectl apply -f manifest.yaml") == RiskLevel.MEDIUM

    def test_detect_high_risk_for_kubectl_delete(self):
        assert detect_risk_level("kubectl delete pod foo") == RiskLevel.HIGH

    def test_detect_critical_risk_for_kubeadm_reset(self):
        assert detect_risk_level("kubeadm reset --force") == RiskLevel.CRITICAL

    def test_detect_high_risk_for_swapoff(self):
        assert detect_risk_level("swapoff -a") == RiskLevel.HIGH

    def test_case_insensitive_matching(self):
        assert detect_risk_level("DNF INSTALL vim") == RiskLevel.HIGH


class TestCheckBreakGlassEnv(unittest.TestCase):
    """Tests for check_break_glass_env environment variable checks."""

    @patch.dict(os.environ, {}, clear=True)
    def test_missing_all_env_vars(self):
        allowed, reason, ctx = check_break_glass_env()
        assert allowed is False
        assert "AF_BREAK_GLASS=1 not set" in reason

    @patch.dict(os.environ, {"AF_BREAK_GLASS": "1"}, clear=True)
    def test_missing_reason(self):
        allowed, reason, ctx = check_break_glass_env()
        assert allowed is False
        assert "AF_BREAK_GLASS_REASON" in reason

    @patch.dict(os.environ, {"AF_BREAK_GLASS": "1", "AF_BREAK_GLASS_REASON": "deploy fix"}, clear=True)
    def test_missing_change_ticket(self):
        allowed, reason, ctx = check_break_glass_env()
        assert allowed is False
        assert "AF_CHANGE_TICKET" in reason

    @patch.dict(
        os.environ,
        {
            "AF_BREAK_GLASS": "1",
            "AF_BREAK_GLASS_REASON": "emergency hotfix",
            "AF_CHANGE_TICKET": "CHG-123",
        },
        clear=True,
    )
    def test_all_env_vars_set_allows(self):
        allowed, reason, ctx = check_break_glass_env()
        assert allowed is True
        assert "satisfied" in reason.lower()
        assert ctx["reason"] == "emergency hotfix"
        assert ctx["change_ticket"] == "CHG-123"

    @patch.dict(
        os.environ,
        {
            "AF_BREAK_GLASS": "1",
            "AF_BREAK_GLASS_REASON": "deploy",
            "AF_CAB_APPROVAL_ID": "CAB-456",
        },
        clear=True,
    )
    def test_cab_approval_id_fallback(self):
        allowed, reason, ctx = check_break_glass_env()
        assert allowed is True
        assert ctx["change_ticket"] == "CAB-456"


class TestBreakGlassContext(unittest.TestCase):
    """Tests for BreakGlassContext dataclass."""

    def test_dataclass_fields(self):
        ctx = BreakGlassContext(
            operation="restart nginx",
            risk_level=RiskLevel.HIGH,
            command="systemctl restart nginx",
            reason="deploy fix",
            change_ticket="CHG-789",
            operator="admin",
            target_host="prod-1",
            environment="production",
            timestamp="2025-01-01T00:00:00Z",
            git_sha="abc123",
            approved=True,
        )
        assert ctx.operation == "restart nginx"
        assert ctx.risk_level == RiskLevel.HIGH
        assert ctx.approved is True
        assert ctx.blocked_reason is None

    def test_dataclass_serialization(self):
        ctx = BreakGlassContext(
            operation="test",
            risk_level=RiskLevel.LOW,
            command="ls",
            reason="testing",
            change_ticket="TST-1",
            operator="tester",
            target_host="localhost",
            environment="test",
            timestamp="2025-01-01T00:00:00Z",
            git_sha="000000",
            approved=False,
            blocked_reason="env not set",
        )
        d = asdict(ctx)
        assert d["operation"] == "test"
        assert d["blocked_reason"] == "env not set"
        assert d["risk_level"] == RiskLevel.LOW  # asdict preserves enum


if __name__ == "__main__":
    unittest.main()
