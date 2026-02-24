"""
Tests for guardrails.py domain classes

DoR: GuardrailLock, WIPLimits, SchemaValidation, Tier, OperationMode defined
DoD: WIP limits, schema validation, mode permissions, enforce() integration tested
@business-context: Prevents unbounded WIP growth and enforces tier-specific schema governance
"""

import os
import sys
import unittest

sys.path.insert(
    0,
    os.path.join(os.path.dirname(__file__), "..", "scripts"),
)
from agentic.guardrails import (
    GuardrailLock,
    OperationMode,
    SchemaValidation,
    Tier,
    WIPLimits,
)


class TestOperationModeEnum(unittest.TestCase):
    """Verify OperationMode value objects."""

    def test_values(self):
        assert OperationMode.MUTATE.value == "mutate"
        assert OperationMode.ADVISORY.value == "advisory"
        assert OperationMode.ENFORCEMENT.value == "enforcement"


class TestTierEnum(unittest.TestCase):
    """Verify Tier value objects."""

    def test_all_tiers(self):
        expected = {"orchestrator", "analyst", "innovator", "intuitive", "assessor", "seeker"}
        assert {t.value for t in Tier} == expected


class TestWIPLimits(unittest.TestCase):
    """Verify WIPLimits defaults."""

    def test_defaults(self):
        limits = WIPLimits()
        assert limits.orchestrator == 3
        assert limits.analyst == 5
        assert limits.innovator == 4
        assert limits.intuitive == 2
        assert limits.assessor == 6
        assert limits.seeker == 8


class TestSchemaValidation(unittest.TestCase):
    """Verify SchemaValidation required fields per tier."""

    def test_orchestrator_fields(self):
        sv = SchemaValidation()
        assert "pattern" in sv.orchestrator
        assert "economic" in sv.orchestrator
        assert len(sv.orchestrator) == 4

    def test_analyst_fields(self):
        sv = SchemaValidation()
        assert "analysis_type" in sv.analyst

    def test_seeker_fields(self):
        sv = SchemaValidation()
        assert "search_query" in sv.seeker
        assert "results" in sv.seeker


class TestGuardrailLockWIP(unittest.TestCase):
    """WIP limit enforcement."""

    def test_check_wip_below_limit(self):
        gl = GuardrailLock()
        allowed, reason = gl.check_wip_limit("orchestrator")
        assert allowed is True
        assert "wip_ok" in reason

    def test_check_wip_at_limit(self):
        gl = GuardrailLock()
        gl.current_wip["orchestrator"] = 3  # exactly at limit
        allowed, reason = gl.check_wip_limit("orchestrator")
        assert allowed is False
        assert "wip_limit_reached" in reason

    def test_check_wip_above_limit(self):
        gl = GuardrailLock()
        gl.current_wip["orchestrator"] = 5  # over limit
        allowed, reason = gl.check_wip_limit("orchestrator")
        assert allowed is False

    def test_check_wip_unknown_circle(self):
        gl = GuardrailLock()
        allowed, reason = gl.check_wip_limit("unknown_circle")
        assert allowed is True
        assert "circle_not_tracked" in reason

    def test_increment_wip(self):
        gl = GuardrailLock()
        gl.increment_wip("analyst")
        assert gl.current_wip["analyst"] == 1
        gl.increment_wip("analyst")
        assert gl.current_wip["analyst"] == 2

    def test_decrement_wip(self):
        gl = GuardrailLock()
        gl.current_wip["analyst"] = 3
        gl.decrement_wip("analyst")
        assert gl.current_wip["analyst"] == 2

    def test_decrement_wip_floor_at_zero(self):
        gl = GuardrailLock()
        gl.decrement_wip("analyst")  # already 0
        assert gl.current_wip["analyst"] == 0


class TestGuardrailLockSchema(unittest.TestCase):
    """Schema validation per tier."""

    def test_validate_schema_valid_orchestrator(self):
        gl = GuardrailLock()
        data = {"pattern": "x", "circle": "y", "economic": {}, "data": {}}
        valid, missing = gl.validate_schema("orchestrator", data)
        assert valid is True
        assert missing == []

    def test_validate_schema_missing_fields(self):
        gl = GuardrailLock()
        data = {"pattern": "x"}  # missing circle, economic, data
        valid, missing = gl.validate_schema("orchestrator", data)
        assert valid is False
        assert "circle" in missing
        assert "economic" in missing

    def test_validate_schema_unknown_tier(self):
        gl = GuardrailLock()
        valid, missing = gl.validate_schema("nonexistent_tier", {})
        assert valid is True  # unknown tiers skip validation


