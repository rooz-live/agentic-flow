import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for Playwright tests
 * 
 * Ensures test environment is ready before running tests
 * Follows structural refactoring principles - no mocking of core paths
 */
async function globalSetup(config: FullConfig) {
  console.log('🔧 Setting up Playwright test environment...');
  
  // Create necessary directories for test artifacts
  const fs = require('fs');
  const path = require('path');
  
  const dirs = [
    '.goalie/test-screenshots',
    '.goalie/playwright-report',
    'test-results'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
  
  // Check if local server is running (if not on CI)
  if (!process.env.CI) {
    const baseURL = config.webServer?.url || 'http://localhost:3000';
    console.log(`Checking if server is running at: ${baseURL}`);
    
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      await page.goto(baseURL, { timeout: 5000 });
      console.log('✓ Server is accessible');
    } catch (error) {
      console.log('⚠ Server not accessible, tests will start it automatically');
    } finally {
      await browser.close();
    }
  }
  
  // Log environment info
  console.log(`Test environment:`);
  console.log(`  - Node: ${process.version}`);
  console.log(`  - Playwright: ${require('@playwright/test/package.json').version}`);
  console.log(`  - Base URL: ${process.env.BASE_URL || 'http://localhost:3000'}`);
  console.log('✅ Playwright setup complete');
}

export default globalSetup;
