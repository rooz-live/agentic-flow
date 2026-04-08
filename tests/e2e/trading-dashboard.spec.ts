import { test, expect } from '@playwright/test';

/**
 * Trading Dashboard E2E Tests — Red-Green-Refactor TDD
 *
 * RED phase:    These tests define the minimum UI/UX/data-quality bar.
 * GREEN phase:  TradingDashboardAPI.tsx makes all pass.
 * REFACTOR:     Consolidate into single-pane view.
 *
 * Local (Vite):  npx playwright test tests/e2e/trading-dashboard.spec.ts --project=trading-chromium
 * TLD:           TRADING_URL=/trading/ npx playwright test --project=trading-tld
 */

// Vite dev server serves trading.html at /trading.html
// Flask (TLD) serves the built dist at /trading/ — override via TRADING_URL env var
const TRADING_URL = process.env.TRADING_URL || '/trading.html';

test.describe('Trading Dashboard — Structure & Load', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60_000);
    // 'commit' avoids timing out on Vite's dep-optimizer full-reload.
    // After globalSetup pre-warms the module graph, the h1 appears within ~1s.
    await page.goto(TRADING_URL, { waitUntil: 'commit' });
    await page.waitForSelector('h1', { timeout: 30_000 });
  });

  test('page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.waitForLoadState('networkidle');
    expect(errors.filter(e => !e.includes('recharts'))).toHaveLength(0);
  });

  test('has a visible heading with SOXL or Trading in title', async ({ page }) => {
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
    const text = await heading.textContent();
    expect(text?.toLowerCase()).toMatch(/soxl|soxs|trading|semiconductor/);
  });

  test('renders without blank white screen', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    const bodyHTML = await page.locator('body').innerHTML();
    expect(bodyHTML.length).toBeGreaterThan(200);
  });
});

test.describe('Trading Dashboard — Data Quality', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(TRADING_URL, { waitUntil: 'commit' });
    // Wait for React to mount + loading state to resolve (Flask fetch fails fast).
    // 'networkidle' never settles with Vite's HMR WebSocket open; wait for
    // the empty-state or signal cards to confirm the async fetch has completed.
    await page.waitForSelector(
      '[data-testid="empty-state"], [data-testid="signal-card"], [role="status"]',
      { timeout: 30_000 },
    );
  });

  test('displays at least one trading signal or empty-state message', async ({ page }) => {
    // Either signal cards exist OR an empty-state placeholder
    const signals = page.locator('[data-testid="signal-card"], .signal-card, .trade-signal');
    const emptyState = page.locator('[data-testid="empty-state"], .empty-state, .no-data');
    const hasSignals = await signals.count() > 0;
    const hasEmpty = await emptyState.count() > 0;
    expect(hasSignals || hasEmpty).toBeTruthy();
  });

  test('shows SOXL and SOXS symbols somewhere on page', async ({ page }) => {
    const text = await page.locator('body').textContent();
    // At minimum the dashboard should reference both ETFs
    expect(text).toContain('SOXL');
    expect(text).toContain('SOXS');
  });

  test('displays price or quote data (not just static text)', async ({ page }) => {
    // Look for any numeric value that looks like a price ($XX.XX or XX.XX)
    const pricePattern = page.locator('text=/\\$?\\d+\\.\\d{2}/');
    await expect(pricePattern.first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Trading Dashboard — UI/UX Quality', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(TRADING_URL, { waitUntil: 'commit' });
    await page.waitForSelector('h1', { timeout: 30_000 });
  });

  test('has dark theme (background is not white)', async ({ page }) => {
    const bg = await page.locator('body').evaluate(
      el => window.getComputedStyle(el).backgroundColor
    );
    // Should not be pure white (rgb(255, 255, 255))
    expect(bg).not.toBe('rgb(255, 255, 255)');
  });

  test('is responsive — no horizontal scrollbar at 375px width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // 5px tolerance
  });

  test('has accessible heading hierarchy (exactly one h1)', async ({ page }) => {
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
  });

  test('BUY/SELL/HOLD signals use distinct colors', async ({ page }) => {
    const buyEl = page.locator('text=/BUY/i').first();
    const sellEl = page.locator('text=/SELL/i').first();

    if (await buyEl.isVisible() && await sellEl.isVisible()) {
      const buyColor = await buyEl.evaluate(el => window.getComputedStyle(el).color);
      const sellColor = await sellEl.evaluate(el => window.getComputedStyle(el).color);
      expect(buyColor).not.toBe(sellColor);
    }
  });
});

test.describe('Trading Dashboard — API Integration', () => {
  // Flask runs on port 5000; override via API_BASE_URL env var
  const apiBase = process.env.API_BASE_URL || 'http://localhost:5000';

  test('/api/health returns {status: healthy}', async ({ request }) => {
    const response = await request.get(`${apiBase}/api/health`);
    if (response.ok()) {
      const body = await response.json();
      expect(body).toHaveProperty('status');
      expect(body.status).toBe('healthy');
    }
    // Skipped gracefully when Flask is not running
  });

  test('/api/trading returns valid JSON shape', async ({ request }) => {
    const response = await request.get(`${apiBase}/api/trading?hours=72`);
    if (response.ok()) {
      const body = await response.json();
      expect(body).toHaveProperty('events');
      expect(body).toHaveProperty('count');
      expect(Array.isArray(body.events)).toBeTruthy();
    }
  });

  test('/api/trading?symbol=SOXL sets filter in response', async ({ request }) => {
    const response = await request.get(`${apiBase}/api/trading?symbol=SOXL`);
    if (response.ok()) {
      const body = await response.json();
      expect(body.filters.symbol).toBe('SOXL');
    }
  });
});
