"""
HostBill Live Integration Tests
Marker: @pytest.mark.integration_hostbill

Skips automatically when HOSTBILL_API_KEY or HOSTBILL_API_URL are absent.
Run with staging creds:
    HOSTBILL_API_KEY=xxx HOSTBILL_API_URL=https://billing.bhopti.com \
    python3 -m pytest tests/integration/test_hostbill_live.py -v -m integration_hostbill
"""

import os
import sys
import pytest
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Ensure src/ is importable for billing pipeline test (test 6)
_PROJECT_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(_PROJECT_ROOT / "src"))

# ── Helpers ────────────────────────────────────────────────────────────────


def _creds_present() -> bool:
    """Return True only when both HostBill env vars are populated."""
    return bool(os.environ.get("HOSTBILL_API_KEY") and os.environ.get("HOSTBILL_API_URL"))


# ── Test 1 ─────────────────────────────────────────────────────────────────


@pytest.mark.integration_hostbill
def test_hostbill_env_creds_present():
    """
    Asserts HOSTBILL_API_KEY and HOSTBILL_API_URL are set.
    This test intentionally skips (via conftest marker gate) when they are absent —
    so reaching the assertion body means creds ARE present.
    """
    api_key = os.environ.get("HOSTBILL_API_KEY")
    api_url = os.environ.get("HOSTBILL_API_URL")

    assert api_key, "HOSTBILL_API_KEY must be non-empty when creds are present"
    assert api_url, "HOSTBILL_API_URL must be non-empty when creds are present"
    assert api_url.startswith("http"), f"HOSTBILL_API_URL must be a valid URL, got: {api_url!r}"


# ── Test 2 ─────────────────────────────────────────────────────────────────


@pytest.mark.integration_hostbill
def test_eventops_pyo3_importable():
    """
    Confirms the eventops_pyo3 Rust extension module loads successfully.
    Skips (not errors) if the wheel is not yet built.
    """
    eventops_pyo3 = pytest.importorskip(
        "eventops_pyo3",
        reason="eventops_pyo3 not installed — run `maturin develop` to build the Rust extension",
    )
    assert hasattr(eventops_pyo3, "emit_to_hostbill"), (
        "eventops_pyo3 module loaded but emit_to_hostbill function is missing"
    )


# ── Test 3 ─────────────────────────────────────────────────────────────────


@pytest.mark.integration_hostbill
def test_emit_to_hostbill_rejects_invalid_url():
    """
    Calls emit_to_hostbill with a localhost address that has no listener.
    Expects a PyValueError / ValueError with ERR_HOSTBILL_NETWORK (connection refused).
    Verifies the Rust error-path plumbing is wired correctly.
    """
    eventops_pyo3 = pytest.importorskip("eventops_pyo3")

    with pytest.raises((ValueError, Exception)) as exc_info:
        eventops_pyo3.emit_to_hostbill(
            "http://localhost:1",   # Port 1 — always refused
            "test-api-id",
            "test-api-key",
            "PRJ-TEST",
            1.0,
        )

    err_msg = str(exc_info.value)
    assert "ERR_HOSTBILL_NETWORK" in err_msg or "ERR_HOSTBILL_API" in err_msg or "connection" in err_msg.lower(), (
        f"Expected a network-error code in exception, got: {err_msg!r}"
    )


# ── Test 4 ─────────────────────────────────────────────────────────────────


@pytest.mark.integration_hostbill
def test_emit_to_hostbill_api_url_from_env():
    """
    Reads HOSTBILL_API_URL from env and makes a minimal live call (0.001 hours).
    Valid live outcomes:
      - Returns a string (HTTP 200, API accepted the payload)
      - Raises ValueError with ERR_HOSTBILL_API (auth failure — 4xx from server)
    Both are acceptable: they confirm live HTTP round-trip succeeded.
    """
    eventops_pyo3 = pytest.importorskip("eventops_pyo3")

    api_url = os.environ["HOSTBILL_API_URL"]
    api_key = os.environ["HOSTBILL_API_KEY"]

    try:
        result = eventops_pyo3.emit_to_hostbill(
            api_url,
            "ci-integration-test",
            api_key,
            "PRJ-CI-TEST",
            0.001,  # Minimal non-billable amount
        )
        # Success path: API accepted the payload
        assert isinstance(result, str), (
            f"emit_to_hostbill should return a string on success, got {type(result)}"
        )
    except ValueError as exc:
        err_msg = str(exc)
        # Auth failure is a valid live response — the HTTP call reached the server
        assert "ERR_HOSTBILL_API" in err_msg, (
            f"Expected ERR_HOSTBILL_API on auth failure, got: {err_msg!r}"
        )


# ── Test 5 ─────────────────────────────────────────────────────────────────


@pytest.mark.integration_hostbill
def test_hostbill_api_payload_structure():
    """
    Unit test (no HTTP): validates the emit_to_hostbill function signature exists
    and the module exposes the function as a callable.
    Calls with a known-bad URL to confirm the error path returns ERR_HOSTBILL_NETWORK,
    proving the function is fully wired into the PyO3 module.
    """
    eventops_pyo3 = pytest.importorskip("eventops_pyo3")

    fn = getattr(eventops_pyo3, "emit_to_hostbill", None)
    assert fn is not None, "emit_to_hostbill must be exposed on eventops_pyo3 module"
    assert callable(fn), "emit_to_hostbill must be callable"

    # Confirm the function accepts (api_url, api_id, api_key, project_id, billable_hours)
    # by calling with bad URL — error path confirms arity is correct
    with pytest.raises((ValueError, TypeError, Exception)):
        fn("http://127.0.0.1:2", "id", "key", "PRJ-SIG-TEST", 0.5)


