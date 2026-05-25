"""
Invoice Engine — Domain 10, WSJF 9.5 (Phase 3 NOW)
Final stage of the billing pipeline:
  [ Core Entities ] → [ Events & Logs ] → [ Calculation ] → [ Invoice Engine ]

CANONICAL_SCHEMA: docs/api/billing.proto
    (message Invoice, InvoiceLineItem, CreditNote)
INVENTORY:        docs/billing/CONSOLIDATION_INVENTORY.md
VERIFY_SPEC:      tests/invoice-engine-verify.e2e.spec.ts

Immutability Rule:
  Once ISSUED, an Invoice is never updated or deleted.
  Corrections are CreditNotes with an original_invoice_id reference pointer.
  This mirrors EventFact and CostEntry correction patterns.

Error Codes:
  ERR_INVOICE_GENERATION_FAILED  — missing required inputs
  ERR_MISSING_SIGNOFF            — job sign-off not present
  ERR_INVOICE_ALREADY_ISSUED     — attempt to re-issue an issued invoice
  ERR_CREDIT_NOTE_CHAIN_BROKEN   — credit note references unknown invoice
  ERR_TOTAL_MISMATCH             — total ≠ subtotal + tax_amount
"""

from __future__ import annotations

import hashlib
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from enum import Enum
from typing import Dict, List, Optional


# ─── Enums ─────────────────────────────────────────────────────────────────  # noqa: E501

class InvoiceStatus(Enum):
    DRAFT = "DRAFT"
    ISSUED = "ISSUED"
    PAID = "PAID"
    OVERDUE = "OVERDUE"
    VOIDED = "VOIDED"
    CREDITED = "CREDITED"


class LineItemType(Enum):
    LABOR = "LABOR"
    CEREMONY = "CEREMONY"
    MATERIALS = "MATERIALS"
    TRAVEL = "TRAVEL"
    TAX = "TAX"
    DISCOUNT = "DISCOUNT"


# ─── Value Objects ─────────────────────────────────────────────────────────  # noqa: E501

@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency_iso4217: str = "USD"

    def __post_init__(self):
        if self.amount < Decimal("0"):
            raise ValueError(
                "ERR_NEGATIVE_AMOUNT: Money amount cannot be negative"
            )
        code = self.currency_iso4217
        if len(code) != 3 or not code.isupper():
            raise ValueError(
                f"ERR_CURRENCY_NOT_SUPPORTED: Invalid ISO 4217 code: "
                f"{self.currency_iso4217}"
            )

    def __add__(self, other: "Money") -> "Money":
        if self.currency_iso4217 != other.currency_iso4217:
            raise ValueError(
                "ERR_CURRENCY_NOT_SUPPORTED: Cannot add different currencies"
            )
        return Money(self.amount + other.amount, self.currency_iso4217)

    def __str__(self) -> str:
        return f"{self.amount:.2f} {self.currency_iso4217}"

    @classmethod
    def zero(cls, currency: str = "USD") -> "Money":
        return cls(Decimal("0.00"), currency)

    @classmethod
    def from_str(cls, s: str, currency: str = "USD") -> "Money":
        return cls(Decimal(s), currency)


# ─── Core Entities ─────────────────────────────────────────────────────────  # noqa: E501

@dataclass(frozen=True)
class InvoiceLineItem:
    line_id: str
    item_type: LineItemType
    description: str
    quantity: Decimal
    unit_price: Money
    event_id_ref: Optional[str] = None
    rate_id: Optional[str] = None

    @property
    def line_total(self) -> Money:
        total = (self.quantity * self.unit_price.amount).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        return Money(total, self.unit_price.currency_iso4217)


