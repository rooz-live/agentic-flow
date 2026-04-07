import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /trading-dashboard\.spec\.ts/,
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5174',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // No webServer — assumes Vite is already running (npm run trader:dev)
});
