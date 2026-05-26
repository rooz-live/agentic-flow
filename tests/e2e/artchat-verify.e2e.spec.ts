import { test, expect } from '@playwright/test';

/**
 * ArtChat / publication slice — public edge smoke on canonical billing FQDN.
 * Contract: HTTP reachable, not 5xx; optional checkout CTA when page serves HTML.
 */
const CANONICAL_FQDN = process.env.ARTCHAT_FQDN || 'billing.bhopti.com';
const BASE_URL = `https://${CANONICAL_FQDN}`;

test.describe('ArtChat public edge verify', () => {
  test('canonical FQDN responds without server error', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/`, { maxRedirects: 5 });
    expect(response.status(), `GET ${BASE_URL}/`).toBeLessThan(500);
    expect(response.status()).not.toBe(404);
  });

  test('checkout path or home exposes purchasable surface', async ({ page }) => {
    test.skip(!process.env.ARTCHAT_E2E_STRICT, 'Set ARTCHAT_E2E_STRICT=1 for CTA assertion');
    const response = await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    expect(response?.status() ?? 0).toBeLessThan(500);
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/checkout|buy|plan|subscribe|invoice/i);
  });
});
