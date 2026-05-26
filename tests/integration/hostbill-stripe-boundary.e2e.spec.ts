/**
 * HostBill + Stripe Boundary Integration — Phase 4 NEAR-3
 *
 * Validates the billing pipeline exit point:
 * Invoice Engine → HostBill API → Stripe Payment Gateway
 *
 * CANONICAL_SCHEMA: docs/api/billing.proto (message Invoice, CreditNote)
 * FQDN_CONFIG:      config/fqdn_registry.yaml
 * HARNESS:          tests/harness/BaseBillingE2ESpec.ts
 * INVENTORY:        docs/billing/CONSOLIDATION_INVENTORY.md
 *
 * Anti-CVT gate: ALL network tests skip when LIVE_EDGE_TEST absent.
 * Offline tests (contract validation, config parsing) always run.
 *
 * Run live:  LIVE_EDGE_TEST=true npx playwright test tests/integration/hostbill-stripe-boundary.e2e.spec.ts
 */

import { test, expect, request as pwRequest } from '@playwright/test';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  billingHelpers,
  ERROR_CODES,
  BILLING_DOMAINS,
  edgeHelpers,
} from '../harness/BaseBillingE2ESpec';

const ROOT = join(__dirname, '..', '..');
const LIVE = process.env.LIVE_EDGE_TEST === 'true';
const HOSTBILL_URL = process.env.HOSTBILL_URL || '';
const ORO_URL = process.env.ORO_URL || '';
const STRIPE_WEBHOOK_URL = process.env.STRIPE_WEBHOOK_URL
  || 'http://127.0.0.1:9091/webhooks/stripe';
const FQDN_CONFIG = join(ROOT, 'config/fqdn_registry.yaml');

// ─── Config File Validation (offline — always runs) ──────────────────────────

test.describe('HostBill/Stripe Boundary — Config Contract', () => {

  test('fqdn_registry.yaml exists', () => {
    expect(
      existsSync(FQDN_CONFIG),
      'config/fqdn_registry.yaml missing — run Phase 4 NEAR-3'
    ).toBe(true);
  });

  test('fqdn_registry.yaml defines billing.bhopti.com', () => {
    const cfg = readFileSync(FQDN_CONFIG, 'utf-8');
    expect(cfg).toContain('billing.bhopti.com');
  });

  test('fqdn_registry.yaml defines Stripe webhook path', () => {
    const cfg = readFileSync(FQDN_CONFIG, 'utf-8');
    expect(cfg).toContain('stripe_webhook_path');
    expect(cfg).toContain('/webhooks/stripe');
  });

  test('fqdn_registry.yaml defines rejection status codes 400/403', () => {
    const cfg = readFileSync(FQDN_CONFIG, 'utf-8');
    expect(cfg).toContain('400');
    expect(cfg).toContain('403');
  });

  test('fqdn_registry.yaml defines LIVE_EDGE_TEST guard env var', () => {
    const cfg = readFileSync(FQDN_CONFIG, 'utf-8');
    expect(cfg).toContain('LIVE_EDGE_TEST');
  });

  test('fqdn_registry.yaml defines PI planning iterations', () => {
    const cfg = readFileSync(FQDN_CONFIG, 'utf-8');
    expect(cfg).toContain('pi_plan');
    expect(cfg).toContain('iteration_1');
    expect(cfg).toContain('iteration_4');
  });
});

// ─── Invoice Engine Contract (offline) ───────────────────────────────────────

test.describe('HostBill/Stripe Boundary — Invoice Engine Contract', () => {

  test('invoice_engine.py exists before boundary wiring', () => {
    billingHelpers.assertDomainFileExists('INVOICE_ENGINE');
  });

  test('Invoice has job_id field (sign-off linkage to HostBill)', () => {
    billingHelpers.assertContains(
      BILLING_DOMAINS.INVOICE_ENGINE.srcPath, 'job_id'
    );
  });

  test('invoice_engine.py exposes get_stats with immutable=True', () => {
    billingHelpers.assertContains(
      BILLING_DOMAINS.INVOICE_ENGINE.srcPath, '"immutable": True'
    );
  });

  test('ERR_MISSING_SIGNOFF prevents invoice before HostBill sign-off', () => {
    billingHelpers.assertErrorCode(
      BILLING_DOMAINS.INVOICE_ENGINE.srcPath,
      ERROR_CODES.ERR_MISSING_SIGNOFF
    );
  });

  test('CreditNote has original_invoice_id chain pointer (audit trail)', () => {
    billingHelpers.assertContains(
      BILLING_DOMAINS.INVOICE_ENGINE.srcPath, 'original_invoice_id'
    );
  });
});

