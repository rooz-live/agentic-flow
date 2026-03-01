#!/usr/bin/env python3
"""
TDD Tests for DDD Aggregate Roots
===================================
Tests event sourcing, invariant enforcement, and lifecycle management
for AggregateRoot, WsjfItemAggregate, and RoamRiskAggregate.

DoR: Aggregate root classes implemented in src/wsjf/domain/
DoD: All invariants tested, event sourcing validated, lifecycle transitions covered
"""

import pytest
import sys
from pathlib import Path
from uuid import uuid4, UUID

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from wsjf.domain.aggregate_root import AggregateRoot, DomainEvent, WsjfItemAggregate
from wsjf.domain.roam_risk_aggregate import (
    RoamRiskAggregate,
    RoamRiskType,
    RoamCategory,
)


# ═════════════════════════════════════════════════════════════════════
# DomainEvent Tests
# ═════════════════════════════════════════════════════════════════════


class TestDomainEvent:
    """Test domain event creation and serialization."""

    def test_event_creation(self):
        agg_id = uuid4()
        event = DomainEvent(
            aggregate_id=agg_id,
            event_type="TestEvent",
            payload={"key": "value"},
        )
        assert event.aggregate_id == agg_id
        assert event.event_type == "TestEvent"
        assert event.payload == {"key": "value"}
        assert event.occurred_at is not None

    def test_event_to_dict(self):
        agg_id = uuid4()
        event = DomainEvent(
            aggregate_id=agg_id,
            event_type="Serialized",
            payload={"score": 5.0},
        )
        d = event.to_dict()
        assert d["aggregate_id"] == str(agg_id)
        assert d["event_type"] == "Serialized"
        assert d["payload"]["score"] == 5.0
        assert "occurred_at" in d


# ═════════════════════════════════════════════════════════════════════
# AggregateRoot Base Class Tests
# ═════════════════════════════════════════════════════════════════════


class TestAggregateRoot:
    """Test base AggregateRoot event tracking and versioning."""

    def test_initial_state(self):
        agg = WsjfItemAggregate(id=uuid4())
        assert agg.version == 0
        assert agg.get_event_count() == 0
        assert agg.get_uncommitted_events() == []

    def test_apply_event_increments_version(self):
        agg = WsjfItemAggregate(id=uuid4())
        event = DomainEvent(
            aggregate_id=agg.id,
            event_type="Test",
            payload={},
        )
        agg.apply_event(event)
        assert agg.version == 1
        assert agg.get_event_count() == 1

    def test_multiple_events_track_correctly(self):
        agg = WsjfItemAggregate(id=uuid4())
        for i in range(5):
            agg.apply_event(DomainEvent(
                aggregate_id=agg.id,
                event_type=f"Event{i}",
                payload={"i": i},
            ))
        assert agg.version == 5
        assert agg.get_event_count() == 5
        assert len(agg.get_uncommitted_events()) == 5

    def test_get_uncommitted_events_returns_copy(self):
        agg = WsjfItemAggregate(id=uuid4())
        agg.apply_event(DomainEvent(
            aggregate_id=agg.id, event_type="Test", payload={}
        ))
        events = agg.get_uncommitted_events()
        events.clear()  # Mutate the copy
        assert agg.get_event_count() == 1  # Original unchanged

    def test_mark_events_as_committed(self):
        agg = WsjfItemAggregate(id=uuid4())
        agg.apply_event(DomainEvent(
            aggregate_id=agg.id, event_type="Test", payload={}
        ))
        assert agg.get_event_count() == 1
        agg.mark_events_as_committed()
        assert agg.get_event_count() == 0
        # Version is preserved after commit
        assert agg.version == 1


# ═════════════════════════════════════════════════════════════════════
# WsjfItemAggregate Tests
# ═════════════════════════════════════════════════════════════════════


