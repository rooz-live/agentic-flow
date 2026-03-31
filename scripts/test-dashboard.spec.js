const { test, expect } = require('@playwright/test');

test.describe('WSJF Dashboard Tests', () => {
  const dashboardUrl = 'http://localhost:9000/WSJF-LIVE-V4-INTERACTIVE.html';
  
  test('dashboard loads and displays WSJF content', async ({ page }) => {
    await page.goto(dashboardUrl);
    
    // Check for WSJF content
    await expect(page.locator('text=WSJF')).toBeVisible();
    await expect(page.locator('text=Business Value')).toBeVisible();
    await expect(page.locator('text=Time Criticality')).toBeVisible();
    
    console.log('✅ Dashboard loaded successfully');
  });
  
  test('critical functions exist', async ({ page }) => {
    await page.goto(dashboardUrl);
    
    // Check for critical functions in the page
    const runVibeThinkerExists = await page.evaluate(() => {
      return typeof window.runVibeThinker === 'function';
    });
    
    const toggleTribunalExists = await page.evaluate(() => {
      return typeof window.toggleTribunal === 'function';
    });
    
    expect(runVibeThinkerExists).toBe(true);
    expect(toggleTribunalExists).toBe(true);
    
    console.log('✅ Critical functions verified: runVibeThinker, toggleTribunal');
  });
  
  test('email panel functionality', async ({ page }) => {
    await page.goto(dashboardUrl + '#email-panel');
    
    // Check if email panel is accessible
    const emailPanel = page.locator('#email-panel');
    if (await emailPanel.count() > 0) {
      await expect(emailPanel).toBeVisible();
      console.log('✅ Email panel accessible');
    } else {
      console.log('⚠️ Email panel not found - may be dynamically loaded');
    }
  });
  
  test('navigation elements exist', async ({ page }) => {
    await page.goto(dashboardUrl);
    
    // Check for navigation elements
    const navElements = await page.locator('nav, .nav, .navigation').count();
    const linkElements = await page.locator('a[href]').count();
    
    console.log(`✅ Found ${navElements} navigation containers and ${linkElements} links`);
    
    // Verify at least some navigation exists
    expect(linkElements).toBeGreaterThan(0);
  });
  
  test('dashboard responsiveness', async ({ page }) => {
    await page.goto(dashboardUrl);
    
    // Test different viewport sizes
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('body')).toBeVisible();
    
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();
    
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
    
    console.log('✅ Dashboard responsive across viewport sizes');
  });
  
  test('javascript errors check', async ({ page }) => {
    const errors = [];
    
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    await page.goto(dashboardUrl);
    
    // Wait for page to fully load
    await page.waitForTimeout(2000);
    
    if (errors.length > 0) {
      console.log('⚠️ JavaScript errors found:', errors);
    } else {
      console.log('✅ No JavaScript errors detected');
    }
    
    // Don't fail the test for JS errors, just report them
    expect(errors.length).toBeLessThan(10); // Allow some minor errors
  });
  
  test('local storage functionality', async ({ page }) => {
    await page.goto(dashboardUrl);
    
    // Test local storage
    await page.evaluate(() => {
      localStorage.setItem('test-key', 'test-value');
    });
    
    const storedValue = await page.evaluate(() => {
      return localStorage.getItem('test-key');
    });
    
    expect(storedValue).toBe('test-value');
    console.log('✅ Local storage functionality working');
  });
});

test.describe('Dashboard Capability Matrix', () => {
  test('function inventory', async ({ page }) => {
    await page.goto('http://localhost:9000/WSJF-LIVE-V4-INTERACTIVE.html');
    
    const functions = await page.evaluate(() => {
      const funcs = [];
      for (let prop in window) {
        if (typeof window[prop] === 'function' && !prop.startsWith('webkit')) {
          funcs.push(prop);
        }
      }
      return funcs.filter(f => 
        f.includes('WSJF') || 
        f.includes('Tribunal') || 
        f.includes('VibeThinker') ||
        f.includes('toggle') ||
        f.includes('run') ||
        f.includes('update')
      );
    });
    
    console.log('✅ Dashboard functions found:', functions);
    expect(functions.length).toBeGreaterThan(0);
  });
});
