import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// Vite config for trading dashboard - separated from main config to avoid
// cosmograph/cosmos.gl dependency issues that cause optimizer hangs
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'validation-server',
      configureServer(server) {
        
        // REFACTOR: Push physical Sovereign Infrastructure state to the React MAPEK UI
        setInterval(() => {
          try {
            const { execSync } = require('child_process');
            const fs = require('fs');
            
            // 1. Gravity Lock / OPEX Limit (10GB)
            let gravity_breach = false;
            try {
              const out = execSync("df -k /System/Volumes/Data | tail -1 | awk '{print $4}'").toString();
              if (parseInt(out, 10) < 10485760) gravity_breach = true;
            } catch (e) {}
            
            // 2. Sovereign Manifest Ingestion
            let sovereignty_manifest = null;
            try {
              if (fs.existsSync('/Volumes/cPanelBackups/sovereignty_mcp_manifest.json')) {
                sovereignty_manifest = JSON.parse(fs.readFileSync('/Volumes/cPanelBackups/sovereignty_mcp_manifest.json', 'utf-8'));
              }
            } catch (e) {}

            server.ws.send('telemetry:stream', {
              gravity_breach,
              sovereignty_manifest,
              scenario: gravity_breach ? 'critical' : 'baseline',
              metrics: { latency_ms: Math.random() * 50 + 50, throughput_rps: 142, circuit_breaker_trips: 0, error_rate: 0.01, cpu_percent: 45, memory_mb: 1200, active_agents: 6 },
              pewma: { latency: 85, anomalyScore: gravity_breach ? 0.9 : 0.1 }
            });
          } catch (e) {}
        }, 2000);

        server.middlewares.use(async (req, res, next) => {
          if (req.url === '/api/validate-eml' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
              try {
                const config = JSON.parse(body);
                const cycles = config.cycles || 1;
                const { execSync } = require('child_process');
                
                let results = [];
                for (let i = 0; i < cycles; i++) {
                  if (config.scripts.roamFreshness) {
                    try {
                      const out = execSync('sh ./tooling/scripts/validate-roam-freshness.sh 2>&1').toString();
                      results.push({ script: 'roam-freshness', status: 'pass', cycle: i+1, output: out.substring(0,100) });
                    } catch (err: any) {
                      results.push({ script: 'roam-freshness', status: 'fail', cycle: i+1, output: err.message });
                    }
                  }
                  if (config.scripts.directMailDraft) {
                    try {
                      const out = execSync('sh ./tooling/scripts/validate-directmail-draft.sh 2>&1').toString();
                      results.push({ script: 'directmail-draft', status: 'pass', cycle: i+1, output: out.substring(0,100) });
                    } catch (err: any) {
                      results.push({ script: 'directmail-draft', status: 'fail', cycle: i+1, output: err.message });
                    }
                  }
                }
                
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, cyclesRun: cycles, results }));
              } catch (err: any) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            });
          } else {
            next();
          }
        });
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Exclude heavy/unused deps that cause optimizer to hang
  optimizeDeps: {
    exclude: [
      'md-to-pdf', 
      'better-sqlite3', 
      'puppeteer', 
      'playwright', 
      'tesseract.js-core',
      '@cosmograph/core',
      '@cosmos.gl/core'
    ],
    include: ['react', 'react-dom', 'reactflow', 'framer-motion', 'recharts', 'lucide-react']
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        trading: path.resolve(__dirname, 'trading.html')
      }
    }
  }
})
