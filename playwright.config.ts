import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Testing Configuration
 * - Tests UI/UX interactions for agentic-flow dashboard
 * - Validates hierarchical-mesh coordination visualizations
 * - Ensures accessibility and performance standards
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-results.xml' }]
  ],
  
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3030',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
    
    // Accessibility testing
    contextOptions: {
      reducedMotion: 'reduce'
    }
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },

    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    // Trading dashboard — Vite dev server (local, PORT 5173)
    // TRADING_URL defaults to /trading.html (how Vite serves the entry file)
    {
      name: 'trading-chromium',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:5173',
      },
      testMatch: /trading-dashboard\.spec\.ts/,
    },

    // Trading on TLD — deployed via Flask on analytics.interface.tag.ooo
    // Run with: TRADING_URL=/trading/ npx playwright test --project=trading-tld
    {
      name: 'trading-tld',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.TRADING_BASE_URL || 'https://analytics.interface.tag.ooo',
      },
      testMatch: /trading-dashboard\.spec\.ts/,
    },
  ],

  webServer: [
    {
      command: 'node scripts/monitoring/dashboard_server.js --port=3030',
      url: 'http://localhost:3030',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      // Run Vite dev server for trading dashboard — serves trading.html at /trading.html
      command: 'npx vite trading.html --port 5173',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60 * 1000,
    },
  ],
});
