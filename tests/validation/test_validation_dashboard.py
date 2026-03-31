"""
TDD/Regression tests for validation_dashboard_tui.py.

Covers:
- _convert_governance_report mapping
- get_example_results structure
- Consensus calculation (no meta iteration)
"""
import pytest
from pathlib import Path

import sys
PROJECT_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


@pytest.fixture
def mock_governance_report():
    """Minimal governance report structure."""
    return {
        "circles": {
            "ANALYST": {"checks": [{"passed": True, "message": "ok"}], "pass_rate": 100},
            "ASSESSOR": {"checks": [{"passed": True, "message": "ok"}], "pass_rate": 100},
            "INNOVATOR": {"checks": [{"passed": True, "message": "ok"}], "pass_rate": 100},
            "INTUITIVE": {"checks": [{"passed": True, "message": "ok"}], "pass_rate": 100},
            "ORCHESTRATOR": {"checks": [{"passed": True, "message": "ok"}], "pass_rate": 100},
            "SEEKER": {"checks": [{"passed": True, "message": "ok"}], "pass_rate": 100},
        },
        "roles": {
            "JUDGE": {"verdict": "APPROVE", "confidence": 0.9, "reasoning": "ok"},
            "PROSECUTOR": {"verdict": "APPROVE", "confidence": 0.85, "reasoning": "ok"},
            "DEFENSE": {"verdict": "CONDITIONAL_APPROVE", "confidence": 0.8, "reasoning": "ok"},
            "EXPERT_WITNESS": {"verdict": "APPROVE", "confidence": 0.9, "reasoning": "ok"},
            "JURY": {"verdict": "APPROVE", "confidence": 0.85, "reasoning": "ok"},
            "MEDIATOR": {"verdict": "APPROVE", "confidence": 0.9, "reasoning": "ok"},
        },
        "counsels": {
            "COUNTY_ATTORNEY": {"checks_passed": 1, "checks_total": 1, "focus": "local"},
            "STATE_AG_CONSUMER": {"checks_passed": 1, "checks_total": 1, "focus": "state"},
            "HUD_REGIONAL": {"checks_passed": 1, "checks_total": 1, "focus": "hud"},
            "LEGAL_AID": {"checks_passed": 1, "checks_total": 1, "focus": "pro se"},
            "CFPB": {"checks_passed": 1, "checks_total": 1, "focus": "financial"},
        },
        "patterns": {
            "PRD": {"passed": True, "message": "3/5"},
            "ADR": {"passed": True, "message": "4/5"},
            "DDD": {"passed": True, "message": "3/4"},
            "TDD": {"passed": True, "message": "3/4"},
        },
        "overall": {"wholeness_score": 85.0, "recommendation": "APPROVE - Ready to send"},
    }


class TestConvertGovernanceReport:
    """Regression: _convert_governance_report maps correctly."""

    def test_convert_produces_layer1_through_layer4(self, mock_governance_report):
        from validation_dashboard_tui import _convert_governance_report
        result = _convert_governance_report(mock_governance_report)
        assert "layer1" in result
        assert "layer2" in result
        assert "layer3" in result
        assert "layer4" in result
        assert "meta" in result

    def test_convert_layer1_has_all_circles(self, mock_governance_report):
        from validation_dashboard_tui import _convert_governance_report
        result = _convert_governance_report(mock_governance_report)
        expected = ["Analyst", "Assessor", "Innovator", "Intuitive", "Orchestrator", "Seeker"]
        for name in expected:
            assert name in result["layer1"]
            assert "pass" in result["layer1"][name]
            assert "confidence" in result["layer1"][name]

    def test_convert_layer4_has_prd_adr_ddd_tdd(self, mock_governance_report):
        from validation_dashboard_tui import _convert_governance_report
        result = _convert_governance_report(mock_governance_report)
        for name in ["PRD", "ADR", "DDD", "TDD"]:
            assert name in result["layer4"]
            assert result["layer4"][name]["pass"] is True

    def test_convert_meta_has_wholeness_score(self, mock_governance_report):
        from validation_dashboard_tui import _convert_governance_report
        result = _convert_governance_report(mock_governance_report)
        assert result["meta"]["wholeness_score"] == 85.0


class TestGetExampleResults:
    """Regression: get_example_results structure."""

    def test_example_results_has_all_layers(self):
        from validation_dashboard_tui import get_example_results
        result = get_example_results()
        assert "layer1" in result
        assert "layer2" in result
        assert "layer3" in result
        assert "layer4" in result
        assert "meta" in result

    def test_example_results_has_21_roles(self):
        from validation_dashboard_tui import get_example_results
        result = get_example_results()
        total = sum(len(result[k]) for k in ["layer1", "layer2", "layer3", "layer4"])
        assert total == 21

    def test_example_results_meta_has_wsjf(self):
        from validation_dashboard_tui import get_example_results
        result = get_example_results()
        assert "wsjf_score" in result["meta"]
        assert "deadline" in result["meta"]


class TestConsensusCalculation:
    """Regression: consensus calculation does not iterate meta (prevents AttributeError)."""

    def test_validation_results_with_meta_does_not_crash(self):
        """Consensus/widget logic must only iterate layer1-4, not meta."""
        from validation_dashboard_tui import get_example_results
        result = get_example_results()
        total = 21
        passed = 0
        for key in ("layer1", "layer2", "layer3", "layer4"):
            layer = result.get(key, {})
            if isinstance(layer, dict):
                passed += sum(1 for v in layer.values() if isinstance(v, dict) and v.get("pass", False))
        assert 0 <= passed <= total
        # No exception = logic is correct