class TestWsjfItemAggregate:
    """Test WSJF item domain logic and event emission."""

    def test_calculate_wsjf_score(self):
        item = WsjfItemAggregate(
            id=uuid4(),
            title="Fix critical bug",
            business_value=8,
            time_criticality=9,
            risk_reduction=7,
            job_size=3,
        )
        score = item.calculate_wsjf()
        # (8 + 9 + 7) / 3 = 8.0
        assert score == 8.0

    def test_calculate_wsjf_emits_event(self):
        item = WsjfItemAggregate(
            id=uuid4(),
            title="Feature",
            business_value=5,
            time_criticality=5,
            risk_reduction=5,
            job_size=5,
        )
        score = item.calculate_wsjf()
        assert item.get_event_count() == 1
        event = item.get_uncommitted_events()[0]
        assert event.event_type == "WsjfCalculated"
        assert event.payload["score"] == score
        assert event.payload["business_value"] == 5

    def test_calculate_wsjf_zero_job_size_raises(self):
        item = WsjfItemAggregate(
            id=uuid4(),
            title="Bad",
            business_value=5,
            time_criticality=5,
            risk_reduction=5,
            job_size=0,
        )
        with pytest.raises(ValueError, match="zero"):
            item.calculate_wsjf()

    def test_default_values(self):
        item = WsjfItemAggregate(id=uuid4())
        assert item.title == ""
        assert item.business_value == 0
        assert item.job_size == 1
        score = item.calculate_wsjf()
        # (0+0+0)/1 = 0.0
        assert score == 0.0


# ═════════════════════════════════════════════════════════════════════
# RoamRiskAggregate Tests
# ═════════════════════════════════════════════════════════════════════


