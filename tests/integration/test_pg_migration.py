"""
Integration tests for the PostgreSQL billing_events migration.

Run with:
    pytest tests/integration/test_pg_migration.py -m integration_pg

The tests require the billing-pg Docker service to be running and healthy.
They are skipped automatically when the database is unreachable.
"""
import pytest

try:
    import psycopg2
    import psycopg2.errors
except ImportError:
    pytest.skip("psycopg2 not installed", allow_module_level=True)

# ---------------------------------------------------------------------------
# Connection constants (match docker-compose.yml defaults)
# ---------------------------------------------------------------------------
_DSN = {
    "host": "localhost",
    "port": 5432,
    "dbname": "billing_events",
    "user": "billing_app_role",
    "password": "billing_dev_2026",
    "connect_timeout": 3,
}

EXPECTED_COLUMNS = {
    "event_id",
    "event_type",
    "entity_uuid",
    "timestamp_utc",
    "payload",
    "content_hash",
}


# ---------------------------------------------------------------------------
# Session-scoped fixture: single connection for all tests in this module
# ---------------------------------------------------------------------------
@pytest.fixture(scope="module")
def pg_conn():
    """Return a live psycopg2 connection, or skip the whole module."""
    try:
        conn = psycopg2.connect(**_DSN)
        conn.autocommit = False
    except psycopg2.OperationalError as exc:
        pytest.skip(f"Cannot connect to billing-pg (Docker not running?): {exc}")

    yield conn

    conn.rollback()
    conn.close()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _table_exists(cur, table_name: str) -> bool:
    cur.execute(
        """
        SELECT EXISTS (
            SELECT 1
            FROM   information_schema.tables
            WHERE  table_name = %s
              AND  table_schema = 'public'
        )
        """,
        (table_name,),
    )
    return cur.fetchone()[0]


def _column_names(cur, table_name: str) -> set:
    cur.execute(
        """
        SELECT column_name
        FROM   information_schema.columns
        WHERE  table_name   = %s
          AND  table_schema = 'public'
        """,
        (table_name,),
    )
    return {row[0] for row in cur.fetchall()}


def _partition_count(cur, parent_table: str) -> int:
    cur.execute(
        """
        SELECT COUNT(*)
        FROM   pg_inherits i
        JOIN   pg_class    p ON p.oid = i.inhparent
        WHERE  p.relname = %s
        """,
        (parent_table,),
    )
    return cur.fetchone()[0]


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------
@pytest.mark.integration_pg
class TestPgMigration:
    """Verify the event_store_migration.sql was applied correctly."""

    def test_billing_events_table_exists(self, pg_conn):
        """The billing_events table (or partitioned parent) must exist."""
        with pg_conn.cursor() as cur:
            assert _table_exists(cur, "billing_events"), (
                "Table 'billing_events' not found in public schema. "
                "Has the migration run?"
            )

    def test_billing_events_has_required_columns(self, pg_conn):
        """All canonical columns must be present."""
        with pg_conn.cursor() as cur:
            actual = _column_names(cur, "billing_events")

        missing = EXPECTED_COLUMNS - actual
        assert not missing, (
            f"billing_events is missing columns: {missing}. "
            f"Found: {actual}"
        )

    def test_partitions_exist(self, pg_conn):
        """At least one partition must be attached to billing_events."""
        with pg_conn.cursor() as cur:
            count = _partition_count(cur, "billing_events")

        assert count >= 1, (
            "No partitions found for billing_events. "
            "Migration should create at least one declarative partition."
        )

    def test_insert_succeeds(self, pg_conn):
        """billing_app_role must be able to INSERT (append-only contract)."""
        with pg_conn.cursor() as cur:
            try:
                cur.execute(
                    """
                    INSERT INTO billing_events
                        (event_type, entity_uuid, timestamp_utc, payload, content_hash)
                    VALUES
                        ('test.probe', gen_random_uuid(), NOW(),
                         '{"probe": true}'::jsonb,
                         md5('probe')::text)
                    """
                )
                # Capture the inserted row for later update attempt
                cur.execute(
                    "SELECT event_id FROM billing_events "
                    "WHERE event_type = 'test.probe' "
                    "ORDER BY timestamp_utc DESC LIMIT 1"
                )
                row = cur.fetchone()
            except psycopg2.Error as exc:
                pg_conn.rollback()
                pytest.fail(f"INSERT failed unexpectedly: {exc}")

        # Roll back so the probe row doesn't persist
        pg_conn.rollback()
        assert row is not None, "INSERT appeared to succeed but no row found."

    def test_update_is_denied(self, pg_conn):
        """
        billing_app_role must NOT be able to UPDATE rows
        (immutable / append-only event store).
        """
        # First insert a row in its own transaction savepoint
        with pg_conn.cursor() as cur:
            try:
                cur.execute("SAVEPOINT before_probe")
                cur.execute(
                    """
                    INSERT INTO billing_events
                        (event_type, entity_uuid, timestamp_utc, payload, content_hash)
                    VALUES
                        ('test.probe.update', gen_random_uuid(), NOW(),
                         '{}'::jsonb, md5('upd')::text)
                    """
                )
                cur.execute(
                    "SELECT event_id FROM billing_events "
                    "WHERE event_type = 'test.probe.update' "
                    "ORDER BY timestamp_utc DESC LIMIT 1"
                )
                row = cur.fetchone()
            except psycopg2.Error as exc:
                pg_conn.rollback()
                pytest.skip(f"Could not insert probe row for UPDATE test: {exc}")

        if row is None:
            pg_conn.rollback()
            pytest.skip("No probe row available to attempt UPDATE against.")

        event_id = row[0]

        # Now attempt the UPDATE — it must be denied
        with pg_conn.cursor() as cur:
            try:
                cur.execute(
                    "UPDATE billing_events SET event_type = 'tampered' "
                    "WHERE event_id = %s",
                    (event_id,),
                )
                pg_conn.rollback()
                pytest.fail(
                    "UPDATE succeeded — billing_app_role should NOT have UPDATE "
                    "privilege on billing_events (append-only store)."
                )
            except psycopg2.errors.InsufficientPrivilege:
                # Expected: permission denied
                pg_conn.rollback()
            except psycopg2.Error as exc:
                pg_conn.rollback()
                pytest.fail(
                    f"UPDATE raised an unexpected error (wanted InsufficientPrivilege): {exc}"
                )
