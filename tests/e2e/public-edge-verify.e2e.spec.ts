/**
 * PUBLIC EDGE VERIFY — Phase 4 NEAR-2
 *
 * Validates live public FQDNs respond correctly with TLS + server headers.
 * Anti-CVT gate: ALL tests skip gracefully when LIVE_EDGE_TEST env is absent.
 * No false-green local passes pretending to be live edge validation.
 *
 * HARNESS:     tests/harness/BaseBillingE2ESpec.ts (FQDN_REGISTRY, edgeHelpers)
 * INVENTORY:   docs/billing/CONSOLIDATION_INVENTORY.md
 * CONFIG:      config/fqdn_registry.yaml (origin + delegation map)
 *
 * Run live:  LIVE_EDGE_TEST=true npx playwright test tests/e2e/public-edge-verify.e2e.spec.ts
 * Run local: npx playwright test (skips all — expected behaviour)
 *
 * Anti-CVT Rule: NEVER remove the LIVE_EDGE_TEST guard. Passing locally without
 * real DNS proves nothing. Skipped ≠ Failed ≠ Passing theater.
 */

import { test, expect, request as pwRequest } from '@playwright/test';
import {
  FQDN_REGISTRY,
  getDomainBatch,
  getTotalBatches,
  edgeHelpers,
} from '../harness/BaseBillingE2ESpec';

const LIVE = process.env.LIVE_EDGE_TEST === 'true';
const STRIPE_WEBHOOK_URL = process.env.STRIPE_WEBHOOK_URL
  || 'http://127.0.0.1:9091/webhooks/stripe';

// ─── FQDN Registry Sanity (always runs — no network) ─────────────────────────

test.describe('Public Edge — FQDN Registry Sanity (offline)', () => {

  test('FQDN_REGISTRY contains at least 1 entry', () => {
    expect(FQDN_REGISTRY.length).toBeGreaterThan(0);
  });

  test('getDomainBatch(0) returns ≤3 entries by default', () => {
    const batch = getDomainBatch(0);
    expect(batch.length).toBeLessThanOrEqual(3);
    expect(batch.length).toBeGreaterThan(0);
  });

  test('getTotalBatches() accounts for all FQDNs', () => {
    const batches = getTotalBatches();
    const maxPerBatch = parseInt(
      process.env.MAX_DOMAINS_PER_BATCH || '3', 10
    );
    expect(batches).toBe(Math.ceil(FQDN_REGISTRY.length / maxPerBatch));
  });

  test('all FQDNs in registry are non-empty strings', () => {
    for (const fqdn of FQDN_REGISTRY) {
      expect(typeof fqdn).toBe('string');
      expect(fqdn.length).toBeGreaterThan(0);
      expect(fqdn).toMatch(/^[a-z0-9.-]+$/);
    }
  });
});

// ─── Live Edge FQDN VERIFY (requires LIVE_EDGE_TEST=true) ────────────────────

test.describe('Public Edge — Live FQDN HTTPS + TLS (batch 0)', () => {

  test.beforeEach(() => {
    if (!LIVE) {
      test.skip();
    }
  });

  test('batch-0: all FQDNs respond <400 with server header', async ({ page }) => {
    const batch = getDomainBatch(0);
    for (const domain of batch) {
      await edgeHelpers.assertEdgeFQDN(page, domain);
    }
  });

  test('batch-0: TLS certificate is valid (no insecure warnings)', async ({ page }) => {
    const batch = getDomainBatch(0);
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    for (const domain of batch) {
      const response = await page.goto(
        `https://${domain}/`, { waitUntil: 'networkidle' }
      );
      expect(response?.status() ?? 999).toBeLessThan(400);
    }
    const tlsErrors = errors.filter(e =>
      e.toLowerCase().includes('ssl') ||
      e.toLowerCase().includes('cert') ||
      e.toLowerCase().includes('tls')
    );
    expect(tlsErrors).toHaveLength(0);
  });
});

