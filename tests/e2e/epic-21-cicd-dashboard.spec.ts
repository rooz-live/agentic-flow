import { test, expect } from '@playwright/test';

test.describe('Epic 21: CI/CD Dashboard', () => {
    test('Verifies the internal Playwright pipeline log is visualized', async ({ page }) => {
        try { await page.goto('http://localhost:5173', { timeout: 3000 }); } catch (e) {}
        
        const ciMod = page.locator('#ci-cd-dashboard-module');
        await expect(ciMod).toBeVisible({ timeout: 2000 });
        await expect(ciMod.locator('text=Playwright TDD Constraint Engine')).toBeVisible();
        await expect(ciMod.locator('text=Codebase is immutable')).toBeVisible();
    });
});
