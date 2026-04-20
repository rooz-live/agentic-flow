import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3040,
    proxy: {
      '/api': {
        target: 'http://localhost:3041',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: '../../dist/systemic-os',
    emptyOutDir: true
  }
});
