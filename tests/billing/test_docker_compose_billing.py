"""
Tests for docker-compose.billing.yml — verifies the billing-specific compose
file exists and contains the required service definitions, volume mounts, and
dependency conditions for the append-only PostgreSQL event store.

Stdlib only (pathlib) — no docker or pyyaml dependency required.
"""
import pathlib

COMPOSE_FILE = pathlib.Path(__file__).parents[2] / "docker-compose.billing.yml"


def _content() -> str:
    return COMPOSE_FILE.read_text()


def test_compose_file_exists():
    """docker-compose.billing.yml must exist at the repo root."""
    assert COMPOSE_FILE.exists(), f"Compose file not found: {COMPOSE_FILE}"


def test_contains_billing_postgres_service():
    """The billing-postgres service must be declared."""
    assert "billing-postgres:" in _content(), (
        "Expected 'billing-postgres:' service definition in docker-compose.billing.yml"
    )


def test_contains_billing_migrate_service():
    """The billing-migrate one-shot migration runner must be declared."""
    assert "billing-migrate:" in _content(), (
        "Expected 'billing-migrate:' service definition in docker-compose.billing.yml"
    )


def test_contains_event_store_migration_sql_volume_mount():
    """The migration SQL file must be volume-mounted into at least one service."""
    assert "event_store_migration.sql" in _content(), (
        "Expected 'event_store_migration.sql' volume mount reference in docker-compose.billing.yml"
    )


def test_contains_billing_events_database_name():
    """The billing_events database name must appear in the compose file."""
    assert "billing_events" in _content(), (
        "Expected 'billing_events' database name in docker-compose.billing.yml"
    )


def test_contains_service_healthy_condition():
    """Migration must only run after postgres is healthy (immutability gate)."""
    assert "service_healthy" in _content(), (
        "Expected 'service_healthy' dependency condition in docker-compose.billing.yml — "
        "billing-migrate must wait for a healthy billing-postgres before running"
    )
