#!/usr/bin/env python3
"""
Unit tests for src/billing/invoice_engine.py

Domain 10, WSJF 9.5 — Invoice Engine
Structural model: tests/unit/test_convergence_calculator.py
"""

import sys
from pathlib import Path

# Add project root to path for local imports
ROOT_DIR = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT_DIR))

import hashlib
from datetime import datetime, timezone, timedelta
from decimal import Decimal

import pytest

# ─── Safe imports with skip guards ──────────────────────────────────────────

try:
    from src.billing.invoice_engine import (
        InvoiceEngine,
        Invoice,
        InvoiceLineItem,
        InvoiceStatus,
        LineItemType,
        Money,
        CreditNote,
    )
    _HAS_ENGINE = True
except ImportError:
    _HAS_ENGINE = False

pytestmark = pytest.mark.skipif(
    not _HAS_ENGINE, reason="InvoiceEngine not importable"
)


# ─── Helpers ────────────────────────────────────────────────────────────────

def _make_line_items(count: int = 1, unit_price: str = "100.00") -> list:
    """Build a list of InvoiceLineItem fixtures."""
    return [
        InvoiceLineItem(
            line_id=f"LI-{i}",
            item_type=LineItemType.LABOR,
            description=f"Labor line item {i}",
            quantity=Decimal("2"),
            unit_price=Money(Decimal(unit_price)),
        )
        for i in range(count)
    ]


def _future_due_date() -> datetime:
    """Return a timezone-aware due date 30 days from now."""
    return datetime.now(timezone.utc) + timedelta(days=30)


def _generate_invoice(engine: InvoiceEngine, **overrides) -> Invoice:
    """Generate a standard invoice with sane defaults; overrides merged."""
    defaults = dict(
        project_id="PROJ-001",
        client_uuid="CLIENT-AAA",
        technician_uuid="TECH-BBB",
        line_items=_make_line_items(2, "150.00"),
        tax_amount=Money(Decimal("45.00")),
        due_date=_future_due_date(),
        calculation_id="CALC-001",
        job_id="JOB-001",
        job_signed_off=True,
    )
    defaults.update(overrides)
    return engine.generate(**defaults)


# ─── TestInvoiceEngineInstantiation ─────────────────────────────────────────

class TestInvoiceEngineInstantiation:
    """Can import and instantiate InvoiceEngine."""

    def test_import_invoice_engine(self):
        """InvoiceEngine is importable from src.billing.invoice_engine."""
        assert InvoiceEngine is not None

    def test_instantiate_engine(self):
        """InvoiceEngine() can be instantiated with no arguments."""
        engine = InvoiceEngine()
        assert engine is not None

    def test_engine_has_generate_method(self):
        """InvoiceEngine exposes a generate() method."""
        engine = InvoiceEngine()
        assert hasattr(engine, "generate")
        assert callable(engine.generate)

    def test_engine_has_issue_method(self):
        """InvoiceEngine exposes an issue() method."""
        engine = InvoiceEngine()
        assert hasattr(engine, "issue")
        assert callable(engine.issue)


# ─── TestInvoiceGeneration ──────────────────────────────────────────────────

class TestInvoiceGeneration:
    """generate_invoice with valid inputs returns Invoice with correct total."""

    def test_generate_returns_invoice(self):
        """generate() returns an Invoice instance."""
        engine = InvoiceEngine()
        invoice = _generate_invoice(engine)
        assert isinstance(invoice, Invoice)

    def test_generated_invoice_has_id(self):
        """Generated invoice has a non-empty invoice_id."""
        engine = InvoiceEngine()
        invoice = _generate_invoice(engine)
        assert invoice.invoice_id
        assert len(invoice.invoice_id) > 0

    def test_generated_invoice_is_draft(self):
        """New invoices start in DRAFT status."""
        engine = InvoiceEngine()
        invoice = _generate_invoice(engine)
        assert invoice.status == InvoiceStatus.DRAFT

    def test_total_equals_subtotal_plus_tax(self):
        """total == subtotal + tax_amount for a valid invoice."""
        engine = InvoiceEngine()
        line_items = _make_line_items(2, "150.00")
        tax = Money(Decimal("45.00"))
        invoice = _generate_invoice(
            engine, line_items=line_items, tax_amount=tax
        )
        # subtotal = 2 items * qty 2 * 150.00 = 600.00
        expected_subtotal = Decimal("600.00")
        expected_total = expected_subtotal + Decimal("45.00")
        assert invoice.subtotal.amount == expected_subtotal
        assert invoice.total.amount == expected_total

    def test_verify_total_returns_true(self):
        """verify_total() succeeds on a correctly-generated invoice."""
        engine = InvoiceEngine()
        invoice = _generate_invoice(engine)
        assert invoice.verify_total() is True

    def test_missing_signoff_raises(self):
        """ERR_MISSING_SIGNOFF when job_signed_off is False."""
        engine = InvoiceEngine()
        with pytest.raises(ValueError, match="ERR_MISSING_SIGNOFF"):
            _generate_invoice(engine, job_signed_off=False)

    def test_empty_line_items_raises(self):
        """ERR_INVOICE_GENERATION_FAILED when line_items is empty."""
        engine = InvoiceEngine()
        with pytest.raises(ValueError, match="ERR_INVOICE_GENERATION_FAILED"):
            _generate_invoice(engine, line_items=[])

    def test_missing_project_id_raises(self):
        """ERR_INVOICE_GENERATION_FAILED when project_id is empty."""
        engine = InvoiceEngine()
        with pytest.raises(ValueError, match="ERR_INVOICE_GENERATION_FAILED"):
            _generate_invoice(engine, project_id="")


# ─── TestInvoiceImmutability ────────────────────────────────────────────────

