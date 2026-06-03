import { test, expect } from '@playwright/test';

test.describe('Epic 19: O-GOV Institutional Ledger', () => {
    test('Verifies presence of core institutional constitutional logic', async ({ page }) => {
        try { await page.goto('http://localhost:5173', { timeout: 3000 }); } catch (e) {}
        
        const ogovMod = page.locator('#ogov-core-module');
        await expect(ogovMod).toBeVisible({ timeout: 2000 });
        
        await expect(ogovMod.locator('text=O-GOV Institutional Ledger')).toBeVisible();
        await expect(ogovMod.locator('text=CONSTITUTIONAL INTEGRITY')).toBeVisible();
        await expect(ogovMod.locator('text=CAPITAL ALLOCATION')).toBeVisible();
    });
});
