"""
HostBill Reconciliation Job - ROAM R4

Asynchronous batch reconciliation job to handle HostBill API drops or timeouts.
It cross-checks the internal Cost Ledger / Invoice Engine state against the
HostBill system to ensure all ISSUED invoices are actually recorded in HostBill.
"""

import sys
import os
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from src.billing.invoice_engine import InvoiceEngine, InvoiceStatus, Invoice

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("HostBillRecon")


class HostBillClientStub:
    """Stub representing the remote HostBill gateway/API."""
    def __init__(self):
        # Mocks remote state
        self.remote_invoices: Dict[str, dict] = {}

    def fetch_invoice_status(self, invoice_id: str) -> dict:
        """Fetch status of invoice from HostBill."""
        if invoice_id in self.remote_invoices:
            return {"status": "found", "data": self.remote_invoices[invoice_id]}
        return {"status": "not_found"}

    def emit_invoice(self, invoice_id: str, payload: dict) -> bool:
        """Simulate sending the invoice to HostBill."""
        logger.info(f"Emitting invoice {invoice_id} to HostBill...")
        self.remote_invoices[invoice_id] = payload
        return True


class HostBillReconciliationJob:
    def __init__(self, invoice_engine: InvoiceEngine, hostbill_client: HostBillClientStub):
        self.invoice_engine = invoice_engine
        self.hostbill_client = hostbill_client

    def run_reconciliation(self) -> dict:
        """
        Scan all ISSUED invoices in the local InvoiceEngine and check if they exist in HostBill.
        If missing, re-emit them.
        """
        logger.info("Starting HostBill Reconciliation Job...")
        
        # Get stats first
        stats = self.invoice_engine.get_stats()
        if stats["total_invoices"] == 0:
            logger.info("No invoices in engine. Skipping.")
            return {"status": "skipped", "reason": "no_invoices"}

        # In a real scenario, we would paginate. For now, we get all.
        # But InvoiceEngine doesn't expose list_all natively without project_id.
        # Accessing private member for internal reconciliation logic:
        all_invoices = list(self.invoice_engine._invoices.values())
        
        issued_invoices = [inv for inv in all_invoices if inv.status == InvoiceStatus.ISSUED]
        logger.info(f"Found {len(issued_invoices)} ISSUED invoices to verify.")

        missing_count = 0
        reconciled_count = 0

        for invoice in issued_invoices:
            res = self.hostbill_client.fetch_invoice_status(invoice.invoice_id)
            if res["status"] == "not_found":
                logger.warning(f"Invoice {invoice.invoice_id} missing in HostBill! Re-emitting.")
                missing_count += 1
                
                payload = {
                    "invoice_id": invoice.invoice_id,
                    "project_id": invoice.project_id,
                    "total": str(invoice.total),
                    "due_date": invoice.due_date.isoformat(),
                }
                
                success = self.hostbill_client.emit_invoice(invoice.invoice_id, payload)
                if success:
                    reconciled_count += 1
                else:
                    logger.error(f"Failed to re-emit invoice {invoice.invoice_id}.")
            else:
                logger.debug(f"Invoice {invoice.invoice_id} already exists in HostBill.")

        logger.info(f"Reconciliation complete. Missing: {missing_count}, Successfully Reconciled: {reconciled_count}")
        return {
            "status": "completed",
            "missing_count": missing_count,
            "reconciled_count": reconciled_count
        }

if __name__ == "__main__":
    engine = InvoiceEngine()
    # Mock some data for testing
    from src.billing.invoice_engine import InvoiceLineItem, LineItemType, Money
    
    engine.generate(
        project_id="PRJ-123",
        client_uuid="client-999",
        technician_uuid="tech-888",
        line_items=[
            InvoiceLineItem("line-1", LineItemType.LABOR, "Fix servers", Decimal("2.0"), Money.from_str("100.00"))
        ],
        tax_amount=Money.zero(),
        due_date=datetime.now(timezone.utc),
        calculation_id="calc-1",
        job_id="job-1",
        job_signed_off=True
    )
    
    # We grab the first generated invoice to issue it
    inv_id = list(engine._invoices.keys())[0]
    engine.issue(inv_id)

    client = HostBillClientStub()
    job = HostBillReconciliationJob(engine, client)
    job.run_reconciliation()
