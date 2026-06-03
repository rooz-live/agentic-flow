import { test, expect } from '@playwright/test';

test.describe('Epic 25: Swarm Matrix Scaler', () => {
    test('Verifies the UI component dynamically spawns new horizontal nodes', async ({ page }) => {
        try { await page.goto('http://localhost:5173', { timeout: 3000 }); } catch (e) {}
        
        const matrixMod = page.locator('#swarm-matrix-module');
        await expect(matrixMod).toBeVisible({ timeout: 2000 });
        
        await expect(matrixMod.locator('text=ACTIVE DOMAIN NODES: 3')).toBeVisible();
        
        const spawnBtn = matrixMod.locator('button', { hasText: 'SPAWN NEW SUBALTERN NODE' });
        await spawnBtn.click();
        
        await expect(matrixMod.locator('text=ACTIVE DOMAIN NODES: 4')).toBeVisible({ timeout: 2500 });
        await expect(matrixMod.locator('text=subaltern-4')).toBeVisible();
    });
});
