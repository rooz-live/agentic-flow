-- =============================================================================
-- event_store_migration.sql
-- PostgreSQL DDL for the billing_events immutable / append-only event store.
--
-- Purpose  : Create the partitioned billing_events table, supporting indexes,
--            and enforce immutability by revoking UPDATE/DELETE from the
--            application role.
--
-- Usage    : psql $DATABASE_URL -f docs/sql/event_store_migration.sql
--
-- Notes    :
--   • Run once per environment (idempotent — all statements use IF NOT EXISTS).
--   • The REVOKE/GRANT block at the bottom requires superuser privileges;
--     review the "Run as superuser" section and execute manually if your
--     application role differs from billing_app_role.
--   • Extend partitions annually; the table has a DEFAULT catch-all partition
--     so data is never lost while new partitions are being added.
-- =============================================================================

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

-- -----------------------------------------------------------------------------
-- Quarterly partitions
-- NOTE: billing_events_2024_01 (monthly) was removed because it overlapped
--       with billing_events_2024_q1 (quarterly, 2024-01-01 → 2024-04-01).
--       The quarterly partition supersedes the narrower monthly one.
-- -----------------------------------------------------------------------------

-- 2024 partitions
CREATE TABLE IF NOT EXISTS billing_events_2024_q1 PARTITION OF billing_events
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
CREATE TABLE IF NOT EXISTS billing_events_2024_q2 PARTITION OF billing_events
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');
CREATE TABLE IF NOT EXISTS billing_events_2024_q3 PARTITION OF billing_events
    FOR VALUES FROM ('2024-07-01') TO ('2024-10-01');
CREATE TABLE IF NOT EXISTS billing_events_2024_q4 PARTITION OF billing_events
    FOR VALUES FROM ('2024-10-01') TO ('2025-01-01');

-- 2025 partitions
CREATE TABLE IF NOT EXISTS billing_events_2025_q1 PARTITION OF billing_events FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE IF NOT EXISTS billing_events_2025_q2 PARTITION OF billing_events FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
CREATE TABLE IF NOT EXISTS billing_events_2025_q3 PARTITION OF billing_events FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');
CREATE TABLE IF NOT EXISTS billing_events_2025_q4 PARTITION OF billing_events FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');

-- 2026 partitions
CREATE TABLE IF NOT EXISTS billing_events_2026_q1 PARTITION OF billing_events FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE IF NOT EXISTS billing_events_2026_q2 PARTITION OF billing_events FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE IF NOT EXISTS billing_events_2026_q3 PARTITION OF billing_events FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');
CREATE TABLE IF NOT EXISTS billing_events_2026_q4 PARTITION OF billing_events FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');

-- Default catch-all partition (captures any rows outside defined ranges)
CREATE TABLE IF NOT EXISTS billing_events_default PARTITION OF billing_events DEFAULT;

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_billing_events_entity
    ON billing_events (entity_uuid, timestamp_utc DESC);
CREATE INDEX IF NOT EXISTS idx_billing_events_correction
    ON billing_events (correction_of) WHERE correction_of IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_billing_events_type
    ON billing_events (event_type, timestamp_utc DESC);

-- -----------------------------------------------------------------------------
-- IMMUTABILITY: Revoke update/delete from application role
-- Run as superuser after creating the app role:
-- -----------------------------------------------------------------------------
REVOKE UPDATE ON billing_events FROM billing_app_role;
REVOKE DELETE ON billing_events FROM billing_app_role;
GRANT SELECT, INSERT ON billing_events TO billing_app_role;
