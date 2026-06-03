import { test, expect } from '@playwright/test';

test('Epic 38: Biometric Hardware Hook Component renders', async ({ page }) => {
  // Biometrics are on the public /auth layer
  await page.goto('http://localhost:5173/auth');
  const el = page.locator('text=Biometric Hardware Hook').first();
  await expect(el).toBeVisible();
});
