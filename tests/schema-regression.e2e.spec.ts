/**
 * SCHEMA REGRESSION SUITE — Phase 4 NEAR-1
 *
 * Validates that billing.proto, Rust structs, and Python DOMAIN_SCHEMAS
 * remain aligned across all 10 billing domains. Run before any merge.
 *
 * CANONICAL_SCHEMA: docs/api/billing.proto (proto_version: 1.1.0)
 * HARNESS:          tests/harness/BaseBillingE2ESpec.ts
 * INVENTORY:        docs/billing/CONSOLIDATION_INVENTORY.md
 *
 * Anti-CVT: This spec is a pre-condition gate for billing-platform-integration.
 * FAIL here = schema drift = block deployment.
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  billingHelpers,
  BILLING_DOMAINS,
  ERROR_CODES,
} from './harness/BaseBillingE2ESpec';

const ROOT = join(__dirname, '..');
const PROTO_PATH = join(ROOT, 'docs/api/billing.proto');
const RUST_LIB = join(ROOT, 'src/rust/eventops_pyo3/src/lib.rs');
const PYTHON_SCHEMA = join(ROOT, 'src/validation/schema_engine.py');

function readProto(): string {
  return readFileSync(PROTO_PATH, 'utf-8');
}

function readRust(): string {
  return readFileSync(RUST_LIB, 'utf-8');
}

function readPython(): string {
  if (!existsSync(PYTHON_SCHEMA)) return '';
  return readFileSync(PYTHON_SCHEMA, 'utf-8');
}

// ─── Proto Version Gate ──────────────────────────────────────────────────────

test.describe('Schema Regression — Proto Version Gate', () => {

  test('billing.proto contains version comment', () => {
    const proto = readProto();
    expect(proto).toMatch(/proto_version:\s*\d+\.\d+\.\d+/);
  });

  test('billing.proto syntax is proto3', () => {
    const proto = readProto();
    expect(proto).toContain('syntax = "proto3"');
  });

  test('billing.proto package is billing.v1', () => {
    const proto = readProto();
    expect(proto).toContain('package billing.v1');
  });
});

// ─── 10 Domain Message Presence ──────────────────────────────────────────────

test.describe('Schema Regression — All 10 Domain Messages Present', () => {

  const protoMessages = [
    { domain: 'entity-identity', message: 'message EntityIdentity' },
    { domain: 'rate-engine',     message: 'message Rate' },
    { domain: 'project-context', message: 'message ProjectContext' },
    { domain: 'eventops',        message: 'message EventFact' },
    { domain: 'ceremony-logger', message: 'message CeremonyLogFact' },
    { domain: 'job-manifest',    message: 'message JobManifest' },
    { domain: 'calculation-engine', message: 'message CalculationResult' },
    { domain: 'cost-ledger',     message: 'message CostEntry' },
    { domain: 'tax-currency',    message: 'message TaxCalculation' },
    { domain: 'invoice-engine',  message: 'message Invoice' },
  ];

  for (const { domain, message } of protoMessages) {
    test(`proto contains message for domain: ${domain}`, () => {
      const proto = readProto();
      expect(
        proto,
        `billing.proto missing '${message}' — domain ${domain} schema drift`
      ).toContain(message);
    });
  }
});

// ─── Rust Struct Alignment ───────────────────────────────────────────────────

test.describe('Schema Regression — Rust Structs Align with Proto', () => {

  test('Rust lib defines EntityIdentity struct', () => {
    expect(readRust()).toContain('struct EntityIdentity');
  });

  test('Rust lib defines EventOpsFact struct', () => {
    expect(readRust()).toContain('struct EventOpsFact');
  });

  test('Rust lib defines CeremonyLogFact struct', () => {
    expect(readRust()).toContain('struct CeremonyLogFact');
  });

  test('Rust lib defines ProjectContext struct', () => {
    expect(readRust()).toContain('struct ProjectContext');
  });

  test('Rust lib defines TaxConfig struct', () => {
    expect(readRust()).toContain('struct TaxConfig');
  });

  test('Rust uuid field names match proto (uuid not id)', () => {
    const rust = readRust();
    expect(rust).toMatch(/uuid:\s*Uuid/);
  });

  test('Rust uses Decimal not f64 for financial amounts', () => {
    const rust = readRust();
    expect(rust).toContain('Decimal');
    expect(rust).not.toMatch(/total_budget:\s*f64/);
  });

  test('All exported pymodule functions registered', () => {
    const rust = readRust();
    const fns = [
      'validate_eventops_schema',
      'validate_stripe_signature',
      'generate_uuid_v7',
      'calculate_rate',
      'calculate_billable_hours',
      'validate_project_constraints',
      'validate_ceremony_logger',
      'chunk_domain_payloads',
      'calculate_jurisdiction_tax',
      'load_tax_matrix',
    ];
    for (const fn of fns) {
      expect(
        rust,
        `Rust module missing exported function: ${fn}`
      ).toContain(fn);
    }
  });
});

// ─── Python Schema Alignment ─────────────────────────────────────────────────

test.describe('Schema Regression — Python DOMAIN_SCHEMAS Align with Proto', () => {

  test('schema_engine.py exists', () => {
    expect(
      existsSync(PYTHON_SCHEMA),
      'src/validation/schema_engine.py missing'
    ).toBe(true);
  });

  test('Python schema defines entity-identity domain', () => {
    expect(readPython()).toMatch(/entity.identity|EntityIdentity/i);
  });

  test('Python schema defines rate-engine domain', () => {
    expect(readPython()).toMatch(/rate.engine|RateEngine/i);
  });

  test('Python schema defines eventops domain', () => {
    expect(readPython()).toMatch(/eventops|EventOps/i);
  });

  test('Python schema uses ERR_ error codes (not raw strings)', () => {
    expect(readPython()).toMatch(/ERR_/);
  });
});

// ─── Invoice Engine Alignment ─────────────────────────────────────────────────

test.describe('Schema Regression — Invoice Engine Alignment', () => {

  test('invoice_engine.py exists', () => {
    billingHelpers.assertDomainFileExists('INVOICE_ENGINE');
  });

  test('Invoice proto fields match Python dataclass fields', () => {
    const proto = readProto();
    const py = readFileSync(
      join(ROOT, BILLING_DOMAINS.INVOICE_ENGINE.srcPath), 'utf-8'
    );
    const protoFields = [
      'invoice_id', 'project_id', 'client_uuid', 'technician_uuid',
      'line_items', 'subtotal', 'tax_amount', 'total',
    ];
    for (const field of protoFields) {
      expect(proto, `proto missing Invoice field: ${field}`).toContain(field);
      expect(py, `invoice_engine.py missing field: ${field}`).toContain(field);
    }
  });

  test('Invoice error codes consistent across proto, harness, and engine', () => {
    const py = readFileSync(
      join(ROOT, BILLING_DOMAINS.INVOICE_ENGINE.srcPath), 'utf-8'
    );
    const errorCodes = [
      ERROR_CODES.ERR_INVOICE_GENERATION_FAILED,
      ERROR_CODES.ERR_MISSING_SIGNOFF,
      ERROR_CODES.ERR_INVOICE_ALREADY_ISSUED,
      ERROR_CODES.ERR_CREDIT_NOTE_CHAIN_BROKEN,
    ];
    for (const code of errorCodes) {
      expect(
        py,
        `invoice_engine.py missing error code: ${code}`
      ).toContain(code);
    }
  });

  test('Immutability rule: no UPDATE/DELETE in invoice engine', () => {
    const py = readFileSync(
      join(ROOT, BILLING_DOMAINS.INVOICE_ENGINE.srcPath), 'utf-8'
    );
    expect(py).not.toMatch(/def update_invoice\s*\(/);
    expect(py).not.toMatch(/def delete_invoice\s*\(/);
    expect(py).toContain('"update_supported": False');
    expect(py).toContain('"delete_supported": False');
  });
});

// ─── Backward Compatibility Gate ─────────────────────────────────────────────

test.describe('Schema Regression — Backward Compatibility Gate', () => {

  test('Proto field numbers are stable (no renumbering)', () => {
    const proto = readProto();
    // Money.amount must always be field 1
    expect(proto).toMatch(/string amount\s*=\s*1/);
    // Money.currency must always be field 2
    expect(proto).toMatch(/string currency_iso4217\s*=\s*2/);
    // EntityIdentity.uuid must always be field 1
    expect(proto).toMatch(/string uuid\s*=\s*1/);
  });

  test('Proto package namespace unchanged (billing.v1)', () => {
    expect(readProto()).toContain('package billing.v1');
  });

  test('All 10 VERIFY specs exist (no spec deleted)', () => {
    const domains = Object.keys(BILLING_DOMAINS);
    const missing: string[] = [];
    for (const key of domains) {
      const name = BILLING_DOMAINS[key as keyof typeof BILLING_DOMAINS].name;
      const status = billingHelpers.getDomainSpecStatus(name);
      if (!status.hasVerify) missing.push(name);
    }
    expect(
      missing,
      `Missing VERIFY specs for: ${missing.join(', ')}`
    ).toHaveLength(0);
  });
});
