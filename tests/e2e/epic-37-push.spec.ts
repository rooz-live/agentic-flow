import { test, expect } from '@playwright/test';

test('Epic 37: Push Notification Matrix Component renders', async ({ page }) => {
  await page.goto('http://localhost:5173/auth');
  await page.click('button:has-text("Init Token Exchange")');
  await expect(page.locator('text=AUTHORIZED')).toBeVisible({ timeout: 5000 });
  await page.goto('http://localhost:5173/engine');
  const el = page.locator('text=Push Notification Matrix').first();
  await expect(el).toBeVisible();
});
