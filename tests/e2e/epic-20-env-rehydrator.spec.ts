import { test, expect } from '@playwright/test';

test.describe('Epic 20: Env Rehydrator', () => {
    test('Verifies secure environment variables are physically represented in the UI mock', async ({ page }) => {
        try { await page.goto('http://localhost:5173', { timeout: 3000 }); } catch (e) {}
        
        const envMod = page.locator('#env-rehydrator-module');
        await expect(envMod).toBeVisible({ timeout: 2000 });
        await expect(envMod.locator('text=Secure Context Rehydration')).toBeVisible();
        await expect(envMod.locator('text=WHOP_API_KEY')).toBeVisible();
    });
});
