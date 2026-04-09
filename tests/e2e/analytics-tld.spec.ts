import { test, expect } from '@playwright/test';

const BASE_URL = 'https://analytics.interface.tag.ooo';

test.describe('Analytics TLD Endpoint Validation (Red/Green)', () => {
  
  test('Main Advocacy Dashboard resolves and renders data pipeline', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    
    // Expect the title or core structural components to be present
    // Assuming UI maps to TLD Dashboard or Trading Dashboard generic containers
    await expect(page.locator('body')).toBeVisible();
    
    // Check for network OK status implicitly, ensure we didn't hit an error page
    const title = await page.title();
    expect(title).not.toContain('502 Bad Gateway');
    expect(title).not.toContain('404 Not Found');
  });

  test('SOXL/SOXS Trading Dashboard resolves and renders charts', async ({ page }) => {
    await page.goto(`${BASE_URL}/trading`);
    
    // Wait for the React component (trading-dashboard) to mount
    const dashboard = page.locator('.trading-dashboard, .dashboard-header');
    await expect(dashboard.first()).toBeVisible({ timeout: 10000 });
    
    // Assert active tab or charting infrastructure exists
    const charts = page.locator('.recharts-responsive-container, .chart-container');
    await expect(charts.first()).toBeVisible({ timeout: 10000 });
  });

  test('Trading Signals API endpoint returns JSON event array', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/trading`);
    
    // Assert 200 OK
    expect(response.ok()).toBeTruthy();
    
    // Assert it returns a JSON payload
    const body = await response.json();
    
    // The web_dashboard.py backend expects an array of SOXL/SOXS events or a generic telemetry map
    expect(Array.isArray(body) || typeof body === 'object').toBeTruthy();
  });

  test('Health Check API endpoint returns healthy status', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    
    // Assert 200 OK
    expect(response.ok()).toBeTruthy();
    
    // Assert exact JSON match per the P6 escalation
    const body = await response.json();
    expect(body).toHaveProperty('status', 'healthy');
  });

});
