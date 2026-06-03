import { test, expect } from '@playwright/test';

test.describe('Epic 18: Hypertrophy AI Module', () => {
    test('Verifies generation of fitness payload capability', async ({ page }) => {
        try { await page.goto('http://localhost:5173', { timeout: 3000 }); } catch (e) {}
        
        const hyperMod = page.locator('#hypertrophy-ai-module');
        await expect(hyperMod).toBeVisible({ timeout: 2000 });
        
        await expect(hyperMod.locator('text=Hypertrophy AI (Capability Payload)')).toBeVisible();
        await expect(hyperMod.locator('text=GENERATING MACRO-CYCLE:')).toBeVisible();
    });
});
