"""
Tests for docs/sql/event_store_migration.sql — verifies the SQL file
exists and contains required DDL for the immutable billing_events event store.
"""
import pathlib

SQL_FILE = pathlib.Path(__file__).parents[2] / "docs" / "sql" / "event_store_migration.sql"


def _sql() -> str:
    return SQL_FILE.read_text()


def test_sql_file_exists():
    assert SQL_FILE.exists(), f"Migration SQL file not found: {SQL_FILE}"


def test_creates_billing_events_table():
    assert "CREATE TABLE IF NOT EXISTS billing_events" in _sql()


def test_partition_by_range():
    assert "PARTITION BY RANGE" in _sql()


def test_immutability_revoke_update():
    assert "REVOKE UPDATE" in _sql()


def test_immutability_revoke_delete():
    assert "REVOKE DELETE" in _sql()


def test_at_least_eight_quarterly_partitions():
    # Count lines that define a PARTITION OF billing_events with quarterly names
    partition_lines = [
        line for line in _sql().splitlines()
        if "PARTITION OF billing_events" in line and "_q" in line
    ]
    assert len(partition_lines) >= 8, (
        f"Expected >= 8 quarterly partitions, found {len(partition_lines)}: {partition_lines}"
    )


def test_no_python_triple_quote_artifacts():
    sql = _sql()
    assert '"""' not in sql
    assert "'''" not in sql
