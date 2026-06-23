/**
 * OroCommerce CRM Workflow — Phase 4
 *
 * Validates the OroCommerce B2B real workflow.
 *
 * CANONICAL_SCHEMA: docs/api/billing.proto
 * FQDN_CONFIG:      config/fqdn_registry.yaml
 * HARNESS:          tests/harness/BaseBillingE2ESpec.ts
 *
 * Anti-CVT gate: ALL network tests skip when LIVE_EDGE_TEST absent.
 * Offline tests (contract validation, config parsing) always run.
 *
 * Run live:  LIVE_EDGE_TEST=true npx playwright test tests/integration/oro-crm-workflow.e2e.spec.ts
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
const ORO_URL = process.env.ORO_URL || 'https://crm.bhopti.com';
const FQDN_CONFIG = join(ROOT, 'config/fqdn_registry.yaml');

// ─── Config File Validation (offline — always runs) ──────────────────────────

test.describe('OroCommerce Boundary — Config Contract', () => {

  test('fqdn_registry.yaml exists', () => {
    expect(
      existsSync(FQDN_CONFIG),
      'config/fqdn_registry.yaml missing — run Phase 4'
    ).toBe(true);
  });

  test('fqdn_registry.yaml defines crm.bhopti.com', () => {
    const cfg = readFileSync(FQDN_CONFIG, 'utf-8');
    expect(cfg).toContain('crm.bhopti.com');
  });

  test('fqdn_registry.yaml defines shop.bhopti.com', () => {
    const cfg = readFileSync(FQDN_CONFIG, 'utf-8');
    expect(cfg).toContain('shop.bhopti.com');
  });

});

// ─── Oro Commerce Live Boundary (requires LIVE_EDGE_TEST=true) ───────────────

test.describe('Oro Commerce — Real B2B Workflow', () => {

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

  test('Real B2B Workflow - B2B Sign In page renders', async ({ page }) => {
    // Assert that we can reach the login/sign-in page
    const response = await page.goto(`${ORO_URL}/user/login`, { waitUntil: 'networkidle' });
    expect(response?.status() ?? 999).toBeLessThan(500);
    
    // Check if sign-in form is present
    const content = await page.textContent('body');
    const hasLoginFields = content?.includes('OroCommerce') || content?.includes('Sovereign Swarm') || content?.includes('Login');
    expect(hasLoginFields).toBe(true);
  });
  
  test('Real B2B Workflow - API endpoint responds', async () => {
    // Verify that the JWT bridge or physical API is active
    const ctx = await pwRequest.newContext();
    const response = await ctx.post(`${ORO_URL}/api/login_check`, {
        data: {
            username: "admin",
            password: "sovereign_swarm_root"
        }
    });
    // Can be 401 Unauthorized if test credentials are not populated in the environment,
    // but should not be 404 or 500
    expect([200, 401, 403]).toContain(response.status());
    await ctx.dispose();
  });
});
