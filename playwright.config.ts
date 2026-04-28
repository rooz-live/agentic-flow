import { defineConfig, devices } from '@playwright/test';
const runTldOnly = process.env.PLAYWRIGHT_TLD_ONLY === '1';

/**
 * Playwright E2E Testing Configuration
 * - Tests UI/UX interactions for agentic-flow dashboard
 * - Validates hierarchical-mesh coordination visualizations
 * - Ensures accessibility and performance standards
 */
export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: 'unit/**',
  globalSetup: './tests/e2e/global-setup.ts',
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
        baseURL: 'http://127.0.0.1:5173',
        // Vite compiles TSX on-demand; first load can take 10-15s on cold start.
        // globalSetup pre-warms the cache, but keep a generous timeout as safety net.
        navigationTimeout: 60_000,
        actionTimeout: 15_000,
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
    {
      name: 'analytics-tld-contract',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.CONTRACT_BASE_URL || 'https://analytics.interface.tag.ooo',
      },
      testMatch: /analytics-tld\.contract\.spec\.ts/,
    },
    {
      name: 'security-passbolt',
      testMatch: /passbolt-export-workflow\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: runTldOnly ? undefined : [
    {
      command: 'node scripts/monitoring/dashboard_server.js --port=3030',
      url: 'http://localhost:3030',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    /*
    {
      // Run Vite dev server for trading dashboard — serves trading.html at /trading.html
      command: 'lsof -ti:5173 | xargs kill -9 2>/dev/null; npx vite --config vite.trading.config.ts',
      url: 'http://127.0.0.1:5173/trading.html',
      reuseExistingServer: !process.env.CI,
      timeout: 60 * 1000,
    },
    */
  ],
});
