import { test, expect } from '@playwright/test';

test.describe('Epic 16: Swarm Telemetry Visualizer', () => {
    test('Verifies live network graph state of all generative nodes', async ({ page }) => {
        try { await page.goto('http://localhost:5173', { timeout: 3000 }); } catch (e) {}
        
        const telemetry = page.locator('#swarm-telemetry-visualizer');
        await expect(telemetry).toBeVisible({ timeout: 2000 });
        
        await expect(telemetry.locator('text=O-GOV CORE')).toBeVisible();
        await expect(telemetry.locator('text=INVESTING NODE')).toBeVisible();
        await expect(telemetry.locator('text=FITNESS NODE')).toBeVisible();
        await expect(telemetry.locator('text=SYNCED')).first().toBeVisible();
    });
});