class TestInvoiceImmutability:
    """Re-issuing an already-issued invoice raises or returns error."""

    def test_issue_transitions_to_issued(self):
        """issue() transitions DRAFT -> ISSUED."""
        engine = InvoiceEngine()
        invoice = _generate_invoice(engine)
        issued = engine.issue(invoice.invoice_id)
        assert issued.status == InvoiceStatus.ISSUED

    def test_reissue_raises_already_issued(self):
        """ERR_INVOICE_ALREADY_ISSUED when issuing an already-ISSUED invoice."""
        engine = InvoiceEngine()
        invoice = _generate_invoice(engine)
        engine.issue(invoice.invoice_id)
        with pytest.raises(ValueError, match="ERR_INVOICE_ALREADY_ISSUED"):
            engine.issue(invoice.invoice_id)

    def test_issued_at_set_on_issue(self):
        """issued_at timestamp is set when invoice is issued."""
        engine = InvoiceEngine()
        invoice = _generate_invoice(engine)
        assert invoice.issued_at is None
        issued = engine.issue(invoice.invoice_id)
        assert issued.issued_at is not None


# ─── TestCreditNoteChain ────────────────────────────────────────────────────

class TestCreditNoteChain:
    """Credit note references original invoice_id."""

    def test_credit_note_references_original(self):
        """CreditNote.original_invoice_id matches the original invoice."""
        engine = InvoiceEngine()
        invoice = _generate_invoice(engine)
        engine.issue(invoice.invoice_id)
        note = engine.issue_credit_note(
            original_invoice_id=invoice.invoice_id,
            reason="Correction: wrong rate applied",
            credit_amount=Money(Decimal("50.00")),
        )
        assert isinstance(note, CreditNote)
        assert note.original_invoice_id == invoice.invoice_id

    def test_credit_note_has_reason(self):
        """CreditNote carries the correction reason."""
        engine = InvoiceEngine()
        invoice = _generate_invoice(engine)
        engine.issue(invoice.invoice_id)
        note = engine.issue_credit_note(
            original_invoice_id=invoice.invoice_id,
            reason="Overcharge correction",
            credit_amount=Money(Decimal("25.00")),
        )
        assert note.reason == "Overcharge correction"

    def test_unknown_invoice_raises_chain_broken(self):
        """ERR_CREDIT_NOTE_CHAIN_BROKEN for unknown original_invoice_id."""
        engine = InvoiceEngine()
        with pytest.raises(ValueError, match="ERR_CREDIT_NOTE_CHAIN_BROKEN"):
            engine.issue_credit_note(
                original_invoice_id="NONEXISTENT-ID",
                reason="Ghost correction",
                credit_amount=Money(Decimal("10.00")),
            )

    def test_original_invoice_marked_credited(self):
        """Original invoice status transitions to CREDITED after credit note."""
        engine = InvoiceEngine()
        invoice = _generate_invoice(engine)
        engine.issue(invoice.invoice_id)
        engine.issue_credit_note(
            original_invoice_id=invoice.invoice_id,
            reason="Rate adjustment",
            credit_amount=Money(Decimal("30.00")),
        )
        updated = engine.get(invoice.invoice_id)
        assert updated.status == InvoiceStatus.CREDITED


# ─── TestTotalValidation ────────────────────────────────────────────────────

class TestTotalValidation:
    """total must equal subtotal + tax_amount (or ERR_TOTAL_MISMATCH)."""

    def test_verify_total_correct(self):
        """verify_total() returns True for a valid invoice."""
        engine = InvoiceEngine()
        invoice = _generate_invoice(engine)
        assert invoice.verify_total() is True

    def test_total_property_matches_components(self):
        """Invoice.total == Invoice.subtotal + Invoice.tax_amount."""
        engine = InvoiceEngine()
        invoice = _generate_invoice(engine)
        expected = invoice.subtotal.amount + invoice.tax_amount.amount
        assert invoice.total.amount == expected

    def test_err_total_mismatch_string_in_source(self):
        """ERR_TOTAL_MISMATCH is referenced in the source code."""
        import inspect
        src = inspect.getsource(InvoiceEngine)
        assert "ERR_TOTAL_MISMATCH" in src


# ─── TestContentHash ────────────────────────────────────────────────────────

class TestContentHash:
    """content_hash is deterministic SHA256 of canonical payload."""

    def test_content_hash_returns_string(self):
        """content_hash() returns a hex string."""
        engine = InvoiceEngine()
        invoice = _generate_invoice(engine)
        h = invoice.content_hash()
        assert isinstance(h, str)
        assert len(h) == 64  # SHA-256 hex digest

    def test_content_hash_is_sha256(self):
        """content_hash() matches a manually-computed SHA-256."""
        engine = InvoiceEngine()
        invoice = _generate_invoice(engine)
        payload = (
            f"{invoice.invoice_id}:{invoice.project_id}:"
            f"{invoice.client_uuid}:{invoice.subtotal.amount}"
            f":{invoice.tax_amount.amount}:{invoice.total.amount}"
        )
        expected = hashlib.sha256(payload.encode()).hexdigest()
        assert invoice.content_hash() == expected

    def test_content_hash_deterministic(self):
        """Same invoice produces the same hash on repeated calls."""
        engine = InvoiceEngine()
        invoice = _generate_invoice(engine)
        h1 = invoice.content_hash()
        h2 = invoice.content_hash()
        assert h1 == h2

    def test_different_invoices_different_hash(self):
        """Two distinct invoices produce different content hashes."""
        engine = InvoiceEngine()
        inv1 = _generate_invoice(engine, project_id="PROJ-A")
        inv2 = _generate_invoice(engine, project_id="PROJ-B")
        assert inv1.content_hash() != inv2.content_hash()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
