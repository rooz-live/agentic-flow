import { test, expect } from '@playwright/test';

test.describe('analytics.interface.tag.ooo production contract', () => {
  test('main advocacy dashboard renders', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/dashboard|agentic|wsjf|advocacy/i);

    const bodyText = await page.locator('body').textContent();
    expect((bodyText || '').length).toBeGreaterThan(100);
  });

  test('trading dashboard renders SOXL/SOXS content', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/trading');
    await page.waitForLoadState('networkidle');

    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/trading/i);

    const text = await page.locator('body').textContent();
    expect(text || '').toContain('SOXL');
    expect(text || '').toContain('SOXS');
    expect(consoleErrors).toHaveLength(0);
  });

  test('/api/trading returns contract-compliant JSON', async ({ request, baseURL }) => {
    const response = await request.get(`${baseURL}/api/trading?hours=72`);
    expect(response.ok()).toBeTruthy();

    const json = await response.json();
    expect(Array.isArray(json.events)).toBeTruthy();
    expect(typeof json.count).toBe('number');
    expect(json.filters).toBeTruthy();
    expect(json.status).toBe('ok');
  });

  test('/api/health returns healthy status', async ({ request, baseURL }) => {
    const response = await request.get(`${baseURL}/api/health`);
    expect(response.ok()).toBeTruthy();

    const json = await response.json();
    expect(json.status).toBe('healthy');
    expect(json.timestamp).toBeTruthy();
  });
});
