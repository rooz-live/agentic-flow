"""
TDD/Regression tests for governance_council.py (21-role validation).

Covers:
- Layer 1: Circle orchestration (6)
- Layer 2: Legal role simulation (6)
- Layer 3: Government counsel (5)
- Layer 4: Software patterns (PRD/ADR/DDD/TDD)
- Signature block validation
- Full validation run
"""
import pytest
from pathlib import Path

import sys
PROJECT_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


@pytest.fixture
def settlement_content():
    """Minimal valid settlement email content."""
    return """Subject: Settlement - Case 26CV005596-590

Pursuant to N.C.G.S. § 42-42, I propose settlement. Evidence: 40+ work orders,
portal screenshots, medical records. I demand $15,000. Deadline: February 12, 2026.

Respectfully,
Shahrooz Bhopti
Pro Se (Evidence-Based Systemic Analysis)
BSBA Finance/Management Information Systems
Email: shahrooz@bhopti.com

---
Case No.: 26CV005596-590
Settlement Deadline: February 12, 2026 @ 5:00 PM EST"""


@pytest.fixture
def weak_content():
    """Content that should fail validation (no evidence, no case number)."""
    return "Please settle. I need money. Thanks."


@pytest.fixture
def governance_council():
    """Import GovernanceCouncil (lazy to avoid import errors)."""
    from vibesthinker.governance_council import GovernanceCouncil
    return GovernanceCouncil


class TestGovernanceCouncilFullValidation:
    """Regression: full validation run returns expected structure."""

    def test_full_validation_returns_report_structure(self, governance_council, settlement_content):
        council = governance_council()
        report = council.run_full_validation(settlement_content, doc_type="settlement")
        assert "metadata" in report
        assert "overall" in report
        assert "circles" in report
        assert "roles" in report
        assert "counsels" in report
        assert "patterns" in report
        assert "layers" in report

    def test_full_validation_overall_has_wholeness_score(self, governance_council, settlement_content):
        council = governance_council()
        report = council.run_full_validation(settlement_content, doc_type="settlement")
        overall = report["overall"]
        assert "wholeness_score" in overall
        assert 0 <= overall["wholeness_score"] <= 100
        assert "recommendation" in overall

    def test_full_validation_returns_21_roles(self, governance_council, settlement_content):
        council = governance_council()
        report = council.run_full_validation(settlement_content, doc_type="settlement")
        circles = report.get("circles", {})
        roles = report.get("roles", {})
        counsels = report.get("counsels", {})
        patterns = report.get("patterns", {})
        total = len(circles) + len(roles) + len(counsels) + len(patterns)
        assert total == 21, f"Expected 21 roles, got {total}"

    def test_valid_settlement_scores_high(self, governance_council, settlement_content):
        council = governance_council()
        report = council.run_full_validation(settlement_content, doc_type="settlement")
        score = report["overall"]["wholeness_score"]
        assert score >= 45, f"Valid settlement should score >=45, got {score}"

    def test_weak_content_scores_low(self, governance_council, weak_content):
        council = governance_council()
        report = council.run_full_validation(weak_content, doc_type="settlement")
        score = report["overall"]["wholeness_score"]
        assert score < 60, f"Weak content should score <60, got {score}"


class TestGovernanceCouncilLayers:
    """Regression: each layer produces expected output."""

    def test_layer1_circles_populated(self, governance_council, settlement_content):
        council = governance_council()
        report = council.run_full_validation(settlement_content)
        circles = report["circles"]
        expected = ["ANALYST", "ASSESSOR", "INNOVATOR", "INTUITIVE", "ORCHESTRATOR", "SEEKER"]
        for name in expected:
            assert name in circles
            assert "checks" in circles[name]
            assert "pass_rate" in circles[name]

    def test_layer2_roles_populated(self, governance_council, settlement_content):
        council = governance_council()
        report = council.run_full_validation(settlement_content)
        roles = report["roles"]
        expected = ["JUDGE", "PROSECUTOR", "DEFENSE", "EXPERT_WITNESS", "JURY", "MEDIATOR"]
        for name in expected:
            assert name in roles
            assert "verdict" in roles[name]
            assert roles[name]["verdict"] in ("APPROVE", "CONDITIONAL_APPROVE", "NEEDS_REVISION", "REJECT")

    def test_layer4_patterns_prd_adr_ddd_tdd(self, governance_council, settlement_content):
        council = governance_council()
        report = council.run_full_validation(settlement_content)
        patterns = report["patterns"]
        for name in ["PRD", "ADR", "DDD", "TDD"]:
            assert name in patterns
            assert "passed" in patterns[name]
            assert "message" in patterns[name]


class TestSignatureBlockValidation:
    """Regression: signature block validation."""

    def test_settlement_signature_valid(self, governance_council, settlement_content):
        council = governance_council()
        check = council.validate_signature_block(settlement_content, doc_type="settlement")
        assert check.passed


class TestAdversarialReview:
    """Regression: adversarial review mode."""

    def test_adversarial_review_returns_structure(self, governance_council, settlement_content):
        from vibesthinker.governance_council import AdversarialReview
        council = governance_council()
        council.run_full_validation(settlement_content)
        adv = AdversarialReview(council)
        report = adv.run_adversarial_review(settlement_content)
        assert "prosecution_case" in report
        assert "defense_weaknesses" in report
        assert "judge_ruling" in report
        assert "recommendation" in report


class TestRegressionFixture:
    """Regression: sample_settlement.eml fixture."""

    def test_fixture_file_validates(self, governance_council):
        fixture_path = PROJECT_ROOT / "tests" / "fixtures" / "sample_settlement.eml"
        if not fixture_path.exists():
            pytest.skip("Fixture file not found")
        content = fixture_path.read_text(encoding="utf-8")
        council = governance_council()
        report = council.run_full_validation(content, doc_type="settlement")
        assert report["overall"]["wholeness_score"] >= 50
        assert "26CV005596" in content
        assert "Pro Se" in content
