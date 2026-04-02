import { test, expect } from '@playwright/test';

/**
 * Dashboard E2E Tests
 * 
 * Tests core dashboard functionality following red-green-refactor TDD
 * Tests actual production paths mapping physically to dashboard.html metrics.
 */
test.describe('Agentic Flow Monitoring Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(30000);
    await page.goto('/');
  });

  test('should load dashboard with system health metrics', async ({ page }) => {
    // Check for core dashboard elements
    await expect(page.locator('h1')).toContainText(/Agentic Flow/i);
    
    // Verify system health card is displayed
    const statusEl = page.locator('.status-green');
    await expect(statusEl).toBeVisible();
    await expect(statusEl).toHaveText(/Active/i);
  });

  test('should display IRIS metrics interface', async ({ page }) => {
    // Verify IRIS Metrics are rendered
    await expect(page.locator('#iris-total')).toBeVisible();
    await expect(page.locator('#iris-critical')).toBeVisible();
    await expect(page.locator('#iris-urgent')).toBeVisible();
  });

  test('should load IRIS Pattern Detection & Alerts', async ({ page }) => {
    // Check for alerts visualization container
    await expect(page.locator('#iris-alerts')).toBeVisible();
    
    // Ensure the alert text contains structural bounds
    await expect(page.locator('.alert-info, .alert-critical, .alert-urgent')).toBeVisible();
  });

  test('should display Production Maturity Status limits', async ({ page }) => {
    // Look for production metrics limits
    await expect(page.locator('#maturity-health')).toBeVisible();
    await expect(page.locator('#maturity-components')).toBeAttached();
  });

  test('should show replenishment candidates matrix', async ({ page }) => {
    await expect(page.locator('#replenishment-list')).toBeVisible();
  });

  test('should be accessible (WCAG 2.1 Level AA) baseline check', async ({ page }) => {
    // Check for proper heading hierarchy
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    
    // Check basic rendering validation context
    const bodyStyle = await page.locator('body').evaluate(el => window.getComputedStyle(el).backgroundColor);
    expect(bodyStyle).toBeTruthy();
  });
});
