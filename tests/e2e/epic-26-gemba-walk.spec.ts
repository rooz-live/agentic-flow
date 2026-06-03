import { test, expect } from '@playwright/test';

test.describe('Epic 26: Gemba Walk Observation Engine', () => {
    test('Verifies the UI dynamically displays live codebase debt telemetry', async ({ page }) => {
        try { await page.goto('http://localhost:5173', { timeout: 3000 }); } catch (e) {}
        
        const gembaMod = page.locator('#gemba-walk-module');
        await expect(gembaMod).toBeVisible({ timeout: 2000 });
        
        await expect(gembaMod.locator('text=Physical Gemba Walk')).toBeVisible();
        await expect(gembaMod.locator('text=App.tsx')).toBeVisible();
        await expect(gembaMod.locator('text=DEBT')).first().toBeVisible();
    });
});
