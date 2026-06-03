import { test, expect } from '@playwright/test';

test('Epic 36: Offline SQLite Engine Component renders', async ({ page }) => {
  await page.goto('http://localhost:5173/auth');
  await page.click('button:has-text("Init Token Exchange")');
  await expect(page.locator('text=AUTHORIZED')).toBeVisible({ timeout: 5000 });
  await page.goto('http://localhost:5173/engine');
  const el = page.locator('text=Offline SQLite Engine').first();
  await expect(el).toBeVisible();
});
