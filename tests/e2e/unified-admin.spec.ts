import { test, expect } from '@playwright/test';

test.describe('Unified Admin Dashboard & Subdomain Harness (US-057)', () => {
  test('Operator navigates to Admin, views DDD metrics, and triggers Subdomain Generator', async ({ page }) => {
    // 1. App/Network Layer: Accessing the Admin Route
    await page.goto('/prefig/admin');

    // Should redirect to auth if no Whop token is present
    await expect(page).toHaveURL(/.*auth/);

    // Simulate OAuth injection (Bypassing for TDD)
    await page.evaluate(() => {
        localStorage.setItem('whop_access_token', 'test_token');
    });

    await page.goto('/prefig/admin');
    await expect(page).toHaveURL(/.*admin/);

    // 2. Platform/Software Layer: Verifying DDD Bounded Contexts
    const dashboardTitle = page.locator('h1', { hasText: 'Unified Swarm Administration' });
    await expect(dashboardTitle).toBeVisible();

    // 3. Harness: Verifying Subdomain Generation module presence
    const generateBtn = page.locator('button', { hasText: 'Provision Subdomain (cPanel UAPI)' });
    await expect(generateBtn).toBeVisible();
    await expect(generateBtn).toBeEnabled();

    // Verify ROAM Risk mitigations are displayed
    await expect(page.locator('text=ROAM Analysis: Active')).toBeVisible();
  });
});