// ─── HostBill Live Boundary (requires LIVE_EDGE_TEST=true) ───────────────────

test.describe('HostBill Boundary — Live API Probes', () => {

  test.beforeEach(() => {
    if (!LIVE || !HOSTBILL_URL) test.skip();
  });

  test('HostBill URL responds with status <500', async ({ page }) => {
    const response = await page.goto(HOSTBILL_URL, { waitUntil: 'networkidle' });
    expect(response?.status() ?? 999).toBeLessThan(500);
  });

  test('HostBill login page renders (not blank)', async ({ page }) => {
    await page.goto(HOSTBILL_URL, { waitUntil: 'networkidle' });
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('HostBill webhook endpoint reachable at /webhooks/stripe', async () => {
    const ctx = await pwRequest.newContext();
    const webhookUrl = `${HOSTBILL_URL}/webhooks/stripe`;
    const response = await ctx.post(webhookUrl, {
      data: { test: true },
      headers: { 'Stripe-Signature': 't=0,v1=invalid' },
    });
    expect([400, 403, 405]).toContain(response.status());
    await ctx.dispose();
  });
});

// ─── Oro Commerce Live Boundary (requires LIVE_EDGE_TEST=true) ───────────────

test.describe('Oro Commerce Boundary — Live API Probes', () => {

  test.beforeEach(() => {
    if (!LIVE || !ORO_URL) test.skip();
  });

  test('Oro health endpoint responds <500', async () => {
    const ctx = await pwRequest.newContext();
    const response = await ctx.get(`${ORO_URL}/health`);
    expect(response.status()).toBeLessThan(500);
    await ctx.dispose();
  });

  test('Oro storefront accessible via crm.bhopti.com', async ({ page }) => {
    await edgeHelpers.assertEdgeFQDN(page, 'crm.bhopti.com');
  });
});

// ─── Stripe Live Webhook Boundary ────────────────────────────────────────────

test.describe('Stripe Webhook Boundary — Security Hardening', () => {

  test('tampered signature rejected with 400/403 (local or live)', async () => {
    if (!LIVE && !process.env.STRIPE_WEBHOOK_URL) {
      test.skip();
      return;
    }
    const ctx = await pwRequest.newContext();
    await edgeHelpers.assertStripeWebhookBoundary(ctx, STRIPE_WEBHOOK_URL);
    await ctx.dispose();
  });

  test('empty body with valid signature format returns 400/403', async () => {
    if (!LIVE && !process.env.STRIPE_WEBHOOK_URL) {
      test.skip();
      return;
    }
    const ctx = await pwRequest.newContext();
    const response = await ctx.post(STRIPE_WEBHOOK_URL, {
      data: '',
      headers: {
        'Stripe-Signature': `t=${Date.now()},v1=abc123def456`,
        'Content-Type': 'application/json',
      },
    });
    expect([400, 403]).toContain(response.status());
    await ctx.dispose();
  });

  test('no 500 crash on malformed Stripe payload', async () => {
    if (!LIVE && !process.env.STRIPE_WEBHOOK_URL) {
      test.skip();
      return;
    }
    const ctx = await pwRequest.newContext();
    const response = await ctx.post(STRIPE_WEBHOOK_URL, {
      data: 'not-json-at-all!@#$%',
      headers: { 'Stripe-Signature': 't=1,v1=bad' },
    });
    expect(response.status()).not.toBe(500);
    await ctx.dispose();
  });
});

// ─── Full Pipeline Smoke (offline — pure Python contract) ────────────────────

test.describe('HostBill/Stripe — Full Pipeline Contract Smoke', () => {

  test('billing proto defines Invoice with job_id + calculation_id link', () => {
    billingHelpers.assertProtoMessage('Invoice');
    const proto = readFileSync(
      join(ROOT, 'docs/api/billing.proto'), 'utf-8'
    );
    expect(proto).toContain('job_id');
    expect(proto).toContain('calculation_id');
    expect(proto).toContain('GenerateInvoice');
    expect(proto).toContain('IssueCreditNote');
  });

  test('pipeline stages all have VERIFY specs (no gap)', () => {
    const stages = [
      'entity-identity',
      'rate-engine',
      'eventops',
      'ceremony-logger',
      'job-manifest',
      'calculation-engine',
      'cost-ledger',
      'tax-currency',
      'project-context',
      'invoice-engine',
    ];
    for (const domain of stages) {
      const status = billingHelpers.getDomainSpecStatus(domain);
      expect(
        status.hasVerify,
        `No VERIFY spec for pipeline stage: ${domain}`
      ).toBe(true);
    }
  });
});
