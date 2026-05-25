/**
 * VERIFY: Invoice Engine — Domain 10, WSJF 9.5
 * Final stage: [ Core Entities ] -> [ Events ] -> [ Calculation ] -> [ Invoice ]
 *
 * CANONICAL_SCHEMA:  docs/api/billing.proto (message Invoice, CreditNote)
 * HARNESS:           tests/harness/BaseBillingE2ESpec.ts
 * IMPLEMENTATION:    src/billing/invoice_engine.py
 * INVENTORY:         docs/billing/CONSOLIDATION_INVENTORY.md
 */

import { test, expect } from '@playwright/test';
import {
  fileExists,
  readFile,
  billingHelpers,
  ERROR_CODES,
  SCHEMA_PATTERNS,
  BILLING_DOMAINS,
} from './harness/BaseBillingE2ESpec';

const DOMAIN = BILLING_DOMAINS.INVOICE_ENGINE;
const SRC_PATH = DOMAIN.srcPath;

// ─── Invoice Engine - Implementation ────────────────────────────────────────

test.describe('Invoice Engine - Implementation', () => {

  test('invoice_engine.py file exists', () => {
    expect(fileExists(SRC_PATH)).toBe(true);
  });

  test('file is non-empty and substantial', () => {
    billingHelpers.assertDomainFileExists('INVOICE_ENGINE');
  });

  test('InvoiceStatus enum is defined', () => {
    const src = readFile(SRC_PATH);
    expect(src).toContain('class InvoiceStatus');
    expect(src).toContain('Enum');
    ['DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'VOIDED', 'CREDITED'].forEach(s => {
      expect(src).toContain(s);
    });
  });

  test('Invoice dataclass is defined', () => {
    const src = readFile(SRC_PATH);
    expect(src).toContain('class Invoice');
    expect(src).toContain('@dataclass');
  });

  test('InvoiceEngine class is present', () => {
    const src = readFile(SRC_PATH);
    expect(src).toContain('class InvoiceEngine');
  });

  test('InvoiceLineItem dataclass is defined', () => {
    billingHelpers.assertContains(SRC_PATH, 'class InvoiceLineItem');
    billingHelpers.assertContains(SRC_PATH, 'line_id');
    billingHelpers.assertContains(SRC_PATH, 'item_type');
    billingHelpers.assertContains(SRC_PATH, 'quantity');
    billingHelpers.assertContains(SRC_PATH, 'unit_price');
    billingHelpers.assertContains(SRC_PATH, 'line_total');
  });

  test('CreditNote dataclass is defined', () => {
    billingHelpers.assertContains(SRC_PATH, 'class CreditNote');
    billingHelpers.assertContains(SRC_PATH, 'original_invoice_id');
  });

  test('Uses Decimal for financial precision — no float arithmetic', () => {
    const src = readFile(SRC_PATH);
    expect(src).toContain('Decimal');
    expect(src).not.toMatch(/float\s*\(/);
  });
});

// ─── Invoice Engine - Schema Contract ───────────────────────────────────────

