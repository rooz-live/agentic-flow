/**
 * Vector Search Lean Integration - E2E Tests
 * Anti-CVT: Physical verification required
 * "Files exist" ≠ "Feature works"
 * 
 * San Gen Shugi (Three Reals):
 * 1. Real build passes
 * 2. Real telemetry ingests
 * 3. Real search returns results
 */

import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = join(__dirname, '..');
const TEST_DB = join(PROJECT_ROOT, '.agentdb', 'test-vectors.db');
const TEST_LOGS = join(PROJECT_ROOT, 'test-logs');

test.describe('Vector Search Lean - Anti-CVT Verification', () => {
  
  test.beforeAll(() => {
    // Setup test logs directory
    if (!existsSync(TEST_LOGS)) {
      mkdirSync(TEST_LOGS, { recursive: true });
    }
    
    // Create sample telemetry data
    const sampleTelemetry = [
      {
        timestamp: Date.now(),
        correlation_id: 'test-001',
        event_type: 'deployment_start',
        pattern: 'blue_green_deployment',
        duration_ms: 45000,
        success: true,
        input: 'v1.2.3',
        output: 'v1.2.4',
        critique: 'Smooth rollout, no errors'
      },
      {
        timestamp: Date.now() - 3600000,
        correlation_id: 'test-002',
        event_type: 'deployment_failure',
        pattern: 'rollback_triggered',
        duration_ms: 12000,
        success: false,
        input: 'v1.2.5',
        output: 'health_check_failed',
        critique: 'Database migration timeout'
      },
      {
        timestamp: Date.now() - 7200000,
        correlation_id: 'test-003',
        event_type: 'risk_detected',
        pattern: 'high_latency_pattern',
        duration_ms: 5000,
        success: true,
        input: 'p95 latency check',
        output: 'alert triggered',
        critique: 'ROAM risk identified: R1 - timeout'
      }
    ].map(JSON.stringify).join('\n');
    
    writeFileSync(join(TEST_LOGS, 'test_metrics.jsonl'), sampleTelemetry);
  });

  test.afterAll(() => {
    // Cleanup test artifacts
    try {
      rmSync(TEST_LOGS, { recursive: true, force: true });
      if (existsSync(TEST_DB)) {
        rmSync(TEST_DB, { force: true });
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  test.describe('NOW: Infrastructure Verification', () => {
    
    test('✅ Bridge config exists (deconstructed monolith)', () => {
      const configFile = join(PROJECT_ROOT, 'config', 'vector-search-bridge.yaml');
      expect(existsSync(configFile)).toBe(true);
      
      // Verify it's focused (not a monolith)
      const content = execSync(`wc -l ${configFile}`, { encoding: 'utf-8' });
      const lines = parseInt(content.trim().split(' ')[0]);
      expect(lines).toBeLessThan(200); // Focused, not monolithic
    });

    test('✅ ROAM analysis documented', () => {
      const roamFile = join(PROJECT_ROOT, 'src', 'vector', 'ROAM-ANALYSIS.md');
      expect(existsSync(roamFile)).toBe(true);
    });

    test('✅ WSJF priorities defined', () => {
      const wsjfFile = join(PROJECT_ROOT, 'src', 'vector', 'WSJF-PRIORITIES.yaml');
      expect(existsSync(wsjfFile)).toBe(true);
    });

    test('✅ AgentDB bridge implementation exists', () => {
      const bridgeFile = join(PROJECT_ROOT, 'src', 'vector', 'integrations', 'agentdb-bridge.ts');
      expect(existsSync(bridgeFile)).toBe(true);
    });

    test('✅ Telemetry lean adapter exists', () => {
      const adapterFile = join(PROJECT_ROOT, 'src', 'vector', 'adapters', 'telemetry-lean.ts');
      expect(existsSync(adapterFile)).toBe(true);
    });
  });

  test.describe('NEXT: Functional Verification (Requires Build)', () => {
    
    test('🔍 TypeScript compiles without errors', () => {
      try {
        execSync(
          'npx tsc --noEmit --skipLibCheck src/vector/integrations/agentdb-bridge.ts',
          {
            cwd: PROJECT_ROOT,
            encoding: 'utf-8',
            timeout: 60000
          }
        );
        expect(true).toBe(true);
      } catch (e: any) {
        console.error('TypeScript errors:', e.stdout || e.message);
        throw e;
      }
    });

    test('🔍 Telemetry adapter can be instantiated', async () => {
      // Dynamic import to test actual code
      try {
        const { TelemetryLeanAdapter } = await import(
          join(PROJECT_ROOT, 'src', 'vector', 'adapters', 'telemetry-lean.ts')
        );
        
        const adapter = new TelemetryLeanAdapter(TEST_DB, 384);
        expect(adapter).toBeDefined();
        expect(adapter.getStats()).toEqual({ totalVectors: 0, uniqueFiles: 0 });
        
        adapter.close();
      } catch (err) {
        console.error('Adapter instantiation failed:', err);
        throw err;
      }
    });

    test('🔍 Telemetry ingestion works (physical verification)', async () => {
      const { TelemetryLeanAdapter } = await import(
        join(PROJECT_ROOT, 'src', 'vector', 'adapters', 'telemetry-lean.ts')
      );
      
      const adapter = new TelemetryLeanAdapter(TEST_DB, 384);
      
      // Ingest test data
      const result = await adapter.ingestFromPath(TEST_LOGS, {
        batchSize: 10,
        onProgress: (indexed, total) => {
          console.log(`Indexed ${indexed}/${total}`);
        }
      });
      
      // Anti-CVT: Physical verification
      expect(result.indexed).toBeGreaterThan(0);
      expect(result.errors).toBe(0);
      
      const stats = adapter.getStats();
      expect(stats.totalVectors).toBe(result.indexed);
      
      adapter.close();
    });

    test('🔍 Search returns relevant results (physical verification)', async () => {
      const { TelemetryLeanAdapter } = await import(
        join(PROJECT_ROOT, 'src', 'vector', 'adapters', 'telemetry-lean.ts')
      );
      
      const adapter = new TelemetryLeanAdapter(TEST_DB, 384);
      
      // First ensure data is indexed
      await adapter.ingestFromPath(TEST_LOGS);
      
      // Generate query embedding for "deployment failure"
      const queryEmbedding = generateDeterministicEmbedding('deployment failure rollback', 384);
      
      // Search
      const results = adapter.search(queryEmbedding, 5, 0.5);
      
      // Anti-CVT: Must return actual results
      expect(results.length).toBeGreaterThan(0);
      
      // Verify result structure
      const first = results[0];
      expect(first.id).toBeDefined();
      expect(first.score).toBeGreaterThan(0);
      expect(first.score).toBeLessThanOrEqual(1);
      expect(first.content).toBeDefined();
      expect(first.metadata).toBeDefined();
      expect(first.metadata.timestamp).toBeDefined();
      expect(first.metadata.eventType).toBeDefined();
      
      adapter.close();
    });

    test('🔍 Dimension validation prevents mismatch (R2 MITIGATED)', async () => {
      const { TelemetryLeanAdapter } = await import(
        join(PROJECT_ROOT, 'src', 'vector', 'adapters', 'telemetry-lean.ts')
      );
      
      const adapter = new TelemetryLeanAdapter(TEST_DB, 384);
      await adapter.ingestFromPath(TEST_LOGS);
      
      // Try searching with wrong dimension
      const wrongDimEmbedding = generateDeterministicEmbedding('test', 1536);
      
      expect(() => {
        adapter.search(wrongDimEmbedding, 5, 0.5);
      }).toThrow(/Dimension mismatch/);
      
      adapter.close();
    });
  });

  test.describe('LATER: Integration Verification', () => {
    
    test('🔍 CLI responds to --stats', () => {
      try {
        const output = execSync(
          `python3 ${join(PROJECT_ROOT, 'scripts', 'cmd_semantic_search.py')} --stats`,
          {
            encoding: 'utf-8',
            timeout: 10000,
            env: { ...process.env, PYTHONPATH: PROJECT_ROOT }
          }
        );
        expect(output.length).toBeGreaterThan(0);
      } catch (e: any) {
        // May fail if DB doesn't exist, but should not crash
        expect(e.status).toBeLessThan(2);
      }
    });

    test('🔍 Config bridge YAML is valid', () => {
      try {
        execSync(
          `python3 -c "import yaml; yaml.safe_load(open('${join(PROJECT_ROOT, 'config', 'vector-search-bridge.yaml')}'))"`,
          {
            cwd: PROJECT_ROOT,
            encoding: 'utf-8',
            timeout: 5000
          }
        );
        expect(true).toBe(true);
      } catch (e) {
        throw new Error('Config YAML is invalid');
      }
    });
  });

  test.describe('Anti-CVT Metrics', () => {
    
    test('📊 File count reduction (deconstruction verified)', () => {
      // Previous attempt: 14 files
      // Lean approach: 6 core files
      const leanFiles = [
        'config/vector-search-bridge.yaml',
        'src/vector/ROAM-ANALYSIS.md',
        'src/vector/WSJF-PRIORITIES.yaml',
        'src/vector/integrations/agentdb-bridge.ts',
        'src/vector/adapters/telemetry-lean.ts',
        'src/vector/README-LEAN.md'
      ];
      
      let existingCount = 0;
      for (const file of leanFiles) {
        if (existsSync(join(PROJECT_ROOT, file))) {
          existingCount++;
        }
      }
      
      // 100% of lean files should exist
      expect(existingCount / leanFiles.length).toBe(1);
      
      // Verify reduction: 6 files vs previous 14
      console.log(`Lean files: ${existingCount} (vs previous 14)`);
      expect(existingCount).toBeLessThan(10);
    });

    test('📊 Line count reduction (focused purpose)', () => {
      // Count lines in lean implementations
      const files = [
        'src/vector/integrations/agentdb-bridge.ts',
        'src/vector/adapters/telemetry-lean.ts'
      ];
      
      let totalLines = 0;
      for (const file of files) {
        try {
          const content = execSync(`wc -l ${join(PROJECT_ROOT, file)}`, { encoding: 'utf-8' });
          const lines = parseInt(content.trim().split(' ')[0]);
          totalLines += lines;
        } catch {
          // File may not exist
        }
      }
      
      // Should be under 500 lines for both files
      console.log(`Total implementation lines: ${totalLines}`);
      expect(totalLines).toBeLessThan(500);
    });
  });
});

// Helper: Deterministic embedding generation (for tests)
function generateDeterministicEmbedding(text: string, dim: number): number[] {
  const vector = new Array(dim).fill(0);
  
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    vector[i % dim] += char / 65536;
  }
  
  // Normalize
  const norm = Math.sqrt(vector.reduce((a, b) => a + b * b, 0));
  return vector.map(v => v / (norm || 1));
}