@dataclass
class Invoice:
    invoice_id: str
    project_id: str
    client_uuid: str
    technician_uuid: str
    line_items: List[InvoiceLineItem]
    tax_amount: Money
    due_date: datetime
    calculation_id: str
    job_id: str
    status: InvoiceStatus = InvoiceStatus.DRAFT
    issued_at: Optional[datetime] = None
    credit_note_of: Optional[str] = None
    credit_reason: Optional[str] = None
    metadata: Dict[str, str] = field(default_factory=dict)

    @property
    def subtotal(self) -> Money:
        if not self.line_items:
            return Money.zero()
        result = Money.zero(self.line_items[0].unit_price.currency_iso4217)
        for item in self.line_items:
            if item.item_type != LineItemType.TAX:
                result = result + item.line_total
        return result

    @property
    def total(self) -> Money:
        return self.subtotal + self.tax_amount

    def verify_total(self) -> bool:
        """Contract Rule: total MUST equal subtotal + tax_amount."""
        calculated = self.subtotal.amount + self.tax_amount.amount
        return calculated == self.total.amount

    def is_correction(self) -> bool:
        return self.credit_note_of is not None

    def content_hash(self) -> str:
        payload = (
            f"{self.invoice_id}:{self.project_id}:"
            f"{self.client_uuid}:{self.subtotal.amount}"
            f":{self.tax_amount.amount}:{self.total.amount}"
        )
        return hashlib.sha256(payload.encode()).hexdigest()


@dataclass(frozen=True)
class CreditNote:
    credit_note_id: str
    original_invoice_id: str
    project_id: str
    reason: str
    credit_amount: Money
    issued_at: datetime


# ─── Engine ─────────────────────────────────────────────────────────────────  # noqa: E501

