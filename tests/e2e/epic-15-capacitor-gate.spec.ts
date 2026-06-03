import { test, expect } from '@playwright/test';

/**
 * [RCA TRACE]
 * Epic 15: Capacitor Native Architecture Gate
 * TDD Phase: RED -> GREEN VALIDATION
 * Objective: Verify the presence of a visual build pipeline simulation for native iOS and Android payload generation.
 */
test.describe('Epic 15: Capacitor Native Engine', () => {
    
    test('Capacitor Gate strictly simulates cross-platform payload synchronization', async ({ page }) => {
        try {
            await page.goto('/capabilities', { timeout: 3000 });
        } catch (e) {}
        
        // 1. Validate the physical DOM boundary
        const capGate = page.locator('#capacitor-native-gate');
        await expect(capGate).toBeVisible({ timeout: 2000 });
        
        // 2. Ensure both mobile OS vectors are present
        await expect(capGate.locator('text=iOS Native Layer')).toBeVisible();
        await expect(capGate.locator('text=Android Native Layer')).toBeVisible();
        
        // 3. Trigger Mock Capacitor Build Pipeline (iOS)
        const iosBtn = capGate.locator('#compile-ios-btn');
        await iosBtn.click();
        
        // 4. Wait for the mock network latency and assert success state
        await expect(capGate.locator('text=SYNCED').first()).toBeVisible({ timeout: 2500 });
        
        // 5. Assert physical architecture telemetry exists
        await expect(capGate.locator('text=dist/index.html')).toBeVisible();
        await expect(capGate.locator('text=capacitor.config.ts')).toBeVisible();
    });
});
