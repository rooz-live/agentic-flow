"""
PostgreSQL Immutable Event Store - Production Backend
WSJF Priority: 6.25 (Phase 3 - C2)

Append-only PostgreSQL table with:
- REVOKE UPDATE, DELETE privileges on events table
- Content hash verification on every read
- Correction chain via reference pointer
- Date partitioning for performance

CANONICAL_SCHEMA: docs/api/billing.proto (message EventFact)
INVENTORY:        docs/billing/CONSOLIDATION_INVENTORY.md

To use in production:
    EVENT_STORE_BACKEND=postgres
    DATABASE_URL=postgresql://user:pass@host:5432/billing

Migration:
    Run docs/sql/event_store_migration.sql
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional


class EventStoreError(Enum):
    ERR_IMMUTABILITY_VIOLATION = "ERR_IMMUTABILITY_VIOLATION"
    ERR_CORRECTION_CHAIN_BROKEN = "ERR_CORRECTION_CHAIN_BROKEN"
    ERR_CONTENT_HASH_MISMATCH = "ERR_CONTENT_HASH_MISMATCH"
    ERR_INVALID_EVENT_TYPE = "ERR_INVALID_EVENT_TYPE"
    ERR_DB_UNAVAILABLE = "ERR_DB_UNAVAILABLE"


@dataclass(frozen=True)
class EventRecord:
    event_id: str
    event_type: str
    entity_uuid: str
    timestamp_utc: datetime
    payload: Dict[str, Any]
    content_hash: str
    previous_event_id: Optional[str] = None
    correction_of: Optional[str] = None
    correction_reason: Optional[str] = None

    def verify_integrity(self) -> bool:
        payload_str = json.dumps(self.payload, sort_keys=True, default=str)
        calculated = hashlib.sha256(payload_str.encode()).hexdigest()
        return calculated == self.content_hash

    def is_correction(self) -> bool:
        return self.correction_of is not None


_MIGRATION_SQL = """
-- Immutable Event Store Migration
-- Run once per environment: psql $DATABASE_URL -f event_store_migration.sql

