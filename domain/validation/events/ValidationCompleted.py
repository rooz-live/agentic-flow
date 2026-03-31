#!/usr/bin/env python3
"""
ValidationCompleted Domain Event
Domain-Driven Design: Validation bounded context
"""

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID, uuid4


@dataclass(frozen=True)
class ValidationCompleted:
    """
    Domain Event: ValidationCompleted
    
    Emitted when a validation process finishes (pass/fail/blocked).
    Triggers downstream actions like email sends, CI/CD gates, notifications.
    
    Domain events are immutable facts that happened in the past.
    """
    
    # Event identity
    event_id: UUID
    occurred_at: datetime
    
    # Event data
    validation_id: UUID
    artifact_path: str
    verdict: str  # PASS|FAIL|BLOCKED
    pass_count: int
    fail_count: int
    dpc_score: float
    
    @classmethod
    def create(
        cls,
        validation_id: UUID,
        artifact_path: str,
        verdict: str,
        pass_count: int,
        fail_count: int,
        dpc_score: float
    ) -> 'ValidationCompleted':
        """Factory method to create new ValidationCompleted event."""
        return cls(
            event_id=uuid4(),
            occurred_at=datetime.utcnow(),
            validation_id=validation_id,
            artifact_path=artifact_path,
            verdict=verdict,
            pass_count=pass_count,
            fail_count=fail_count,
            dpc_score=dpc_score
        )
    
    def to_dict(self) -> dict:
        """Export event to dictionary for event sourcing."""
        return {
            "event_id": str(self.event_id),
            "event_type": "ValidationCompleted",
            "occurred_at": self.occurred_at.isoformat(),
            "data": {
                "validation_id": str(self.validation_id),
                "artifact_path": self.artifact_path,
                "verdict": self.verdict,
                "pass_count": self.pass_count,
                "fail_count": self.fail_count,
                "dpc_score": self.dpc_score
            }
        }
