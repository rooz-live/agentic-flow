import { test, expect } from '@playwright/test';

/**
 * [RCA TRACE]
 * Epic 8: Direct-to-Code Sync (Diff View)
 * TDD Phase: RED -> GREEN VALIDATION
 * Objective: Verify the system can render a Git-style diff and mutate local file state.
 */
test.describe('Epic 8: Direct-to-Code Sync (Diff View)', () => {
    
    test('DiffViewSync natively renders Git diffs and executes merge transitions', async ({ page }) => {
        try {
            // Invert Thinking: Attempt navigation. Failure triggers explicit RED.
            await page.goto('http://localhost:5173', { timeout: 3000 });
        } catch (e) { }
        
        // 1. Locate the physical Diff View container constraints
        const diffView = page.locator('#diff-view-sync');
        await expect(diffView).toBeVisible({ timeout: 2000 });
        
        // 2. Verify the pre-merge UI exists
        const mergeBtn = diffView.locator('.apply-merge-btn');
        await expect(mergeBtn).toBeVisible();
        await expect(mergeBtn).toHaveText('Apply Merge');
        
        // 3. Simulate explicit interaction (Applying the Git-merge)
        await mergeBtn.click();
        
        // 4. Verify post-merge DOM transition
        await expect(mergeBtn).toHaveText('Merged ✓');
        await expect(diffView.locator('text=Successfully merged into physical workspace')).toBeVisible();
    });
});
