import { test, expect } from '@playwright/test';

test('Epic 40: App Store Gate Component renders', async ({ page }) => {
  // App Store Gate is on the public /auth layer
  await page.goto('http://localhost:5173/auth');
  const el = page.locator('text=App Store Gate').first();
  await expect(el).toBeVisible();
});
