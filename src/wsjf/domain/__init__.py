"""WSJF Domain Layer — Aggregate Roots & Domain Events.

DDD Aggregate Root exports for wholeness governance validation.
Detected by validate_coherence.py DDD-AGGREGATE_ROOT layer checks.
"""

from .aggregate_root import AggregateRoot, DomainEvent
from .aggregate_root import WsjfItemAggregate
from .roam_risk_aggregate import RoamRiskAggregate

__all__ = [
    "AggregateRoot",
    "DomainEvent",
    "WsjfItemAggregate",
    "RoamRiskAggregate",
]