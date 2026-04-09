/**
 * Vite config for the trading dashboard dev server (E2E tests + local dev).
 *
 * Differences from vite.config.ts:
 * - Clears optimizeDeps.include: the main config lists @cosmograph/cosmograph,
 *   @cosmos.gl/graph, and gl-bench, but those packages are NOT installed and
 *   are not used by the trading page. When Vite tries to pre-bundle missing
 *   packages it hangs indefinitely, blocking all module serving and causing
 *   every Playwright page.goto to time out.
 *
 * Used by:
 *   - playwright.config.ts webServer (trading-chromium project)
 *   - npm run trader:dev  (optional — falls back to vite.config.ts which also works
 *     when you don't navigate to a cosmograph route first)
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // No optimizeDeps.include — let Vite discover deps lazily from actual imports.
  // This avoids hangs caused by including packages that aren't installed.
  optimizeDeps: {},
  server: {
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        trading: 'trading.html',
      },
    },
  },
});