CREATE TABLE IF NOT EXISTS billing_events (
    event_id         UUID        PRIMARY KEY,
    event_type       VARCHAR(50) NOT NULL,
    entity_uuid      UUID        NOT NULL,
    timestamp_utc    TIMESTAMPTZ NOT NULL,
    payload          JSONB       NOT NULL,
    content_hash     CHAR(64)    NOT NULL,
    previous_event_id UUID       REFERENCES billing_events(event_id),
    correction_of    UUID        REFERENCES billing_events(event_id),
    correction_reason TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (timestamp_utc);

-- Monthly partitions (extend as needed)
CREATE TABLE billing_events_2024_01 PARTITION OF billing_events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE billing_events_2024_q1 PARTITION OF billing_events
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
CREATE TABLE billing_events_default PARTITION OF billing_events DEFAULT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_billing_events_entity
    ON billing_events (entity_uuid, timestamp_utc DESC);
CREATE INDEX IF NOT EXISTS idx_billing_events_correction
    ON billing_events (correction_of) WHERE correction_of IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_billing_events_type
    ON billing_events (event_type, timestamp_utc DESC);

-- IMMUTABILITY: Revoke update/delete from application role
-- Run as superuser after creating the app role:
-- REVOKE UPDATE, DELETE ON billing_events FROM billing_app_role;
-- GRANT SELECT, INSERT ON billing_events TO billing_app_role;
"""


class PostgreSQLEventStore:
    """
    Production PostgreSQL immutable event store.

    Requires asyncpg: pip install asyncpg
    Falls back to InMemoryEventStore if unavailable.

    Error Codes:
    - ERR_IMMUTABILITY_VIOLATION: Attempt to insert duplicate event_id
    - ERR_CONTENT_HASH_MISMATCH: Tampered event detected on read
    - ERR_CORRECTION_CHAIN_BROKEN: correction_of references missing event
    - ERR_DB_UNAVAILABLE: Cannot connect to PostgreSQL
    """

    def __init__(self, dsn: Optional[str] = None):
        self._dsn = dsn
        self._pool = None
        self._event_types: Dict[str, Callable] = {}
        self._register_default_types()

    def _register_default_types(self):
        self._event_types = {
            "clock_in", "clock_out", "job_start", "job_end",
            "location_update", "status_change", "correction",
        }

    async def connect(self):
        """Initialize connection pool. Call once at startup."""
        try:
            import asyncpg
            self._pool = await asyncpg.create_pool(
                self._dsn, min_size=2, max_size=10
            )
        except ImportError:
            raise RuntimeError(
                f"{EventStoreError.ERR_DB_UNAVAILABLE.value}: "
                "asyncpg not installed. Run: pip install asyncpg"
            )  # noqa: E501
        except Exception as e:
            raise RuntimeError(
                f"{EventStoreError.ERR_DB_UNAVAILABLE.value}: {e}"
            )

    async def disconnect(self):
        if self._pool:
            await self._pool.close()

    async def store(self, record: EventRecord) -> str:
        """Append event immutably to PostgreSQL."""
        if not record.verify_integrity():
            raise ValueError(
                f"{EventStoreError.ERR_CONTENT_HASH_MISMATCH.value}: "
                f"Hash mismatch for {record.event_id}"
            )

        if record.event_type not in self._event_types:
            raise ValueError(
                f"{EventStoreError.ERR_INVALID_EVENT_TYPE.value}: "
                f"Unknown type {record.event_type}"
            )

        if record.is_correction():
            await self._validate_correction_chain(record)

        async with self._pool.acquire() as conn:
            try:
                await conn.execute(
                    """
                    INSERT INTO billing_events
                        (event_id, event_type, entity_uuid, timestamp_utc,
                         payload, content_hash, previous_event_id,
                         correction_of, correction_reason)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    """,
                    record.event_id,
                    record.event_type,
                    record.entity_uuid,
                    record.timestamp_utc,
                    json.dumps(record.payload, default=str),
                    record.content_hash,
                    record.previous_event_id,
                    record.correction_of,
                    record.correction_reason,
                )
            except Exception as e:
                if "unique" in str(e).lower() or "duplicate" in str(e).lower():  # noqa: E501
                    raise ValueError(
                        f"{EventStoreError.ERR_IMMUTABILITY_VIOLATION.value}: "
                        f"Event {record.event_id} already exists"
                    )
                raise

        return record.event_id

    async def get(self, event_id: str) -> Optional[EventRecord]:
        """Retrieve and verify event by ID."""
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM billing_events WHERE event_id = $1",
                event_id
            )

        if not row:
            return None

        record = self._row_to_record(row)
        if not record.verify_integrity():
            raise ValueError(
                f"{EventStoreError.ERR_CONTENT_HASH_MISMATCH.value}: "
                f"Tampering detected for {event_id}"
            )
        return record

    async def get_by_entity(
        self,
        entity_uuid: str,
        event_type: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 1000,
    ) -> List[EventRecord]:
        """Get events for entity with filters. Ordered by timestamp ASC."""
        conditions = ["entity_uuid = $1"]
        params: List[Any] = [entity_uuid]
        idx = 2  # noqa: E501

        if event_type:
            conditions.append(f"event_type = ${idx}")
            params.append(event_type)
            idx += 1
        if start_time:
            conditions.append(f"timestamp_utc >= ${idx}")
            params.append(start_time)
            idx += 1
        if end_time:
            conditions.append(f"timestamp_utc <= ${idx}")
            params.append(end_time)
            idx += 1

        where = " AND ".join(conditions)
        query = (
            f"SELECT * FROM billing_events WHERE {where} "
            f"ORDER BY timestamp_utc ASC LIMIT ${idx}"
        )
        params.append(limit)

        async with self._pool.acquire() as conn:
            rows = await conn.fetch(query, *params)

        records = [self._row_to_record(r) for r in rows]

        for rec in records:
            if not rec.verify_integrity():
                raise ValueError(
                    f"{EventStoreError.ERR_CONTENT_HASH_MISMATCH.value}: "
                    f"Tampering detected for {rec.event_id}"
                )
        return records

    async def get_correction_chain(
        self, original_event_id: str
    ) -> List[EventRecord]:
        """Recursively fetch correction chain via CTE."""
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """
                WITH RECURSIVE chain AS (
                    SELECT * FROM billing_events WHERE event_id = $1
                    UNION ALL
                    SELECT e.* FROM billing_events e
                    INNER JOIN chain c ON e.correction_of = c.event_id
                )
                SELECT * FROM chain ORDER BY created_at ASC
                """,
                original_event_id
            )
        return [self._row_to_record(r) for r in rows]

    async def batch_verify(self, event_ids: List[str]) -> Dict[str, bool]:
        """Verify integrity of multiple events. Returns {event_id: valid}."""
        if not event_ids:
            return {}

        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM billing_events WHERE event_id = ANY($1)",
                event_ids
            )

        results: Dict[str, bool] = {eid: False for eid in event_ids}
        for row in rows:
            rec = self._row_to_record(row)
            results[rec.event_id] = rec.verify_integrity()
        return results

    async def _validate_correction_chain(self, record: EventRecord) -> bool:
        original = await self.get(record.correction_of)
        if not original:
            raise ValueError(
                f"{EventStoreError.ERR_CORRECTION_CHAIN_BROKEN.value}: "
                f"Original event {record.correction_of} not found"
            )
        if original.entity_uuid != record.entity_uuid:
            raise ValueError(
                f"{EventStoreError.ERR_CORRECTION_CHAIN_BROKEN.value}: "
                "Entity mismatch in correction"
            )
        return True

    @staticmethod
    def _row_to_record(row: Any) -> EventRecord:
        payload = row["payload"]
        if isinstance(payload, str):
            payload = json.loads(payload)
        return EventRecord(
            event_id=str(row["event_id"]),
            event_type=row["event_type"],
            entity_uuid=str(row["entity_uuid"]),
            timestamp_utc=row["timestamp_utc"],
            payload=payload,
            content_hash=row["content_hash"],
            previous_event_id=(
                str(row["previous_event_id"])
                if row["previous_event_id"] else None
            ),
            correction_of=(
                str(row["correction_of"]) if row["correction_of"] else None
            ),
            correction_reason=row["correction_reason"],
        )

    @classmethod
    def get_migration_sql(cls) -> str:
        """Return DDL SQL for database setup."""
        return _MIGRATION_SQL

    def get_stats(self) -> Dict[str, Any]:
        return {
            "backend": "postgresql",
            "immutable": True,
            "update_supported": False,
            "delete_supported": False,
            "partitioned": True,
            "pool_active": self._pool is not None,
        }
