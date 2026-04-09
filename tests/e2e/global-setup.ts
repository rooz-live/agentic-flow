import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for Playwright tests
 *
 * Creates test artifact directories and pre-warms the Vite dev server
 * for the trading dashboard. Without the warmup, cold Vite compilation
 * (~10-15 seconds for React + Tailwind + TSX module graph) races against
 * the 30s navigationTimeout and causes intermittent failures.
 *
 * Playwright guarantees globalSetup runs AFTER all webServers have started,
 * so Vite is already listening when we do the warmup navigation.
 */
async function globalSetup(config: FullConfig) {
  console.log('[setup] Preparing Playwright test environment...');

  // ── 1. Create artifact directories ──────────────────────────────────
  const fs = require('fs');

  const dirs = [
    '.goalie/test-screenshots',
    '.goalie/playwright-report',
    'test-results',
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // ── 2. Warm up Vite for the trading dashboard ────────────────────────
  // The first browser load triggers TypeScript/TSX compilation for the
  // entire module graph. Pre-compiling here means subsequent test
  // navigations are served from Vite's in-memory cache (~50ms vs 10-15s).
  const VITE_BASE = 'http://localhost:5173';
  const TRADING_PAGE = `${VITE_BASE}/trading.html`;

  // Only warm up if Vite is running (skips when only running TLD/dashboard tests).
  let viteReachable = false;
  try {
    const probe = await fetch(TRADING_PAGE, { signal: AbortSignal.timeout(3000) });
    viteReachable = probe.ok;
  } catch {
    // Vite not in the webServer list for this run — skip warmup.
  }

  if (viteReachable) {
    console.log('[setup] Warming up Vite (pre-compiling TSX module graph)...');
    const browser = await chromium.launch();
    const page = await browser.newPage();
    try {
      // Use 'commit' (not 'load') so we are not blocked by Vite's dep-optimizer
      // full-page reload. Vite v5+ sends a forced reload to the browser when it
      // finishes pre-bundling heavy deps (@cosmograph, etc.). If we wait for
      // 'load', Playwright waits on the first navigation which gets cancelled by
      // that reload — the event never fires and we time out.
      //
      // Instead: navigate with 'commit', then wait for the <h1> selector which
      // survives the Vite reload and only resolves after React has mounted on
      // the final stable page.
      await page.goto(TRADING_PAGE, { waitUntil: 'commit', timeout: 30_000 });
      await page.waitForSelector('h1', { timeout: 90_000 });
      console.log('[setup] ✓ Vite warm-up complete — module graph compiled & cached');
    } catch (err) {
      console.warn(`[setup] ⚠ Vite warm-up timed out (non-fatal): ${err}`);
    } finally {
      await browser.close();
    }
  }

  console.log('[setup] ✓ Done');
}

export default globalSetup;