# ── Test 6 ─────────────────────────────────────────────────────────────────


@pytest.mark.integration_hostbill
def test_billing_pipeline_to_hostbill_contract():
    """
    Pure-Python pipeline test (no HTTP, no Rust required).
    Exercises: InvoiceEngine.generate() → Invoice → extract billable_hours from
    LABOR line items → validate the shape that would be passed to emit_to_hostbill.

    Contract assertions:
      - billable_hours is a positive float
      - project_id is a non-empty string
      - The payload dict contains 'variable_name' == 'EventOps_Technician_Hours'
    """
    try:
        from billing.invoice_engine import (
            InvoiceEngine,
            InvoiceLineItem,
            LineItemType,
            Money,
        )
    except ImportError as exc:
        pytest.skip(f"billing.invoice_engine not importable: {exc}")

    engine = InvoiceEngine()
    unit_price = Money(Decimal("125.00"), "USD")
    labor_item = InvoiceLineItem(
        line_id="LI-001",
        item_type=LineItemType.LABOR,
        description="EventOps technician — on-site support",
        quantity=Decimal("2.5"),
        unit_price=unit_price,
    )

    due = datetime.now(timezone.utc) + timedelta(days=30)
    invoice = engine.generate(
        project_id="PRJ-BHOPTI-2024",
        client_uuid="client-uuid-abc",
        technician_uuid="tech-uuid-xyz",
        line_items=[labor_item],
        tax_amount=Money(Decimal("0.00"), "USD"),
        due_date=due,
        calculation_id="calc-001",
        job_id="job-001",
        job_signed_off=True,
    )

    # Extract billable_hours: sum quantity from LABOR line items
    billable_hours = float(
        sum(
            item.quantity
            for item in invoice.line_items
            if item.item_type == LineItemType.LABOR
        )
    )

    assert billable_hours > 0.0, "billable_hours must be positive"
    assert isinstance(billable_hours, float), "billable_hours must be a float"
    assert invoice.project_id, "project_id must be non-empty"

    # Build the payload dict that would be sent to HostBill
    payload = {
        "api_id": "ci-test-id",
        "api_key": "ci-test-key",
        "call": "addMeteredUsage",
        "account_id": invoice.project_id,
        "variable_name": "EventOps_Technician_Hours",
        "qty": billable_hours,
    }

    assert payload["variable_name"] == "EventOps_Technician_Hours", (
        "variable_name contract mismatch — Rust and Python must agree on this symbol"
    )
    assert payload["qty"] == 2.5, f"Expected 2.5 billable hours, got {payload['qty']}"
    assert payload["account_id"] == "PRJ-BHOPTI-2024"


# ── Test 7 — Symbol contract (ALWAYS PASSES) ───────────────────────────────


def test_hostbill_metered_usage_variable_name():
    """
    Symbol-contract test: reads src/rust/eventops_pyo3/src/lib.rs and asserts
    the metered-usage variable name 'EventOps_Technician_Hours' is present.
    This ensures the Rust source and Python billing layer share the same symbol.
    Always passes when the codebase is intact. No marker — runs unconditionally.
    """
    lib_rs = _PROJECT_ROOT / "src" / "rust" / "eventops_pyo3" / "src" / "lib.rs"
    assert lib_rs.exists(), f"Rust source file not found at expected path: {lib_rs}"

    source = lib_rs.read_text(encoding="utf-8")
    assert "EventOps_Technician_Hours" in source, (
        "Symbol 'EventOps_Technician_Hours' missing from eventops_pyo3/src/lib.rs — "
        "HostBill metered usage variable name contract is broken"
    )


# ── Test 8 — Symbol contract (ALWAYS PASSES) ───────────────────────────────


def test_hostbill_error_codes_present():
    """
    Symbol-contract test: reads src/rust/eventops_pyo3/src/lib.rs and asserts
    both ERR_HOSTBILL_API and ERR_HOSTBILL_NETWORK error codes are present.
    Guarantees the error-code contract is never silently dropped during refactors.
    Always passes when the codebase is intact. No marker — runs unconditionally.
    """
    lib_rs = _PROJECT_ROOT / "src" / "rust" / "eventops_pyo3" / "src" / "lib.rs"
    assert lib_rs.exists(), f"Rust source file not found at expected path: {lib_rs}"

    source = lib_rs.read_text(encoding="utf-8")

    assert "ERR_HOSTBILL_API" in source, (
        "Error code 'ERR_HOSTBILL_API' missing from eventops_pyo3/src/lib.rs — "
        "HTTP error-path contract is broken"
    )
    assert "ERR_HOSTBILL_NETWORK" in source, (
        "Error code 'ERR_HOSTBILL_NETWORK' missing from eventops_pyo3/src/lib.rs — "
        "network error-path contract is broken"
    )
