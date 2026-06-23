"""
conftest_billing.py — pytest fixtures for billing domain tests

HARNESS:    tests/harness/BaseBillingE2ESpec.ts
MARKER:     @pytest.mark.billing (registered in tests/pytest.ini)
INVENTORY:  docs/billing/CONSOLIDATION_INVENTORY.md

Usage in billing tests:
    import pytest

    @pytest.mark.billing
    def test_something(invoice_engine, sample_line_item, tax_zero_usd):
        ...
"""

from __future__ import annotations

import json
import os
import fcntl
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

import pytest

from src.billing.invoice_engine import (
    Invoice,
    InvoiceEngine,
    InvoiceLineItem,
    LineItemType,
    LineItemType,
    Money,
)


@pytest.fixture(scope="session", autouse=True)
def decentralized_parallel_lock():
    lock_dir = Path(".goalie/locks")
    lock_dir.mkdir(parents=True, exist_ok=True)
    lock_file = lock_dir / "billing_integration.lock"
    
    with open(lock_file, "w") as f:
        try:
            fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)
            yield
        except BlockingIOError:
            print("Waiting for billing integration lock...")
            fcntl.flock(f, fcntl.LOCK_EX)
            yield
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)


# ─── Domain Engine Fixtures ──────────────────────────────────────────────────

@pytest.fixture
def invoice_engine() -> InvoiceEngine:
    return InvoiceEngine()


# ─── Money Fixtures ──────────────────────────────────────────────────────────

@pytest.fixture
def tax_zero_usd() -> Money:
    return Money.zero("USD")


@pytest.fixture
def tax_ten_percent() -> Money:
    return Money(Decimal("10.00"), "USD")


# ─── Line Item Fixtures ──────────────────────────────────────────────────────

@pytest.fixture
def sample_line_item() -> InvoiceLineItem:
    return InvoiceLineItem(
        line_id="line-001",
        item_type=LineItemType.LABOR,
        description="On-site support 2h",
        quantity=Decimal("2"),
        unit_price=Money(Decimal("50.00"), "USD"),
        event_id_ref="evt-abc123",
        rate_id="rate-standard",
    )


@pytest.fixture
def ceremony_line_item() -> InvoiceLineItem:
    return InvoiceLineItem(
        line_id="line-002",
        item_type=LineItemType.CEREMONY,
        description="Sprint retrospective 1h",
        quantity=Decimal("1"),
        unit_price=Money(Decimal("75.00"), "USD"),
    )


# ─── DateTime Fixtures ───────────────────────────────────────────────────────

@pytest.fixture
def due_date_30_days() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=30)


@pytest.fixture
def due_date_past() -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=1)


# ─── Invoice Fixtures ────────────────────────────────────────────────────────

@pytest.fixture
def draft_invoice(
    invoice_engine,
    sample_line_item,
    tax_zero_usd,
    due_date_30_days,
) -> Invoice:
    return invoice_engine.generate(
        project_id="proj-001",
        client_uuid="client-uuid-abc",
        technician_uuid="tech-uuid-xyz",
        line_items=[sample_line_item],
        tax_amount=tax_zero_usd,
        due_date=due_date_30_days,
        calculation_id="calc-001",
        job_id="job-001",
        job_signed_off=True,
    )  # noqa: E501


@pytest.fixture
def issued_invoice(invoice_engine, draft_invoice) -> Invoice:
    return invoice_engine.issue(draft_invoice.invoice_id)


# ─── Payload Fixtures (for Rust PyO3 bridge tests) ───────────────────────────

@pytest.fixture
def valid_eventops_payload() -> str:
    return json.dumps({
        "event_id": "evt-00000000-0000-7000-8000-000000000001",
        "technician": {
            "uuid": "00000000-0000-7000-8000-000000000001",
            "role": "Technician",
            "alias": "tech_alpha",
        },
        "timestamp_utc": "2025-01-15T09:00:00Z",
        "geo_latitude": 40.7128,
        "geo_longitude": -74.0060,
        "status": "Arrival",
        "reference_pointer_event_id": None,
    })


@pytest.fixture
def valid_ceremony_payload() -> str:
    return json.dumps({
        "ceremony_id": "ceremony-001",
        "project_id": "proj-001",
        "technician_id": "tech-uuid-xyz",
        "ceremony_type": "Standup",
        "start_time": "2025-01-15T09:00:00Z",
        "end_time": "2025-01-15T09:30:00Z",
        "duration_seconds": 1800,
        "is_billable": True,
        "reference_ceremony_id": None,
    })


@pytest.fixture
def sample_domain_batch() -> str:
    domains = [
        {"domain": "entity-identity", "id": 1},
        {"domain": "rate-engine", "id": 2},
        {"domain": "ceremony-logger", "id": 3},
        {"domain": "job-manifest", "id": 4},
        {"domain": "cost-ledger", "id": 5},
        {"domain": "project-context", "id": 6},
        {"domain": "tax-currency", "id": 7},
        {"domain": "calculation-engine", "id": 8},
        {"domain": "eventops", "id": 9},
        {"domain": "invoice-engine", "id": 10},
    ]
    return json.dumps(domains)


# ─── Billing Domain Smoke Marker ─────────────────────────────────────────────

def pytest_collection_modifyitems(items):
    for item in items:
        if "conftest_billing" in str(item.fspath):
            item.add_marker(pytest.mark.billing)
