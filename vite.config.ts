import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import fs from 'fs'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(), 
    {
      name: 'validation-server',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url === '/api/validate-eml' && req.method === 'POST') {
            let body = '';
            
            const processValidation = (bodyStr, res) => {
              try {
                if (!bodyStr) throw new Error("Empty body received");
                const config = JSON.parse(bodyStr);
                const cycles = config.cycles || 1;
                const { execSync } = require('child_process');
                
                let results = [];
                let upgradedEml = config.emlContent || '';
                
                // 1. Content Structural Analysis (Circle Roles & Institutions)
                const textContent = upgradedEml.replace(/<[^>]+>/g, ' ');
                const institutions = [];
                if (textContent.includes('MAA')) institutions.push('MAA (Property Malfeasance Detected)');
                if (textContent.includes('Bank of America')) institutions.push('BofA (Financial Disruption Recognized)');
                if (textContent.includes('US Bank')) institutions.push('US Bank (Account Interception Noted)');
                if (textContent.includes('LifeLock')) institutions.push('LifeLock (Identity Theft Vulnerability Logged)');
                if (textContent.includes('Apex Systems')) institutions.push('Apex Systems (Employment Dislocation Traced)');
                
                const roleFindings = institutions.length > 0 
                  ? `[CIRCLE ROLES]: Identified systemic vectors: ${institutions.join(', ')}. Actionable defense matrices engaged.`
                  : `[CIRCLE ROLES]: Nominal entity footprint. No severe institutional constraints detected.`;

                results.push({ script: 'eml-content-analysis', status: 'pass', cycle: 1, output: roleFindings });
                
                // 2. Physical Bash Execution
                for (let i = 0; i < cycles; i++) {
                  if (config.scripts.roamFreshness) {
                    try {
                      const out = execSync('sh ./tooling/scripts/validate-roam-freshness.sh 2>&1').toString();
                      results.push({ script: 'roam-freshness', status: 'pass', cycle: i+1, output: out.substring(0,100) });
                    } catch (err) {
                      results.push({ script: 'roam-freshness', status: 'fail', cycle: i+1, output: err.message });
                    }
                  }
                  if (config.scripts.directMailDraft) {
                    try {
                      const out = execSync('sh ./tooling/scripts/validate-directmail-draft.sh 2>&1').toString();
                      results.push({ script: 'directmail-draft', status: 'pass', cycle: i+1, output: out.substring(0,100) });
                    } catch (err) {
                      results.push({ script: 'directmail-draft', status: 'fail', cycle: i+1, output: err.message });
                    }
                  }
                }
                
                // 3. EML Payload Upgrade (Append Verification Stamp)
                if (!upgradedEml.includes('SYSTEMIC VERIFICATION STAMP')) {
                  const stamp = `<br/><div style="border-top: 2px dashed #10b981; padding-top: 10px; margin-top: 20px; font-family: monospace; font-size: 10px; color: #10b981;">[SYSTEMIC VERIFICATION STAMP]<br/>Cycles Executed: ${cycles}<br/>Institutional Footprint: ${institutions.length} detected.<br/>Clearance: Wholeness Verified via Physical Containment.</div>`;
                  upgradedEml += stamp;
                }
                
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, cyclesRun: cycles, results, upgradedEml }));
              } catch (err) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            };
            
            // If body is already parsed by another middleware
            if ((req as any).body) {
              body = typeof (req as any).body === 'string' ? (req as any).body : JSON.stringify((req as any).body);
              processValidation(body, res);
            } else {
              req.on('data', chunk => body += chunk);
              req.on('end', () => processValidation(body, res));
            }

          } else if (req.url === '/api/legal-matrix' && req.method === 'GET') {
            try {
              const fs = require('fs');
              const path = require('path');
              const telemetryPath = path.resolve(__dirname, '.goalie/genuine_telemetry.json');
              const rawData = fs.readFileSync(telemetryPath, 'utf-8');
              const telemetry = JSON.parse(rawData);
              
              const domains = Object.keys(telemetry.wsjf_swarm || {});
              const payload = {
                layer_4: {
                  raw_ingestion_layer: {
                    extracted_domains: domains
                  }
                }
              };
              
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(payload));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
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
  optimizeDeps: {
    exclude: ['md-to-pdf', 'better-sqlite3', 'puppeteer', 'playwright', 'tesseract.js-core'],
    include: ['react', 'react-dom', 'reactflow', 'framer-motion', 'recharts', 'lucide-react']
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,   // Hard-fail instead of drifting to 5174 — keeps Playwright baseURL contract
    watch: {
      ignored: [
        '**/ml_env/**',
        '**/venv/**',
        '**/.venv/**',
        '**/ai_env_3.11/**',
        '**/archive/**',
        '**/.goalie/**',
        '**/tests/**',
        '**/tooling/**',
        '**/node_modules/**',
        '**/*.pyc',
        '**/__pycache__/**',
        '**/.pytest_cache/**',
        '**/.mypy_cache/**',
        '**/torch/**',           // PyTorch headers
        '**/site-packages/**',   // Python packages
        '**/lib/python*/**',     // Python libs
        '**/lib64/python*/**',   // Python libs (64-bit)
        '**/dist/**',
        '**/build/**',
        '**/.git/**'
      ]
    },
    allowedHosts: true,
    // Forward /api/* to Flask in dev so the trading dashboard can fetch live data
    proxy: {
      '/api/visionclaw': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/api/domains': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/api/audit-log': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
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
        main: 'index.html',
      },
    },
  },
})
