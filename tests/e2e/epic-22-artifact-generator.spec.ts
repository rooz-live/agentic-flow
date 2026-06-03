import { test, expect } from '@playwright/test';

test.describe('Epic 22: Artifact Generator', () => {
    test('Verifies physical deployment artifacts are visually packaged', async ({ page }) => {
        try { await page.goto('http://localhost:5173', { timeout: 3000 }); } catch (e) {}
        
        const artifactMod = page.locator('#artifact-generator-module');
        await expect(artifactMod).toBeVisible({ timeout: 2000 });
        await expect(artifactMod.locator('text=Swarm Deployment Artifacts')).toBeVisible();
        await expect(artifactMod.locator('text=Ready for CPANEL SFTP')).toBeVisible();
    });
});
