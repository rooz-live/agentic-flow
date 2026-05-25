"""
Immutable Event Store - Append-Only PostgreSQL
WSJF Priority: 5.00 (Phase 3)

CANONICAL_SCHEMA: docs/api/billing.proto (message EventFact)
INVENTORY:        docs/billing/CONSOLIDATION_INVENTORY.md

Backends:
  EventStore         — In-memory (testing)
  PostgreSQLEventStore — asyncpg production backend
  EVENT_STORE_BACKEND=memory|postgres
"""
from .event_store import EventStore, EventRecord
from .event_store_pg import PostgreSQLEventStore

__all__ = ['EventStore', 'EventRecord', 'PostgreSQLEventStore']
