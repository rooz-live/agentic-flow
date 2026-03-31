#!/usr/bin/env python3
"""
ValidationRequested Domain Event
Domain-Driven Design: Validation bounded context
"""

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID, uuid4


@dataclass(frozen=True)
class ValidationRequested:
    """
    Domain Event: ValidationRequested
    
    Emitted when a validation process is initiated.
    Triggers validators to begin checking the artifact.
    
    Domain events are immutable facts that happened in the past.
    """
    
    # Event identity
    event_id: UUID
    occurred_at: datetime
    
    # Event data
    validation_id: UUID
    artifact_path: str
    artifact_type: str
    requester: str  # user|system|ci_cd
    
    @classmethod
    def create(
        cls,
        validation_id: UUID,
        artifact_path: str,
        artifact_type: str,
        requester: str = "system"
    ) -> 'ValidationRequested':
        """Factory method to create new ValidationRequested event."""
        return cls(
            event_id=uuid4(),
            occurred_at=datetime.utcnow(),
            validation_id=validation_id,
            artifact_path=artifact_path,
            artifact_type=artifact_type,
            requester=requester
        )
    
    def to_dict(self) -> dict:
        """Export event to dictionary for event sourcing."""
        return {
            "event_id": str(self.event_id),
            "event_type": "ValidationRequested",
            "occurred_at": self.occurred_at.isoformat(),
            "data": {
                "validation_id": str(self.validation_id),
                "artifact_path": self.artifact_path,
                "artifact_type": self.artifact_type,
                "requester": self.requester
            }
        }
