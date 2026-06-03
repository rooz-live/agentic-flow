import { test, expect } from '@playwright/test';

test.describe('Epic 23: Autonomous Refactor Engine', () => {
    test('Verifies the autonomous Kaizen cycle logic in the UI', async ({ page }) => {
        try { await page.goto('http://localhost:5173', { timeout: 3000 }); } catch (e) {}
        
        const refactorMod = page.locator('#refactor-loop-module');
        await expect(refactorMod).toBeVisible({ timeout: 2000 });
        
        // Assert initial Idle constraints
        await expect(refactorMod.locator('text=AWAITING GEMBA WALK')).toBeVisible();
        
        // Trigger Autonomous Cycle
        const execBtn = refactorMod.locator('button', { hasText: 'EXECUTE REFLEXIVE KAIZEN CYCLE' });
        await execBtn.click();
        
        // Verify constraint transitions
        await expect(refactorMod.locator('text=ANALYZING INLINE CSS DEBT')).toBeVisible();
        await expect(refactorMod.locator('text=REFACTOR COMPLETE')).toBeVisible({ timeout: 4500 });
    });
});