test.describe('Public Edge — Live FQDN HTTPS + TLS (batch 1)', () => {

  test.beforeEach(() => {
    if (!LIVE || getTotalBatches() < 2) {
      test.skip();
    }
  });

  test('batch-1: all FQDNs respond <400 with server header', async ({ page }) => {
    const batch = getDomainBatch(1);
    for (const domain of batch) {
      await edgeHelpers.assertEdgeFQDN(page, domain);
    }
  });
});

test.describe('Public Edge — Live FQDN HTTPS + TLS (batch 2)', () => {

  test.beforeEach(() => {
    if (!LIVE || getTotalBatches() < 3) {
      test.skip();
    }
  });

  test('batch-2: all FQDNs respond <400 with server header', async ({ page }) => {
    const batch = getDomainBatch(2);
    for (const domain of batch) {
      await edgeHelpers.assertEdgeFQDN(page, domain);
    }
  });
});

// ─── Stripe Webhook Boundary (live or local) ─────────────────────────────────

test.describe('Public Edge — Stripe Webhook Security Boundary', () => {

  test('tampered Stripe signature returns 400 or 403', async () => {
    if (!LIVE && !process.env.STRIPE_WEBHOOK_URL) {
      test.skip();
      return;
    }
    const ctx = await pwRequest.newContext();
    await edgeHelpers.assertStripeWebhookBoundary(ctx, STRIPE_WEBHOOK_URL);
    await ctx.dispose();
  });

  test('missing Stripe signature header returns 400 or 403', async () => {
    if (!LIVE && !process.env.STRIPE_WEBHOOK_URL) {
      test.skip();
      return;
    }
    const ctx = await pwRequest.newContext();
    const response = await ctx.post(STRIPE_WEBHOOK_URL, {
      data: { type: 'payment_intent.created' },
      headers: {},
    });
    const status = response.status();
    expect(
      [400, 403, 401],
      `Stripe webhook accepted request with no signature (status: ${status})`
    ).toContain(status);
    await ctx.dispose();
  });
});

// ─── HostBill / Oro Health Probes (flag-gated) ────────────────────────────────

test.describe('Public Edge — HostBill + Oro Health Probes', () => {

  test.beforeEach(() => {
    if (!LIVE) test.skip();
  });

  test('HostBill admin login page is reachable', async ({ page }) => {
    const hostbillUrl = process.env.HOSTBILL_URL;
    if (!hostbillUrl) {
      test.skip();
      return;
    }
    const response = await page.goto(hostbillUrl, { waitUntil: 'networkidle' });
    expect(response?.status() ?? 999).toBeLessThan(500);
  });

  test('Oro commerce storefront health endpoint responds', async () => {
    const oroUrl = process.env.ORO_URL;
    if (!oroUrl) {
      test.skip();
      return;
    }
    const ctx = await pwRequest.newContext();
    const response = await ctx.get(`${oroUrl}/health`);
    expect(response.status()).toBeLessThan(500);
    await ctx.dispose();
  });
});

// ─── Chunked Delivery Anti-Timeout Regression ────────────────────────────────

test.describe('Public Edge — Chunked Delivery Anti-Timeout', () => {

  test('all batches covered by getTotalBatches()', () => {
    const total = getTotalBatches();
    let covered = 0;
    for (let i = 0; i < total; i++) {
      covered += getDomainBatch(i).length;
    }
    expect(covered).toBe(FQDN_REGISTRY.length);
  });

  test('no single batch exceeds MAX_DOMAINS_PER_BATCH', () => {
    const maxPerBatch = parseInt(
      process.env.MAX_DOMAINS_PER_BATCH || '3', 10
    );
    for (let i = 0; i < getTotalBatches(); i++) {
      expect(getDomainBatch(i).length).toBeLessThanOrEqual(maxPerBatch);
    }
  });
});
