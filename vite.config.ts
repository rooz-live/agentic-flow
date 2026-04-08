import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['@cosmograph/cosmograph', '@cosmos.gl/graph', 'gl-bench']
  },
  server: {
    port: 5173,
    strictPort: false,
    allowedHosts: true,
    // Forward /api/* to Flask in dev so the trading dashboard can fetch live data
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
})
