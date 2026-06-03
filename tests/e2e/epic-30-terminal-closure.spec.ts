import { test, expect } from '@playwright/test';

test.describe('Epic 30: Terminal Architectural Closure', () => {
    test('Verifies the final MVP Phase 1 termination gate exists', async ({ page }) => {
        try { await page.goto('http://localhost:5173', { timeout: 3000 }); } catch (e) {}
        
        const terminalMod = page.locator('#terminal-closure-module');
        await expect(terminalMod).toBeVisible({ timeout: 2000 });
        
        await expect(terminalMod.locator('text=Terminal Architectural Closure')).toBeVisible();
        await expect(terminalMod.locator('text=[SWARM INFRASTRUCTURE LOCKED]')).toBeVisible();
    });
});
