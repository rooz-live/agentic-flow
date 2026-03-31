"""DDD Aggregate Root Pattern for Python

Provides base classes for implementing Domain-Driven Design aggregate roots
with event sourcing capabilities.

## Pattern
An aggregate root:
- Has a unique identifier (UUID)
- Maintains invariants across its entity graph
- Controls access to child entities
- Publishes domain events for state changes
- Supports optimistic concurrency control via versioning

## Usage
```python
from src.wsjf.domain.aggregate_root import AggregateRoot, DomainEvent
from uuid import UUID, uuid4

@dataclass
class WsjfItemAggregate(AggregateRoot):
    business_value: int
    time_criticality: int
    
    def calculate_wsjf(self) -> float:
        score = (self.business_value + self.time_criticality) / self.job_size
        self.apply_event(DomainEvent(
            aggregate_id=self.id,
            event_type="WsjfCalculated",
            payload={"score": score}
        ))
        return score
```
"""

from abc import ABC
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List
from uuid import UUID


@dataclass
class DomainEvent:
    """Domain event emitted by aggregate roots
    
    Events represent state changes within an aggregate and can be used
    for event sourcing, CQRS, or inter-aggregate communication.
    """
    aggregate_id: UUID
    event_type: str
    payload: Dict[str, Any] = field(default_factory=dict)
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary for serialization"""
        return {
            "aggregate_id": str(self.aggregate_id),
            "event_type": self.event_type,
            "payload": self.payload,
            "occurred_at": self.occurred_at.isoformat(),
        }


@dataclass
class AggregateRoot(ABC):
    """Base class for DDD aggregate roots
    
    Provides event tracking, versioning, and transaction boundary enforcement.
    Subclasses should override this to add domain-specific fields and methods.
    
    Attributes:
        id: Unique identifier for this aggregate
        version: Version number for optimistic concurrency control
        _events: Internal list of uncommitted domain events
    """
    id: UUID
    version: int = field(default=0, kw_only=True)
    _events: List[DomainEvent] = field(default_factory=list, repr=False, compare=False, init=False)
    
    def apply_event(self, event: DomainEvent) -> None:
        """Record a domain event for this aggregate
        
        Args:
            event: The domain event to record
            
        Note:
            Events are not persisted until `mark_events_as_committed()` is called.
            This allows for transactional consistency within the aggregate boundary.
        """
        self._events.append(event)
        self.version += 1
    
    def get_uncommitted_events(self) -> List[DomainEvent]:
        """Retrieve all uncommitted domain events
        
        Returns:
            A copy of the uncommitted events list
            
        Note:
            Returns a copy to prevent external modification of internal state.
        """
        return self._events.copy()
    
    def mark_events_as_committed(self) -> None:
        """Mark all uncommitted events as committed
        
        This should be called after successfully persisting the aggregate
        and its events to the event store or database.
        """
        self._events.clear()
    
    def get_event_count(self) -> int:
        """Get the number of uncommitted events
        
        Returns:
            Count of uncommitted events
        """
        return len(self._events)


# Example domain aggregate implementations
@dataclass
class WsjfItemAggregate(AggregateRoot):
    """Example: WSJF item as an aggregate root
    
    Demonstrates how to extend AggregateRoot for domain-specific logic.
    """
    title: str = ""
    business_value: int = 0
    time_criticality: int = 0
    risk_reduction: int = 0
    job_size: int = 1
    
    def calculate_wsjf(self) -> float:
        """Calculate WSJF score and emit domain event"""
        if self.job_size == 0:
            raise ValueError("Job size cannot be zero")
        
        score = (self.business_value + self.time_criticality + self.risk_reduction) / self.job_size
        
        self.apply_event(DomainEvent(
            aggregate_id=self.id,
            event_type="WsjfCalculated",
            payload={
                "score": score,
                "business_value": self.business_value,
                "time_criticality": self.time_criticality,
                "risk_reduction": self.risk_reduction,
                "job_size": self.job_size,
            }
        ))
        
        return score
