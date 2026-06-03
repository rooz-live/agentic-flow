import { test, expect } from '@playwright/test';

test.describe('Epic 29: Subaltern SEO Engine', () => {
    test('Verifies dynamic injection of metadata based on generated domain', async ({ page }) => {
        try { await page.goto('http://localhost:5173', { timeout: 3000 }); } catch (e) {}
        
        const seoMod = page.locator('#subaltern-seo-module');
        await expect(seoMod).toBeVisible({ timeout: 2000 });
        
        await expect(seoMod.locator('text=Subaltern SEO')).toBeVisible();
        await expect(seoMod.locator('text=<title>Quant Alpha')).toBeVisible();
    });
});
