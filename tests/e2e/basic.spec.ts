import { test, expect } from '@playwright/test';

/**
 * Basic Playwright Test
 * 
 * Verifies Playwright setup is working correctly
 * Tests actual browser functionality without mocking
 */
test.describe('Basic Browser Functionality', () => {
  test('should load a page', async ({ page }) => {
    // Test basic page navigation
    await page.goto('about:blank');
    
    // Verify we can interact with the page
    await page.setContent('<h1>Hello Playwright</h1>');
    
    // Check content
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText('Hello Playwright');
    
    // Take screenshot for verification
    await page.screenshot({ 
      path: '.goalie/test-screenshots/basic-test.png' 
    });
  });

  test('should handle network conditions', async ({ page }) => {
    // Test network interception
    let requestCount = 0;
    
    await page.route('**/*', route => {
      requestCount++;
      route.continue();
    });
    
    await page.goto('data:text/html,<html><body>Test</body></html>');
    
    // Verify network interception worked
    expect(requestCount).toBeGreaterThan(0);
    console.log(`Network requests intercepted: ${requestCount}`);
  });

  test('should execute JavaScript', async ({ page }) => {
    await page.goto('about:blank');
    
    // Test JavaScript execution
    const result = await page.evaluate(() => {
      return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        timestamp: Date.now()
      };
    });
    
    console.log('Browser info:', result);
    expect(result.userAgent).toBeTruthy();
    expect(result.timestamp).toBeGreaterThan(0);
  });
});
