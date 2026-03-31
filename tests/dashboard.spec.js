#!/usr/bin/env node
/**
 * Playwright Headless Test Suite for WSJF Dashboard
 * Tests: VibeThinker functions, navigation, email panel
 * 
 * Usage: npx playwright test dashboard.spec.js
 */

const { test, expect } = require('@playwright/test');

const DASHBOARD_URL = process.env.DASHBOARD_URL || 
  'https://radio-das-perceived-auction.trycloudflare.com/WSJF-LIVE-V4-INTERACTIVE.html';

test.describe('WSJF Dashboard V4', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.waitForLoadState('networkidle');
  });

  test('dashboard loads with WSJF title', async ({ page }) => {
    await expect(page.locator('text=WSJF Live v4')).toBeVisible();
    await expect(page.locator('text=Interactive Production')).toBeVisible();
  });

  test('navigation menu has all links', async ({ page }) => {
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('text=WSJF Master')).toBeVisible();
    await expect(page.locator('text=📧 Emails')).toBeVisible();
    await expect(page.locator('text=⚖️ Attorney')).toBeVisible();
    await expect(page.locator('text=🔍 Validate')).toBeVisible();
  });

  test('runVibeThinker function exists and is callable', async ({ page }) => {
    const result = await page.evaluate(() => {
      return typeof window.runVibeThinker === 'function';
    });
    expect(result).toBe(true);
  });

  test('toggleTribunal function exists and is callable', async ({ page }) => {
    const result = await page.evaluate(() => {
      return typeof window.toggleTribunal === 'function';
    });
    expect(result).toBe(true);
  });

  test('showEmailPanel function exists', async ({ page }) => {
    const result = await page.evaluate(() => {
      return typeof window.showEmailPanel === 'function';
    });
    expect(result).toBe(true);
  });

  test('showAttorneyPanel function exists', async ({ page }) => {
    const result = await page.evaluate(() => {
      return typeof window.showAttorneyPanel === 'function';
    });
    expect(result).toBe(true);
  });

  test('showValidationPanel function exists', async ({ page }) => {
    const result = await page.evaluate(() => {
      return typeof window.showValidationPanel === 'function';
    });
    expect(result).toBe(true);
  });

  test('all navigation links use https protocol', async ({ page }) => {
    const links = await page.locator('nav a').evaluateAll(anchors => 
      anchors.map(a => a.href)
    );
    
    for (const href of links) {
      if (href.startsWith('http')) {
        expect(href).toMatch(/^https:/);
      }
    }
  });

  test('no file:// protocol links in navigation', async ({ page }) => {
    const links = await page.locator('nav a').evaluateAll(anchors => 
      anchors.map(a => a.href)
    );
    
    const fileLinks = links.filter(href => href.startsWith('file://'));
    expect(fileLinks).toHaveLength(0);
  });

});

// Headless test command:
// DASHBOARD_URL=https://radio-das-perceived-auction.trycloudflare.com/WSJF-LIVE-V4-INTERACTIVE.html npx playwright test dashboard.spec.js --reporter=line
