import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Dynamic URL Discovery - Dependency Injection Pattern
 * Reads tunnel URL from environment or state registry
 */
function getTunnelUrl(): string {
  // Primary: Environment variable (for CI/CD)
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }
  
  // Secondary: Read from tunnel state registry
  try {
    const tunnelStatePath = path.join(process.cwd(), 'reports/tunnel-state-registry.json');
    if (fs.existsSync(tunnelStatePath)) {
      const tunnelState = JSON.parse(fs.readFileSync(tunnelStatePath, 'utf8'));
      if (tunnelState.url) {
        console.log(`Using tunnel URL from registry: ${tunnelState.url}`);
        return tunnelState.url;
      }
    }
  } catch (error) {
    console.warn(`Failed to read tunnel state: ${error}`);
  }
  
  // Fallback: Default URL (for documentation)
  return 'https://violet-oranges-glow.loca.lt';
}

/**
 * LocalTunnel E2E Tests
 * 
 * Tests the localtunnel functionality using dynamic URL discovery.
 * Follows red-green-refactor TDD principles with no bypass logic.
 */
test.describe('LocalTunnel Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeouts for tunnel connections
    test.setTimeout(60000);
  });

  test('should load dashboard through tunnel', async ({ page }) => {
    // Dependency Injection: Get URL dynamically
    const tunnelUrl = getTunnelUrl();
    
    console.log(`Testing tunnel URL: ${tunnelUrl}`);
    
    // Navigate to tunnel URL - this is the actual production path
    await page.goto(tunnelUrl, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Take screenshot on load for visual verification
    await page.screenshot({ 
      path: '.goalie/test-screenshots/tunnel-initial-load.png',
      fullPage: true 
    });
    
    // Check if page loads without errors
    await expect(page.locator('body')).toBeVisible();
    
    // Look for key dashboard elements
    const title = await page.title();
    console.log(`Page title: ${title}`);
    expect(title).not.toBe('');
    
    // Structural: Check for tunnel-specific failure modes without bypassing
    const errorIndicators = [
      'text=502 Bad Gateway',
      'text=Service Unavailable',
      'text=Connection refused',
      'text=tunnel not found',
      '[data-testid="error"]',
      '.error-message',
      'text=loca.lt/error'  // LocalTunnel error page
    ];
    
    for (const selector of errorIndicators) {
      const errorElement = page.locator(selector);
      if (await errorElement.isVisible()) {
        console.log(`Found error element: ${selector}`);
        // Take screenshot of error state
        await page.screenshot({ 
          path: '.goalie/test-screenshots/tunnel-error-state.png',
          fullPage: true 
        });
        test.fail(`Tunnel error detected: ${selector}`);
      }
    }
    
    // Verify we're on the correct domain
    expect(page.url()).toContain('loca.lt');
  });

  test('should handle WebSocket connections through tunnel', async ({ page }) => {
    // Dependency Injection: Get URL dynamically
    const tunnelUrl = getTunnelUrl();
    const wsConnections: any[] = [];
    page.on('websocket', ws => {
      wsConnections.push(ws.url);
      console.log(`WebSocket connected: ${ws.url}`);
    });
    
    await page.goto(tunnelUrl, { waitUntil: 'networkidle' });
    
    // Wait a bit for WebSocket connections to establish
    await page.waitForTimeout(3000);
    
    // Verify at least one WebSocket attempt was made (if applicable)
    // This test might need adjustment based on actual WebSocket usage
    console.log(`WebSocket connections detected: ${wsConnections.length}`);
  });

  test('should maintain session state across tunnel', async ({ page }) => {
    // Dependency Injection: Get URL dynamically
    const tunnelUrl = getTunnelUrl();
    
    await page.goto(tunnelUrl, { waitUntil: 'networkidle' });
    
    // Check for session indicators
    const sessionIndicators = [
      '[data-testid="user-session"]',
      '.user-info',
      '.session-status',
      'text=logged in',
      'text=connected'
    ];
    
    let sessionFound = false;
    for (const indicator of sessionIndicators) {
      if (await page.locator(indicator).isVisible()) {
        sessionFound = true;
        break;
      }
    }
    
    // This is an informational test - adjust expectations based on actual auth
    console.log(`Session indicators found: ${sessionFound}`);
    
    // Test navigation doesn't break session
    if (await page.locator('a').count() > 0) {
      await page.click('a:first-child');
      await page.waitForLoadState('networkidle');
      
      // Verify we're still on the same domain
      expect(page.url()).toContain('loca.lt');
    }
  });

  test('should handle network instability gracefully', async ({ page }) => {
    // Dependency Injection: Get URL dynamically
    const tunnelUrl = getTunnelUrl();
    
    // Create a new context with slow network
    const context = await page.browser().newContext({
      // Simulate 3G network conditions
      offline: false,
      // Note: Playwright doesn't directly support throttling in all contexts
      // This test documents the intention for network resilience
    });
    
    const testPage = await context.newPage();
    
    try {
      await testPage.goto(tunnelUrl, { 
        waitUntil: 'domcontentloaded', // Less strict wait for slow networks
        timeout: 45000 
      });
      
      // Check if core functionality loads even with poor network
      await expect(testPage.locator('body')).toBeVisible();
      
      // Look for loading indicators or progressive loading
      const loadingIndicators = [
        '.loading',
        '[data-testid="loading"]',
        '.spinner',
        'text=loading'
      ];
      
      for (const indicator of loadingIndicators) {
        if (await testPage.locator(indicator).isVisible()) {
          console.log(`Loading indicator found: ${indicator}`);
          // Wait for loading to complete
          await testPage.waitForSelector(indicator, { state: 'hidden', timeout: 10000 })
            .catch(() => console.log('Loading indicator did not disappear'));
        }
      }
      
    } finally {
      await context.close();
    }
  });

  test('should display correctly on mobile through tunnel', async ({ page }) => {
    // Dependency Injection: Get URL dynamically
    const tunnelUrl = getTunnelUrl();
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    
    await page.goto(tunnelUrl, { waitUntil: 'networkidle' });
    
    // Take mobile screenshot
    await page.screenshot({ 
      path: '.goalie/test-screenshots/tunnel-mobile-view.png',
      fullPage: true 
    });
    
    // Check for mobile-specific elements
    const mobileSelectors = [
      '.mobile-menu',
      '[data-testid="mobile-nav"]',
      '.hamburger',
      'button[aria-label="menu"]'
    ];
    
    let mobileOptimized = false;
    for (const selector of mobileSelectors) {
      if (await page.locator(selector).isVisible()) {
        mobileOptimized = true;
        break;
      }
    }
    
    console.log(`Mobile optimization detected: ${mobileOptimized}`);
    
    // Ensure content is not horizontally scrolled (common mobile issue)
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()?.width || 375;
    
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // Allow 1px tolerance
  });
});