class TestGuardrailLockModePermissions(unittest.TestCase):
    """Mode permission checks."""

    def test_mutate_allows_write(self):
        gl = GuardrailLock(mode=OperationMode.MUTATE)
        allowed, reason = gl.check_mode_permission("write data")
        assert allowed is True
        assert "mutate_mode" in reason

    def test_advisory_blocks_write(self):
        gl = GuardrailLock(mode=OperationMode.ADVISORY)
        allowed, reason = gl.check_mode_permission("write data")
        assert allowed is False
        assert "advisory_mode" in reason

    def test_advisory_allows_read(self):
        gl = GuardrailLock(mode=OperationMode.ADVISORY)
        allowed, reason = gl.check_mode_permission("read report")
        assert allowed is True
        assert "advisory_allowed" in reason

    def test_enforcement_blocks_modify(self):
        gl = GuardrailLock(mode=OperationMode.ENFORCEMENT)
        allowed, reason = gl.check_mode_permission("modify config")
        assert allowed is False
        assert "enforcement_mode" in reason

    def test_enforcement_allows_read(self):
        gl = GuardrailLock(mode=OperationMode.ENFORCEMENT)
        allowed, reason = gl.check_mode_permission("analyze data")
        assert allowed is True


class TestGuardrailLockEnforce(unittest.TestCase):
    """Integration: enforce() checks mode + WIP + schema together."""

    def test_enforce_passes_all_checks(self):
        gl = GuardrailLock(mode=OperationMode.MUTATE)
        data = {"pattern": "x", "circle": "y", "economic": {}, "data": {}}
        allowed, reason, meta = gl.enforce("orchestrator", "read report", data, emit_events=False)
        assert allowed is True
        assert "guardrails_passed" in reason

    def test_enforce_blocks_on_wip(self):
        gl = GuardrailLock(mode=OperationMode.MUTATE)
        gl.current_wip["orchestrator"] = 3  # at limit
        data = {"pattern": "x", "circle": "y", "economic": {}, "data": {}}
        allowed, reason, meta = gl.enforce("orchestrator", "read", data, emit_events=False)
        assert allowed is False
        assert "wip_limit" in reason

    def test_enforce_blocks_on_schema(self):
        gl = GuardrailLock(mode=OperationMode.MUTATE)
        data = {"pattern": "x"}  # missing fields
        allowed, reason, meta = gl.enforce("orchestrator", "read", data, emit_events=False)
        assert allowed is False
        assert "schema_validation_failed" in reason

    def test_enforce_increments_wip_on_success(self):
        gl = GuardrailLock(mode=OperationMode.MUTATE)
        data = {"pattern": "x", "circle": "y", "economic": {}, "data": {}}
        gl.enforce("orchestrator", "read", data, emit_events=False)
        assert gl.current_wip["orchestrator"] == 1

    def test_enforce_advisory_skips_wip(self):
        gl = GuardrailLock(mode=OperationMode.ADVISORY)
        data = {"pattern": "x", "circle": "y", "economic": {}, "data": {}}
        allowed, _, _ = gl.enforce("orchestrator", "read", data, emit_events=False)
        assert allowed is True
        assert gl.current_wip["orchestrator"] == 0  # not incremented


class TestGuardrailLockSensorimotor(unittest.TestCase):
    """Sensorimotor agent registration and offload."""

    def test_register_and_offload(self):
        gl = GuardrailLock()
        gl.register_sensorimotor_agent("nlp", "http://nlp:8080")
        endpoint = gl.offload_to_specialist("nlp", {"text": "hello"})
        assert endpoint == "http://nlp:8080"

    def test_offload_missing_capability(self):
        gl = GuardrailLock()
        endpoint = gl.offload_to_specialist("missing", {})
        assert endpoint is None


class TestGuardrailLockStatus(unittest.TestCase):
    """Status reporting."""

    def test_get_status_structure(self):
        gl = GuardrailLock(mode=OperationMode.ADVISORY)
        status = gl.get_status()
        assert status["mode"] == "advisory"
        assert "wip_current" in status
        assert "wip_limits" in status
        assert status["wip_limits"]["orchestrator"] == 3


if __name__ == "__main__":
    unittest.main()
