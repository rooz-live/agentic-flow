import { test, expect } from '@playwright/test';

/**
 * [RCA TRACE]
 * Epic 9: Visual Style Tokens
 * TDD Phase: RED -> GREEN VALIDATION
 * Objective: Verify global CSS custom properties can be mutated at runtime.
 */
test.describe('Epic 9: Visual Style Tokens', () => {
    
    test('VisualTokens component injects and mutates global CSS variables', async ({ page }) => {
        try {
            // Attempt local sandbox resolution
            await page.goto('http://localhost:5173', { timeout: 3000 });
        } catch (e) {}
        
        const tokenGrid = page.locator('#visual-tokens-grid');
        await expect(tokenGrid).toBeVisible({ timeout: 2000 });
        
        // Target specific tokens
        const terminalToken = tokenGrid.locator('#token-terminal');
        await expect(terminalToken).toBeVisible();
        
        // Execute Token Swap
        await terminalToken.click();
        
        // Expect Global Document element to be mutated (Terminal = #4ade80)
        // We assert against the inline style that gets attached to the root html element
        const htmlElement = page.locator('html');
        await expect(htmlElement).toHaveAttribute('style', /--neon-accent: #4ade80/);
    });
});