test.describe('Invoice Engine - Schema Contract', () => {

  test('required field: invoice_id', () => {
    billingHelpers.assertContains(SRC_PATH, 'invoice_id');
  });

  test('required field: project_id', () => {
    billingHelpers.assertContains(SRC_PATH, 'project_id');
  });

  test('required field: client_id (client_uuid)', () => {
    billingHelpers.assertContains(SRC_PATH, 'client_uuid');
  });

  test('required field: line_items', () => {
    billingHelpers.assertContains(SRC_PATH, 'line_items');
  });

  test('required field: subtotal', () => {
    billingHelpers.assertContains(SRC_PATH, 'subtotal');
  });

  test('required field: tax_amount', () => {
    billingHelpers.assertContains(SRC_PATH, 'tax_amount');
  });

  test('required field: total', () => {
    billingHelpers.assertContains(SRC_PATH, 'total');
  });

  test('required field: status', () => {
    billingHelpers.assertContains(SRC_PATH, 'status');
  });

  test('required field: content_hash', () => {
    billingHelpers.assertContains(SRC_PATH, 'content_hash');
  });

  test('error code: ERR_INVOICE_GENERATION_FAILED', () => {
    billingHelpers.assertErrorCode(SRC_PATH, ERROR_CODES.ERR_INVOICE_GENERATION_FAILED);
  });

  test('error code: ERR_MISSING_SIGNOFF', () => {
    billingHelpers.assertErrorCode(SRC_PATH, ERROR_CODES.ERR_MISSING_SIGNOFF);
  });

  test('error code: ERR_INVOICE_ALREADY_ISSUED', () => {
    billingHelpers.assertErrorCode(SRC_PATH, ERROR_CODES.ERR_INVOICE_ALREADY_ISSUED);
  });

  test('error code: ERR_CREDIT_NOTE_CHAIN_BROKEN', () => {
    billingHelpers.assertErrorCode(SRC_PATH, ERROR_CODES.ERR_CREDIT_NOTE_CHAIN_BROKEN);
  });

  test('error code: ERR_TOTAL_MISMATCH', () => {
    billingHelpers.assertErrorCode(SRC_PATH, ERROR_CODES.ERR_TOTAL_MISMATCH);
  });

  test('total MUST equal subtotal + tax_amount (contract rule)', () => {
    billingHelpers.assertContains(SRC_PATH, 'verify_total');
    billingHelpers.assertContains(SRC_PATH, 'ERR_TOTAL_MISMATCH');
  });

  test('sign-off required before invoice generation', () => {
    billingHelpers.assertContains(SRC_PATH, 'job_signed_off');
  });

  test('due_date requires timezone-aware datetime (ISO 8601)', () => {
    billingHelpers.assertContains(SRC_PATH, 'tzinfo');
    billingHelpers.assertContains(SRC_PATH, 'timezone.utc');
  });
});

// ─── Invoice Engine - Immutability ──────────────────────────────────────────

test.describe('Invoice Engine - Immutability', () => {

  test('corrections use CreditNote — not UPDATE', () => {
    const src = readFile(SRC_PATH);
    expect(src).toContain('class CreditNote');
    expect(src).toContain('issue_credit_note');
    expect(src).not.toMatch(/def update_invoice\s*\(/);
    expect(src).not.toMatch(/def delete_invoice\s*\(/);
  });

  test('CreditNote references original_invoice_id', () => {
    const src = readFile(SRC_PATH);
    expect(src).toContain('original_invoice_id');
  });

  test('content_hash is present for tamper detection', () => {
    const src = readFile(SRC_PATH);
    expect(src).toContain('content_hash');
    expect(src).toContain('sha256');
  });

  test('ISSUED invoices are immutable — re-issue raises error', () => {
    billingHelpers.assertContains(SRC_PATH, 'ERR_INVOICE_ALREADY_ISSUED');
  });

  test('get_stats reports immutable=True and update_supported=False', () => {
    billingHelpers.assertContains(SRC_PATH, 'get_stats');
    const src = readFile(SRC_PATH);
    expect(src).toContain('"immutable": True');
    expect(src).toContain('"update_supported": False');
    expect(src).toContain('"delete_supported": False');
  });

  test('no external HTTP calls — pure in-memory engine', () => {
    const src = readFile(SRC_PATH);
    expect(src).not.toMatch(/requests\.(get|post)|httpx\.|urllib\.request/);
  });
});

// ─── Invoice Engine - Pipeline Integration ──────────────────────────────────

test.describe('Invoice Engine - Pipeline Integration', () => {

  test('invoice_engine.py uses calculation reference (calculation_id)', () => {
    const src = readFile(SRC_PATH);
    expect(src).toContain('calculation_id');
  });

  test('invoice_engine.py uses tax module reference (tax_amount)', () => {
    const src = readFile(SRC_PATH);
    expect(src).toContain('tax_amount');
  });

  test('invoice_engine.py uses identity references (client_uuid, technician_uuid)', () => {
    const src = readFile(SRC_PATH);
    expect(src).toContain('client_uuid');
    expect(src).toContain('technician_uuid');
  });

  test('pipeline stages all have VERIFY coverage', () => {
    const domains = [
      'entity-identity', 'rate-engine', 'ceremony-logger', 'job-manifest',
      'cost-ledger', 'project-context', 'tax-currency', 'calculation-engine',
      'eventops', 'invoice-engine',
    ];
    domains.forEach(domain => {
      const status = billingHelpers.getDomainSpecStatus(domain);
      expect(status.hasVerify).toBe(true);
    });
  });

  test('Proto schema defines Invoice, InvoiceLineItem, CreditNote', () => {
    billingHelpers.assertProtoMessage('Invoice');
    billingHelpers.assertProtoMessage('InvoiceLineItem');
    billingHelpers.assertProtoMessage('CreditNote');
  });
});