class TestRoamRiskAggregate:
    """Test ROAM risk lifecycle, invariants, and event sourcing."""

    def _make_risk(self, **kwargs) -> RoamRiskAggregate:
        defaults = dict(
            id=uuid4(),
            risk_id="R-2026-TEST",
            title="Test Risk",
            risk_type=RoamRiskType.SITUATIONAL,
            category=RoamCategory.OWNED,
            confidence=0.7,
            likelihood=0.5,
            reasoning="Test reasoning",
            escalation_level=0,
        )
        defaults.update(kwargs)
        return RoamRiskAggregate(**defaults)

    # ── Initialization & Invariants ──

    def test_valid_creation(self):
        risk = self._make_risk()
        assert risk.risk_id == "R-2026-TEST"
        assert risk.risk_type == RoamRiskType.SITUATIONAL
        assert risk.category == RoamCategory.OWNED
        assert risk.confidence == 0.7

    def test_confidence_out_of_range_raises(self):
        with pytest.raises(ValueError, match="Confidence"):
            self._make_risk(confidence=1.5)

    def test_confidence_negative_raises(self):
        with pytest.raises(ValueError, match="Confidence"):
            self._make_risk(confidence=-0.1)

    def test_likelihood_out_of_range_raises(self):
        with pytest.raises(ValueError, match="Likelihood"):
            self._make_risk(likelihood=2.0)

    def test_systemic_requires_high_escalation(self):
        with pytest.raises(ValueError, match="SYSTEMIC"):
            self._make_risk(
                risk_type=RoamRiskType.SYSTEMIC,
                escalation_level=1,  # Must be >= 2
            )

    def test_systemic_with_valid_escalation(self):
        risk = self._make_risk(
            risk_type=RoamRiskType.SYSTEMIC,
            escalation_level=3,
        )
        assert risk.escalation_level == 3

    # ── classify_as ──

    def test_classify_as_emits_event(self):
        risk = self._make_risk()
        risk.classify_as(
            RoamRiskType.STRATEGIC,
            confidence=0.9,
            reasoning="Pattern detected",
            indicators=["delayed response", "legal maneuvering"],
        )
        assert risk.risk_type == RoamRiskType.STRATEGIC
        assert risk.confidence == 0.9
        assert risk.get_event_count() == 1
        event = risk.get_uncommitted_events()[0]
        assert event.event_type == "RiskReclassified"
        assert event.payload["old_type"] == "situational"
        assert event.payload["new_type"] == "strategic"

    def test_classify_as_requires_reasoning(self):
        risk = self._make_risk()
        with pytest.raises(ValueError, match="Reasoning"):
            risk.classify_as(RoamRiskType.STRATEGIC, 0.9, "", [])

    def test_classify_as_validates_confidence(self):
        risk = self._make_risk()
        with pytest.raises(ValueError, match="Confidence"):
            risk.classify_as(RoamRiskType.STRATEGIC, 1.5, "reason", [])

    # ── change_category ──

    def test_change_category_emits_event(self):
        risk = self._make_risk()
        risk.change_category(RoamCategory.MITIGATED, "Added countermeasures")
        assert risk.category == RoamCategory.MITIGATED
        assert risk.get_event_count() == 1
        event = risk.get_uncommitted_events()[0]
        assert event.event_type == "RiskCategoryChanged"
        assert event.payload["old_category"] == "owned"
        assert event.payload["new_category"] == "mitigated"

    def test_resolved_risk_cannot_change_category(self):
        risk = self._make_risk()
        risk.resolve("Fixed the issue")
        with pytest.raises(ValueError, match="RESOLVED"):
            risk.change_category(RoamCategory.OWNED, "Trying to reopen")

    def test_change_category_requires_reason(self):
        risk = self._make_risk()
        with pytest.raises(ValueError, match="Reason"):
            risk.change_category(RoamCategory.MITIGATED, "")

    # ── escalate ──

    def test_escalate_emits_event(self):
        risk = self._make_risk(escalation_level=0)
        risk.escalate(2, "Situation worsened")
        assert risk.escalation_level == 2
        assert risk.get_event_count() == 1
        event = risk.get_uncommitted_events()[0]
        assert event.event_type == "RiskEscalated"
        assert event.payload["old_level"] == 0
        assert event.payload["new_level"] == 2

    def test_cannot_downgrade_escalation(self):
        risk = self._make_risk(escalation_level=2,
                               risk_type=RoamRiskType.SYSTEMIC)
        with pytest.raises(ValueError, match="downgrade"):
            risk.escalate(1, "Trying to de-escalate")

    def test_cannot_escalate_resolved_risk(self):
        risk = self._make_risk()
        risk.resolve("Done")
        with pytest.raises(ValueError, match="RESOLVED"):
            risk.escalate(2, "Should fail")

    def test_escalate_requires_justification(self):
        risk = self._make_risk()
        with pytest.raises(ValueError, match="Justification"):
            risk.escalate(1, "")

    def test_escalate_validates_level_range(self):
        risk = self._make_risk()
        with pytest.raises(ValueError, match="0-3"):
            risk.escalate(4, "Too high")

    # ── resolve ──

    def test_resolve_emits_event(self):
        risk = self._make_risk()
        risk.resolve("Landlord accepted amendments")
        assert risk.category == RoamCategory.RESOLVED
        assert risk.get_event_count() == 1
        event = risk.get_uncommitted_events()[0]
        assert event.event_type == "RiskResolved"
        assert event.payload["resolution_notes"] == "Landlord accepted amendments"

    def test_resolve_requires_notes(self):
        risk = self._make_risk()
        with pytest.raises(ValueError, match="Resolution"):
            risk.resolve("")

    # ── add_indicator ──

    def test_add_indicator_emits_event(self):
        risk = self._make_risk()
        risk.add_indicator("Delayed response to amendments")
        assert "Delayed response to amendments" in risk.indicators
        assert risk.get_event_count() == 1
        event = risk.get_uncommitted_events()[0]
        assert event.event_type == "RiskIndicatorAdded"

    def test_add_duplicate_indicator_no_event(self):
        risk = self._make_risk(indicators=["existing"])
        risk.add_indicator("existing")
        assert risk.get_event_count() == 0  # No duplicate event

    # ── to_dict ──

    def test_to_dict_serialization(self):
        risk = self._make_risk()
        d = risk.to_dict()
        assert d["risk_id"] == "R-2026-TEST"
        assert d["risk_type"] == "situational"
        assert d["category"] == "owned"
        assert d["confidence"] == 0.7
        assert d["version"] == 0
        assert d["uncommitted_events"] == 0

    # ── Full lifecycle ──

    def test_full_lifecycle(self):
        """Test complete ROAM risk lifecycle: create → classify → escalate → mitigate → resolve."""
        risk = self._make_risk()

        # 1. Add indicators
        risk.add_indicator("Landlord delayed 5+ hours")
        risk.add_indicator("All amendments rejected")
        assert risk.get_event_count() == 2

        # 2. Reclassify based on indicators
        risk.classify_as(
            RoamRiskType.STRATEGIC,
            confidence=0.85,
            reasoning="Pattern of deliberate delay",
            indicators=risk.indicators,
        )
        assert risk.get_event_count() == 3

        # 3. Escalate
        risk.escalate(2, "DocuSign deadline today")
        assert risk.escalation_level == 2
        assert risk.get_event_count() == 4

        # 4. Mitigate
        risk.change_category(RoamCategory.MITIGATED, "Signed DocuSign as-is")
        assert risk.get_event_count() == 5

        # 5. Resolve
        risk.resolve("Lease signed, moved in March 4")
        assert risk.category == RoamCategory.RESOLVED
        assert risk.get_event_count() == 6
        assert risk.version == 6

        # 6. Commit events
        risk.mark_events_as_committed()
        assert risk.get_event_count() == 0
        assert risk.version == 6  # Version preserved
