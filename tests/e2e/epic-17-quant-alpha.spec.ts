import { test, expect } from '@playwright/test';

test.describe('Epic 17: Quant Alpha Module', () => {
    test('Verifies strict generation of the Quant Alpha UI payload', async ({ page }) => {
        try { await page.goto('http://localhost:5173', { timeout: 3000 }); } catch (e) {}
        
        const quantMod = page.locator('#quant-alpha-module');
        await expect(quantMod).toBeVisible({ timeout: 2000 });
        
        await expect(quantMod.locator('text=Quant Alpha Trading')).toBeVisible();
        await expect(quantMod.locator('text=EXECUTING STRATEGY:')).toBeVisible();
    });
});
