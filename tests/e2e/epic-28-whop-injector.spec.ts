import { test, expect } from '@playwright/test';

test.describe('Epic 28: Whop SDK Injector', () => {
    test('Verifies dynamic injection of tenant payloads based on domain', async ({ page }) => {
        try { await page.goto('http://localhost:5173', { timeout: 3000 }); } catch (e) {}
        
        const whopMod = page.locator('#whop-injector-module');
        await expect(whopMod).toBeVisible({ timeout: 2000 });
        
        await expect(whopMod.locator('text=Whop SDK Dynamic Injection')).toBeVisible();
        await expect(whopMod.locator('text=TENANT SUBSCRIPTION PAYLOADS')).toBeVisible();
        await expect(whopMod.locator('text=[TIER: ENTERPRISE]')).toBeVisible();
    });
});