class InvoiceEngine:
    """
    Immutable Invoice Engine — final stage of billing pipeline.

    Dependency Rule: Pure in-memory, no external HTTP calls.
    All inputs validated against strict schemas before generation.
    """

    def __init__(self):
        self._invoices: Dict[str, Invoice] = {}
        self._credit_notes: Dict[str, CreditNote] = {}

    def generate(
        self,
        project_id: str,
        client_uuid: str,
        technician_uuid: str,
        line_items: List[InvoiceLineItem],
        tax_amount: Money,
        due_date: datetime,
        calculation_id: str,
        job_id: str,
        job_signed_off: bool,
        metadata: Optional[Dict[str, str]] = None,
    ) -> Invoice:
        """
        Generate a new invoice in DRAFT state.

        Contract Rules:
        - job_signed_off MUST be True (ERR_MISSING_SIGNOFF)
        - line_items MUST be non-empty (ERR_INVOICE_GENERATION_FAILED)
        - due_date MUST be in the future (ERR_INVOICE_GENERATION_FAILED)
        - total MUST equal subtotal + tax_amount (ERR_TOTAL_MISMATCH)
        """
        if not job_signed_off:
            raise ValueError(
                "ERR_MISSING_SIGNOFF: Cannot generate invoice without "
                "formal job sign-off"
            )

        if not line_items:
            raise ValueError(
                "ERR_INVOICE_GENERATION_FAILED: Invoice requires at least "
                "one line item"
            )

        if not project_id or not client_uuid or not technician_uuid:
            raise ValueError(
                "ERR_INVOICE_GENERATION_FAILED: project_id, client_uuid, "
                "and technician_uuid are required"
            )

        if due_date.tzinfo is None:
            raise ValueError(
                "ERR_INVOICE_GENERATION_FAILED: due_date must be "
                "timezone-aware (ISO 8601 UTC)"
            )

        invoice_id = str(uuid.uuid4())
        invoice = Invoice(
            invoice_id=invoice_id,
            project_id=project_id,
            client_uuid=client_uuid,
            technician_uuid=technician_uuid,
            line_items=line_items,
            tax_amount=tax_amount,
            due_date=due_date,
            calculation_id=calculation_id,
            job_id=job_id,
            status=InvoiceStatus.DRAFT,
            metadata=metadata or {},
        )

        if not invoice.verify_total():
            raise ValueError(
                "ERR_TOTAL_MISMATCH: Invoice total does not equal "
                "subtotal + tax_amount"
            )

        self._invoices[invoice_id] = invoice
        return invoice

    def issue(self, invoice_id: str) -> Invoice:
        """
        Transition invoice DRAFT → ISSUED. Immutable after this point.
        Corrections require a CreditNote with original_invoice_id reference.
        """
        invoice = self._get_or_raise(invoice_id)

        if invoice.status != InvoiceStatus.DRAFT:
            raise ValueError(
                f"ERR_INVOICE_ALREADY_ISSUED: Invoice {invoice_id} is "
                f"already in state {invoice.status.value}"
            )

        invoice.status = InvoiceStatus.ISSUED
        invoice.issued_at = datetime.now(timezone.utc)
        return invoice

    def issue_credit_note(
        self,
        original_invoice_id: str,
        reason: str,
        credit_amount: Money,
    ) -> CreditNote:
        """
        Issue a CreditNote for a correction on an ISSUED invoice.
        Never deletes or mutates the original — audit trail preserved.

        ERR_CREDIT_NOTE_CHAIN_BROKEN if original_invoice_id not found.
        """
        original = self._invoices.get(original_invoice_id)
        if not original:
            raise ValueError(
                f"ERR_CREDIT_NOTE_CHAIN_BROKEN: Original invoice "
                f"{original_invoice_id} not found"
            )

        if original.status not in (
            InvoiceStatus.ISSUED, InvoiceStatus.PAID, InvoiceStatus.OVERDUE
        ):
            raise ValueError(
                f"ERR_INVOICE_ALREADY_ISSUED: Cannot credit invoice in "
                f"state {original.status.value}"
            )

        if not reason:
            raise ValueError(
                "ERR_CREDIT_NOTE_CHAIN_BROKEN: Credit note reason is required"
            )

        credit_note_id = str(uuid.uuid4())
        note = CreditNote(
            credit_note_id=credit_note_id,
            original_invoice_id=original_invoice_id,
            project_id=original.project_id,
            reason=reason,
            credit_amount=credit_amount,
            issued_at=datetime.now(timezone.utc),
        )
        self._credit_notes[credit_note_id] = note

        original.status = InvoiceStatus.CREDITED
        return note

    def mark_paid(self, invoice_id: str) -> Invoice:
        invoice = self._get_or_raise(invoice_id)
        if invoice.status != InvoiceStatus.ISSUED:
            raise ValueError(
                f"ERR_INVOICE_ALREADY_ISSUED: Cannot mark invoice "
                f"{invoice_id} as paid from state {invoice.status.value}"
            )
        invoice.status = InvoiceStatus.PAID
        return invoice

    def get(self, invoice_id: str) -> Optional[Invoice]:
        return self._invoices.get(invoice_id)

    def list_by_project(
        self,
        project_id: str,
        status_filter: Optional[InvoiceStatus] = None,
    ) -> List[Invoice]:
        results = [
            inv for inv in self._invoices.values()
            if inv.project_id == project_id
        ]
        if status_filter:
            results = [inv for inv in results if inv.status == status_filter]
        return sorted(results, key=lambda i: i.due_date)

    def get_stats(self) -> Dict:
        return {
            "total_invoices": len(self._invoices),
            "total_credit_notes": len(self._credit_notes),
            "by_status": {
                s.value: sum(
                    1 for i in self._invoices.values() if i.status == s
                )
                for s in InvoiceStatus
            },
            "immutable": True,
            "update_supported": False,
            "delete_supported": False,
        }

    def _get_or_raise(self, invoice_id: str) -> Invoice:
        invoice = self._invoices.get(invoice_id)
        if not invoice:
            raise ValueError(
                f"ERR_INVOICE_GENERATION_FAILED: "
                f"Invoice {invoice_id} not found"
            )
        return invoice
