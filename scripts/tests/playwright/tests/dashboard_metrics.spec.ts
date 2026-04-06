import { test, expect } from '@playwright/test';

test.describe('Agentic UI Offline Governance Execution Matrix', () => {
  // @business-context WSJF-Cycle-50: Playwright boundaries
  // @constraint R-2026-018: Attention Fragmentation Drops

  test('Validates Localhost UI successfully executes offline bounds securely', async ({ page }) => {
    // Navigate strictly against local constraints
    await page.goto('http://localhost:3000');

    // Confirm React loads reliably
    await expect(page.locator('h1')).toContainText('Offline Inference Matrix');

    // Manipulate boundary parameters directly generating native execution tests
    const inputLimit = page.locator('input[type="number"]');
    await inputLimit.fill('1000'); // Standard temporal array

    const requestButton = page.locator('button', { hasText: 'Request Trace' });
    await requestButton.click();

    // The boundary proxy execution evaluates the network layer offline mapping exactly
    const resultBox = page.locator('pre');
    await expect(resultBox).toBeVisible({ timeout: 5000 });
  });

  test('Asserts R-2026-018 Governance Drop limit triggers appropriately natively dropping payloads > 5000', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Inject massive temporal array simulating an unstructured prompt sprawl
    const inputLimit = page.locator('input[type="number"]');
    await inputLimit.fill('60000'); // Extreme trace array 

    const requestButton = page.locator('button', { hasText: 'Request Trace' });
    await requestButton.click();

    // Verify the explicit Governance Rule renders visually resolving completion theater dynamically natively.
    await expect(page.locator('div').filter({ hasText: 'WSJF R-2026-018: Attention Fragmented' })).toBeVisible({ timeout: 5000 });
    
    // Assert structural CSS tracing matches native blocking hooks visually mapped securely
    const containerBlock = page.locator('div').filter({ hasText: 'WSJF R-2026-018' }).last();
    await expect(containerBlock).toHaveCSS('border', /solid rgb\(255, 0, 0\)/); // Asserts red blocking edge natively
  });
});
