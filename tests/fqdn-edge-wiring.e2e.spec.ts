/**
 * FQDN Edge Wiring — Symbol-Contract Tests
 *
 * Validates HostBill / OroCRM / Stripe integration wiring by asserting
 * that source code symbols, error codes, and API contracts are present in
 * the expected files.  These are NOT live HTTP tests — no page.goto() calls.
 *
 * Suites:
 *   [hostbill-fqdn-contract]      — Rust bridge + Python gateway wiring
 *   [orocrm-fqdn-registry]        — FQDN registry & helper presence
 *   [stripe-webhook-boundary]     — Stripe HMAC validation contract
 *   [rust-hostbill-api-contract]  — HostBill API payload contract
 */

import { test, expect } from '@playwright/test';
import { readFile } from './harness/BaseBillingE2ESpec';

// ─── 1. HostBill Integration Contract ────────────────────────────────────────

test.describe('[hostbill-fqdn-contract]', () => {
  const RUST_LIB = 'src/rust/eventops_pyo3/src/lib.rs';
  const STRIPE_GW = 'src/gateways/stripe_gateway_service.py';

  test('emit_to_hostbill function exists in Rust bridge', () => {
    const content = readFile(RUST_LIB);
    expect(content).toContain('fn emit_to_hostbill');
  });

  test('addMeteredUsage API call string present in Rust bridge', () => {
    const content = readFile(RUST_LIB);
    expect(content).toContain('addMeteredUsage');
  });

  test('validate_stripe_signature reference exists in stripe gateway service', () => {
    const content = readFile(STRIPE_GW);
    expect(content).toContain('validate_stripe_signature');
  });

  test('forwarded_to_hostbill response string present in stripe gateway service', () => {
    const content = readFile(STRIPE_GW);
    expect(content).toContain('forwarded_to_hostbill');
  });

  test('webhook path /webhooks/stripe defined in stripe gateway service', () => {
    const content = readFile(STRIPE_GW);
    expect(content).toContain('/webhooks/stripe');
  });
});

// ─── 2. OroCRM FQDN Registry Contract ────────────────────────────────────────

test.describe('[orocrm-fqdn-registry]', () => {
  const HARNESS = 'tests/harness/BaseBillingE2ESpec.ts';

  test('crm.bhopti.com is registered in FQDN_REGISTRY', () => {
    const content = readFile(HARNESS);
    expect(content).toContain('crm.bhopti.com');
  });

  test('billing.bhopti.com is registered in FQDN_REGISTRY', () => {
    const content = readFile(HARNESS);
    expect(content).toContain('billing.bhopti.com');
  });

  test('getDomainBatch function exported from harness', () => {
    const content = readFile(HARNESS);
    expect(content).toContain('getDomainBatch');
  });

  test('assertEdgeFQDN helper exported from harness', () => {
    const content = readFile(HARNESS);
    expect(content).toContain('assertEdgeFQDN');
  });
});

// ─── 3. Stripe Webhook Boundary Contract ─────────────────────────────────────

test.describe('[stripe-webhook-boundary]', () => {
  const RUST_LIB = 'src/rust/eventops_pyo3/src/lib.rs';
  const STRIPE_GW = 'src/gateways/stripe_gateway_service.py';

  test('validate_stripe_signature function present in Rust bridge', () => {
    const content = readFile(RUST_LIB);
    expect(content).toContain('fn validate_stripe_signature');
  });

  test('ERR_SECURITY_THREAT error code present in Rust bridge', () => {
    const content = readFile(RUST_LIB);
    expect(content).toContain('ERR_SECURITY_THREAT');
  });

  test('ERR_INVALID_CONTRACT_FORMAT error code present in Rust bridge', () => {
    const content = readFile(RUST_LIB);
    expect(content).toContain('ERR_INVALID_CONTRACT_FORMAT');
  });

  test('Stripe-Signature header reference present in stripe gateway service', () => {
    const content = readFile(STRIPE_GW);
    expect(content).toContain('Stripe-Signature');
  });

  test('HMAC-SHA256 signing (hmac crate) used in Rust bridge', () => {
    const content = readFile(RUST_LIB);
    expect(content).toContain('hmac');
  });
});

// ─── 4. Rust Bridge HostBill API Contract ────────────────────────────────────

test.describe('[rust-hostbill-api-contract]', () => {
  const RUST_LIB = 'src/rust/eventops_pyo3/src/lib.rs';

  test('EventOps_Technician_Hours variable name present in Rust bridge payload', () => {
    const content = readFile(RUST_LIB);
    expect(content).toContain('EventOps_Technician_Hours');
  });

  test('account_id field present in HostBill payload construction', () => {
    const content = readFile(RUST_LIB);
    expect(content).toContain('account_id');
  });

  test('ERR_HOSTBILL_API error code present in Rust bridge', () => {
    const content = readFile(RUST_LIB);
    expect(content).toContain('ERR_HOSTBILL_API');
  });

  test('ERR_HOSTBILL_NETWORK error code present in Rust bridge', () => {
    const content = readFile(RUST_LIB);
    expect(content).toContain('ERR_HOSTBILL_NETWORK');
  });
});
